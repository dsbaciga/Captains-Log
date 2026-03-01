# Email Import Feature - Implementation Plan

## Context

Users want to forward booking confirmation emails (flights, hotels, activities) to a shared Gmail inbox and have the app automatically parse them into trip entities. This eliminates manual data entry for travel bookings. The system uses an LLM (OpenAI-compatible API, supporting cloud and local models) to extract structured travel data from unstructured email content, presents parsed entities for user review, and creates real entities upon approval.

**Key design decisions:**
- Single shared Gmail inbox polled via Gmail API (OAuth2)
- Users forward specific emails to the inbox (explicit filtering)
- User identification by matching sender email against registered user emails (primary or alternative)
- LLM-based parsing via OpenAI-compatible API (OpenAI, Ollama, LM Studio, vLLM, etc.)
- Review-first flow: parsed entities are "pending" until user accepts
- Date-based auto-matching to trips, with manual override

---

## Data Flow

```
User forwards email --> Shared Gmail inbox
Cron (every 5 min) --> gmail.service polls inbox via Gmail API
  For each unread email:
    1. Check for duplicate (by Gmail message ID)
    2. Extract forwarding user's email from headers/body
    3. Match user by email (primary) or forwardingEmail (alternative)
    4. Send email text to LLM for entity extraction
    5. Match extracted entities to trips by date overlap
    6. Create EmailImport + PendingEntity records
    7. Mark Gmail message as read
User sees pending count badge in Navbar
User navigates to /email-imports, reviews entities
User accepts (creates real entity), rejects, or edits before accepting
```

---

## 1. Database Schema Changes

### New fields on User model

Add to `User` in [schema.prisma](../../backend/prisma/schema.prisma):

```prisma
  forwardingEmail    String?  @unique @map("forwarding_email") @db.VarChar(255)
  // ... existing relations plus:
  emailImports       EmailImport[]
  pendingEntities    PendingEntity[]
```

`forwardingEmail` allows users to specify an alternative email address (e.g., a work email they forward bookings from) that the system will also match against when identifying who forwarded an email.

### New fields on Trip model

Add to `Trip`:
```prisma
  pendingEntities    PendingEntity[]
```

### New enums and models

```prisma
enum EmailImportStatus {
  FETCHED
  PARSING
  PARSED
  PARSE_FAILED
  NO_ENTITIES
  NO_USER
}

enum PendingEntityType {
  TRANSPORTATION
  LODGING
  ACTIVITY
  LOCATION
}

enum PendingEntityStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model EmailImport {
  id               Int               @id @default(autoincrement())
  gmailMessageId   String            @unique @map("gmail_message_id") @db.VarChar(255)
  threadId         String?           @map("thread_id") @db.VarChar(255)
  subject          String?           @db.VarChar(1000)
  fromAddress      String?           @map("from_address") @db.VarChar(500)
  forwardedBy      String?           @map("forwarded_by") @db.VarChar(500)
  userId           Int?              @map("user_id")
  rawContent       String?           @map("raw_content") @db.Text
  status           EmailImportStatus @default(FETCHED)
  errorMessage     String?           @map("error_message") @db.Text
  processedAt      DateTime?         @map("processed_at")
  receivedAt       DateTime?         @map("received_at")
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  user             User?             @relation(fields: [userId], references: [id], onDelete: SetNull)
  pendingEntities  PendingEntity[]

  @@index([userId])
  @@index([status])
  @@map("email_imports")
}

model PendingEntity {
  id              Int                 @id @default(autoincrement())
  emailImportId   Int                 @map("email_import_id")
  userId          Int                 @map("user_id")
  entityType      PendingEntityType   @map("entity_type")
  parsedData      Json                @map("parsed_data")
  confidence      Float?
  matchedTripId   Int?                @map("matched_trip_id")
  status          PendingEntityStatus @default(PENDING)
  createdEntityId Int?                @map("created_entity_id")
  reviewedAt      DateTime?           @map("reviewed_at")
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  emailImport     EmailImport         @relation(fields: [emailImportId], references: [id], onDelete: Cascade)
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  matchedTrip     Trip?               @relation(fields: [matchedTripId], references: [id], onDelete: SetNull)

  @@index([userId, status])
  @@index([emailImportId])
  @@index([matchedTripId])
  @@map("pending_entities")
}
```

**Migration name**: `add_email_import_system`

---

## 2. Environment Variables & Config

Add to [config/index.ts](../../backend/src/config/index.ts) after the `email` block:

```typescript
emailImport: {
  enabled: process.env.EMAIL_IMPORT_ENABLED === 'true',
  pollIntervalMinutes: Math.max(1, parseInt(process.env.EMAIL_IMPORT_POLL_INTERVAL || '5', 10)),
  maxEmailsPerPoll: parseInt(process.env.EMAIL_IMPORT_MAX_EMAILS_PER_POLL || '20', 10),
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    inboxEmail: process.env.GMAIL_INBOX_EMAIL || '',
  },
  llm: {
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
  },
},
```

New env vars (all optional - feature gracefully disabled when unconfigured):
- `EMAIL_IMPORT_ENABLED` - master toggle
- `EMAIL_IMPORT_POLL_INTERVAL` - minutes between polls (default: 5)
- `EMAIL_IMPORT_MAX_EMAILS_PER_POLL` - max emails per cycle (default: 20)
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` - OAuth2 credentials
- `GMAIL_INBOX_EMAIL` - the shared inbox address
- `LLM_BASE_URL` - OpenAI-compatible endpoint (default: OpenAI)
- `LLM_API_KEY` - API key for LLM
- `LLM_MODEL` - model name (default: gpt-4o-mini)
- `LLM_MAX_TOKENS` - max response tokens

---

## 3. New Backend Services

### 3a. `backend/src/services/gmail.service.ts`

Gmail API client using `googleapis` npm package.

**Key methods:**
- `isConfigured(): boolean` - checks if Gmail credentials are set
- `fetchUnreadEmails(maxResults): Promise<GmailMessage[]>` - fetches unread INBOX messages
- `markAsRead(messageId): Promise<void>` - removes UNREAD label
- `extractBodyText(payload): string` - handles multipart/alternative, strips HTML, skips non-text MIME parts (images, attachments) to avoid feeding binary data to the LLM
- `extractForwardedBy(headers, bodyText): string | null` - extracts the original forwarder's email using multiple strategies in priority order:
  1. `X-Forwarded-To` / `X-Original-From` Gmail-specific headers
  2. `Reply-To` header (often set to the forwarder)
  3. Gmail body pattern: `---------- Forwarded message ----------\nFrom: ...`
  4. Outlook body pattern: `From: ... Sent: ... To: ... Subject: ...`
  5. Fallback: the `From` header itself (user may have sent directly rather than forwarding)

### 3b. `backend/src/services/emailParser.service.ts`

LLM-based email parsing via OpenAI-compatible chat completions API (`POST /chat/completions`).

**Key methods:**
- `isConfigured(): boolean`
- `parseEmail(emailBody, subject): Promise<ParseResult>` - sends to LLM, returns structured entities
- `buildSystemPrompt(): string` - detailed extraction prompt (see section 4)
- `validateAndNormalizeParsedEntities(raw): ParsedEntity[]` - validates LLM output structure, normalizes enum `type` fields to lowercase to match Zod schemas (e.g., `"Flight"` -> `"flight"`, `"Hotel"` -> `"hotel"`), and adds soft warnings for entities missing required fields (`name` for lodging/activity/location, `type` for transportation/lodging, `checkInDate`/`checkOutDate` for lodging). These warnings are stored alongside the entity for display in the UI but do not block import -- hard validation occurs in `acceptPendingEntity` against the Zod create schema

Uses axios directly (not an SDK) for maximum compatibility with any OpenAI-compatible endpoint. Retries on 429 following the pattern in [weather.service.ts](../../backend/src/services/weather.service.ts).

**Output type:**
```typescript
interface ParsedEntity {
  entityType: 'TRANSPORTATION' | 'LODGING' | 'ACTIVITY' | 'LOCATION';
  confidence: number; // 0.0 to 1.0
  data: Record<string, unknown>; // fields matching entity create schemas
}
```

### 3c. `backend/src/services/emailImport.service.ts`

Orchestration service coordinating the full pipeline.

**Key methods:**
- `isConfigured(): boolean` / `getConfigurationStatus()`
- `pollAndProcessEmails(): Promise<{processed, errors}>` - main pipeline (with timestamped `isProcessing` lock that auto-expires after 10 minutes to recover from crashes; uses try/finally)
- `matchUser(email): Promise<number | null>` - matches by `User.email` OR `User.forwardingEmail`
- `matchTrip(userId, entityData, entityType): Promise<number | null>` - finds trips where entity dates overlap `startDate`-`endDate`. Matching rules: each entity matched independently; excludes trips with null dates; when multiple trips match, picks the one with the tightest date range
- `getEmailImports(userId, page, limit)` - paginated list
- `getPendingEntities(userId, filters?)` - filtered list with trip info
- `getPendingCount(userId): Promise<number>` - for navbar badge
- `acceptPendingEntity(userId, id, overrides?)` - creates real entity via existing services (transportationService, lodgingService, etc.). Merges `matchedTripId` (from PendingEntity or user override) into `parsedData` as `tripId`, then calls the appropriate service create method with `(userId, data)` (e.g., `transportationService.createTransportation(userId, data)`). Returns 400 if no trip is selected. Validates against Zod create schema *after* `tripId` injection -- if required fields are missing (e.g., lodging `name`), returns a validation error prompting the user to fill them via the edit modal.
- `rejectPendingEntity(userId, id)`
- `updatePendingEntity(userId, id, data)` - edit parsed data or change trip
- `cleanupOldRecords(days)` - purge rawContent from old PARSE_FAILED records

The `acceptPendingEntity` method delegates to existing service create methods to ensure all business logic (validation, entity links, companion auto-add, etc.) is applied.

---

## 4. LLM Prompt Design

System prompt instructs the LLM to extract entities with these field schemas:

**TRANSPORTATION**: type (must be one of: `flight`, `train`, `bus`, `car`, `ferry`, `bicycle`, `walk`, `other`), fromLocationName, toLocationName, departureTime (ISO 8601), arrivalTime, startTimezone, endTimezone, carrier, vehicleNumber, confirmationNumber, cost, currency, notes
*(Field names match the Zod create schema in `transportation.types.ts`)*

**LODGING**: type (must be one of: `hotel`, `hostel`, `airbnb`, `vacation_rental`, `camping`, `resort`, `motel`, `bed_and_breakfast`, `apartment`, `friends_family`, `other`), name (**required**), address, checkInDate, checkOutDate, timezone, confirmationNumber, cost, currency, bookingUrl, notes
*(Field names match Zod create schema in `lodging.types.ts`)*

**ACTIVITY**: name (**required**), description, category, startTime, endTime, timezone, cost, currency, bookingReference, bookingUrl, notes
*(Field names match Zod create schema in `activity.types.ts`. Note: `timezone` is accepted by Zod but not currently persisted by `activityService.createActivity` -- fix this pre-existing gap before or during implementation.)*

**LOCATION**: name (**required**), address, visitDatetime, notes
*(Field names match Zod create schema in `location.types.ts`)*

**Important**: All LLM output field names must match the **Zod create input schemas**, because `acceptPendingEntity` delegates to existing service create methods which validate against Zod schemas. For Lodging, Activity, and Location, the Zod and Prisma field names are identical. For Transportation, the Zod create schema uses frontend-facing names (e.g., `fromLocationName`, `departureTime`, `carrier`) that the service layer maps to different Prisma column names (e.g., `startLocationText`, `scheduledStart`, `company`) internally -- the LLM output must use the Zod field names. The LLM output does **not** include `tripId` -- this is injected by `acceptPendingEntity` from the PendingEntity's `matchedTripId` (or user override) before passing to the service create method.

Rules: extract ALL entities (e.g., round-trip = 2 transportations), confidence scores (1.0=explicit, 0.8=inferred, 0.5=uncertain), don't hallucinate, return empty array for non-travel emails, JSON-only output.

**LLM response parsing**: Request `response_format: { type: "json_object" }` when supported. Fallback for non-OpenAI endpoints: attempt direct JSON parse, then try extracting JSON from markdown code fences (` ```json ... ``` `), then mark as PARSE_FAILED.

**Accept validation**: Before creating a real entity, `acceptPendingEntity` runs two validation layers: (1) Zod schema validation, which catches genuinely required fields like `name` and `type`; (2) custom validation for fields that are technically optional in Zod but would produce bad data if missing -- specifically lodging `checkInDate`/`checkOutDate`, which the lodging service silently defaults to `new Date()` if omitted. The custom validation returns a 400 error prompting the user to fill missing fields via the edit modal rather than allowing silent defaults.

---

## 5. API Endpoints

New route file: `backend/src/routes/emailImport.routes.ts`
New controller: `backend/src/controllers/emailImport.controller.ts`
New types: `backend/src/types/emailImport.types.ts`

All routes under `/api/email-imports`, all require authentication:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List email imports for user (paginated) |
| `GET` | `/status` | Configuration status + operational health (gmail/llm configured, last poll time, error counts) |
| `GET` | `/pending` | List pending entities (filterable by tripId, status) |
| `GET` | `/pending/count` | Pending count for navbar badge |
| `POST` | `/pending/:id/accept` | Accept entity (creates real entity in trip) |
| `POST` | `/pending/:id/reject` | Reject/dismiss entity |
| `PUT` | `/pending/:id` | Edit parsed data or change matched trip |
| `POST` | `/trigger` | Manually trigger email poll |

Register in [index.ts](../../backend/src/index.ts) with existing route pattern.

---

## 6. Cron Job

Add to [cron.ts](../../backend/src/config/cron.ts):

```typescript
if (config.emailImport.enabled && emailImportService.isConfigured()) {
  const interval = config.emailImport.pollIntervalMinutes;
  cron.schedule(`*/${interval} * * * *`, async () => {
    const result = await emailImportService.pollAndProcessEmails();
    logger.info(`Email import: processed=${result.processed}, errors=${result.errors}`);
  });
  logger.info(`Email import polling enabled (every ${interval} minutes)`);
}

// Weekly cleanup: purge rawContent from old PARSE_FAILED records (PII protection)
cron.schedule('0 3 * * 0', async () => {
  await emailImportService.cleanupOldRecords(30); // days
});
```

---

## 7. User Settings Changes

Add `forwardingEmail` to the user settings update endpoint and frontend settings UI. Users can set this in Settings > Profile or Settings > Integrations as an "alternative forwarding email" field.

Modify:
- [backend/src/types/user.types.ts](../../backend/src/types/user.types.ts) - add `forwardingEmail` to update schema
- [backend/src/services/user.service.ts](../../backend/src/services/user.service.ts) - handle in updateSettings
- Frontend settings page - add the field

---

## 8. Frontend Changes

### New files

| File | Purpose |
|------|---------|
| `frontend/src/services/emailImport.service.ts` | API service (axios calls) |
| `frontend/src/pages/EmailImportsPage.tsx` | Main review page with email history + pending entities tabs |
| `frontend/src/components/email-import/PendingEntityCard.tsx` | Card for each pending entity with accept/reject/edit |
| `frontend/src/components/email-import/PendingEntityEditModal.tsx` | Modal to edit parsed data before accepting |
| `frontend/src/components/email-import/EmailImportSettings.tsx` | Settings section showing config status + forwarding email |

### Modified files

| File | Change |
|------|--------|
| [App.tsx](../../frontend/src/App.tsx) | Add lazy import + route for `/email-imports` |
| [Navbar.tsx](../../frontend/src/components/Navbar.tsx) | Add mail icon with pending count badge (TanStack Query, 60s refetch) |
| [SettingsPage.tsx](../../frontend/src/pages/SettingsPage.tsx) | Add EmailImportSettings in integrations tab |
| [TripDetailPage.tsx](../../frontend/src/pages/TripDetailPage.tsx) | Banner when pending entities are matched to this trip |

### EmailImportsPage layout
- Status banner (configured/not configured, forwarding address to use)
- "Check for emails" button (manual trigger)
- Two tabs: "Pending Review" (default) and "Email History"
- Pending tab: list of PendingEntityCard components, filterable by type/trip
- History tab: paginated list of processed emails with status badges

### PendingEntityCard
- Entity type icon + label
- Key extracted fields displayed (varies by type)
- Confidence badge (green/yellow/red)
- Matched trip name or "No trip" with dropdown selector
- Accept / Reject / Edit buttons
- Expandable raw data section

---

## 9. New Dependency

Add to [backend/package.json](../../backend/package.json):
- `googleapis` (^144.0.0) - Gmail API client with OAuth2

No other new dependencies needed. LLM calls use existing `axios`. No frontend dependencies added.

---

## 10. Error Handling

| Case | Handling |
|------|----------|
| Duplicate email | Skip silently (unique constraint on `gmailMessageId`) |
| Unknown sender | `EmailImport.status = NO_USER`, `userId = null`, marked as read |
| LLM parse failure | `status = PARSE_FAILED`, `errorMessage` stored, retryable via manual trigger |
| No entities found | `status = NO_ENTITIES` (valid for non-travel emails) |
| No matching trip | `matchedTripId = null`, user selects trip during review |
| Accept without trip | 400 error: trip must be selected |
| Accept already-accepted | 409 error |
| Concurrent polls | Timestamped `isProcessing` lock with 10-min auto-expiry + try/finally |
| Gmail token expiry | Track `lastSuccessfulPoll` timestamp + `lastError`. Surface in `/status` endpoint and UI. Warn after N consecutive failures. Document manual re-auth process |
| Large emails | Truncate to 50,000 chars before sending to LLM |
| HTML-only emails | Strip HTML tags, extract text content |
| Raw email PII | Clear `rawContent` to null after successful parsing (PARSED/NO_ENTITIES). Retain only for PARSE_FAILED records. Add cron cleanup of failed records older than 30 days |
| LLM rate limits within poll | Process emails sequentially with configurable delay between LLM calls (default: 500ms) to avoid rate limit bursts |
| Multiple trips match date | Pick the trip with the tightest date range; each entity matched independently |
| Trips with null dates | Excluded from auto-matching |
| Manual trigger spam | Rate-limit `/trigger` endpoint to once per 60 seconds per user |
| Gmail `format` choice | Use `format: 'metadata'` for list, `format: 'full'` for individual messages (never `format: 'raw'` to avoid downloading attachments into memory) |

---

## 11. Implementation Sequence

### Phase 1: Database & Infrastructure
1. Add `forwardingEmail` field to User model
2. Add `EmailImport`, `PendingEntity` models and enums to schema
3. Add relation fields to User and Trip models
4. Run migration
5. Add env vars to config/index.ts
6. `npm install googleapis` in backend

### Phase 2: Backend Services
7. Implement `gmail.service.ts`
8. Implement `emailParser.service.ts` (with LLM prompt)
9. Implement `emailImport.service.ts` (orchestration + CRUD)

### Phase 3: Backend API
10. Create `emailImport.types.ts` (Zod schemas)
11. Create `emailImport.controller.ts`
12. Create `emailImport.routes.ts`
13. Register routes in `index.ts`
14. Add cron job to `cron.ts`
15. Add `forwardingEmail` to user settings update flow

### Phase 4: Frontend
16. Create `emailImport.service.ts` (frontend)
17. Create `EmailImportsPage.tsx`
18. Create `PendingEntityCard.tsx`
19. Create `PendingEntityEditModal.tsx`
20. Create `EmailImportSettings.tsx`
21. Add route in `App.tsx`
22. Add navbar badge in `Navbar.tsx`
23. Add pending banner to `TripDetailPage.tsx`
24. Add settings integration

### Phase 5: Integration Testing
25. Test with real Gmail inbox + forwarded emails
26. Test LLM parsing with various email formats (flight, hotel, activity)
27. Test accept/reject/edit flow end-to-end
28. Test with no LLM configured (graceful degradation)
29. Test with no Gmail configured (feature hidden)

---

## Verification Plan

1. **Unit**: Gmail service can fetch and parse email headers/body
2. **Unit**: Email parser sends correct prompt and validates LLM response
3. **Unit**: User matching works for both primary email and forwardingEmail
4. **Unit**: Trip matching finds correct trip by date overlap; handles multiple matches; skips null-date trips
5. **Integration**: Forward a flight confirmation -> poll -> pending entity appears with correct data
6. **Integration**: Accept pending entity -> real Transportation created in correct trip
7. **Integration**: Reject -> entity hidden from review queue
8. **Integration**: Edit + accept -> modified data saved as real entity
9. **E2E**: Full flow from forwarded email to entity visible in trip detail
10. **Edge**: Forward from unregistered email -> NO_USER status, no crash
11. **Edge**: Non-travel email -> NO_ENTITIES status
12. **Edge**: Email with dates outside any trip -> null matchedTripId, user assigns manually
13. **Edge**: Gmail forwarding format (body pattern) correctly parsed
14. **Edge**: Outlook forwarding format correctly parsed
15. **Edge**: rawContent cleared after successful parsing (PII protection)
16. **Edge**: Processing lock auto-expires after crash recovery
