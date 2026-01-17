# Google Photos Integration Plan

This document outlines the implementation plan for adding Google Photos as a photo source in Travel Life, following the patterns established by the existing Immich integration.

## Executive Summary

**Goal**: Allow users to select photos from their Google Photos library and link them to trips, similar to the existing Immich integration.

**Key Differences from Immich**:
- OAuth 2.0 authentication (vs. API key)
- Picker API required for accessing user's existing photos (Library API changes April 2025)
- Base URLs expire after 60 minutes (vs. permanent Immich URLs)
- Token refresh handling required
- Google app verification process required for production

**Estimated Complexity**: Higher than Immich due to OAuth flow and URL expiration handling.

---

## Phase 1: Google Cloud Project Setup (External)

Before any code is written, the following must be configured in Google Cloud Console:

### 1.1 Create/Configure Project
- Create a Google Cloud project (or use existing)
- Enable the **Photos Picker API**
- Enable the **Photos Library API** (for uploads if needed later)

### 1.2 OAuth Consent Screen
- Configure OAuth consent screen
- Add required scopes:
  - `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` (Picker API)
- For development: Add test users
- For production: Submit for Google verification (required before public launch)

### 1.3 OAuth Credentials
- Create OAuth 2.0 Client ID (Web application type)
- Configure authorized redirect URIs:
  - Development: `http://localhost:5000/api/auth/google-photos/callback`
  - Production: `https://your-domain.com/api/auth/google-photos/callback`
- Save Client ID and Client Secret

---

## Phase 2: Database Schema Changes

### 2.1 User Model Additions

```prisma
model User {
  // Existing fields...

  // Google Photos OAuth (encrypted at rest recommended)
  googlePhotosAccessToken   String?   @map("google_photos_access_token") @db.Text
  googlePhotosRefreshToken  String?   @map("google_photos_refresh_token") @db.Text
  googlePhotosTokenExpiry   DateTime? @map("google_photos_token_expiry")
  googlePhotosConnected     Boolean   @default(false) @map("google_photos_connected")
}
```

### 2.2 Photo Model Additions

```prisma
model Photo {
  // Existing fields...
  source           String    @default("local") @db.VarChar(50) // 'local', 'immich', 'google_photos'

  // Google Photos specific
  googlePhotosId   String?   @map("google_photos_id") @db.VarChar(255)
  googlePhotosMime String?   @map("google_photos_mime") @db.VarChar(100)
}
```

### 2.3 Migration
- Create Prisma migration: `npx prisma migrate dev --name add_google_photos_fields`
- Add index on `googlePhotosId` for duplicate detection

---

## Phase 3: Backend - OAuth Flow Implementation

### 3.1 Environment Variables

```env
# Google Photos Integration
GOOGLE_PHOTOS_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_PHOTOS_CLIENT_SECRET=your-client-secret
GOOGLE_PHOTOS_REDIRECT_URI=http://localhost:5000/api/auth/google-photos/callback
```

### 3.2 New Files to Create

| File | Purpose |
|------|---------|
| `src/services/googlePhotos.service.ts` | Google Photos API wrapper |
| `src/services/googlePhotosAuth.service.ts` | OAuth token management |
| `src/controllers/googlePhotos.controller.ts` | Route handlers |
| `src/routes/googlePhotos.routes.ts` | Route definitions |
| `src/types/googlePhotos.types.ts` | TypeScript types & Zod schemas |

### 3.3 OAuth Flow Implementation

**googlePhotosAuth.service.ts** methods:
- `getAuthorizationUrl(userId)`: Generate OAuth URL with state parameter
- `handleCallback(code, state)`: Exchange code for tokens
- `refreshAccessToken(userId)`: Refresh expired tokens
- `revokeAccess(userId)`: Disconnect Google Photos
- `getValidAccessToken(userId)`: Get token, auto-refreshing if expired

**OAuth Flow**:
```
1. User clicks "Connect Google Photos"
2. Backend generates auth URL with state (includes userId)
3. User redirected to Google consent screen
4. Google redirects back with authorization code
5. Backend exchanges code for access + refresh tokens
6. Tokens stored in User record (encrypted)
7. User can now browse Google Photos
```

### 3.4 Routes Structure

```typescript
// Auth routes
POST   /google-photos/auth/url          // Get OAuth authorization URL
GET    /google-photos/auth/callback     // OAuth callback (handles code exchange)
POST   /google-photos/auth/disconnect   // Revoke access and clear tokens
GET    /google-photos/auth/status       // Check connection status

// Picker API routes
POST   /google-photos/picker/session    // Create picker session
GET    /google-photos/picker/session/:id // Poll session status
GET    /google-photos/picker/items      // List picked media items

// Media routes
GET    /google-photos/media/:mediaId/thumbnail  // Proxy thumbnail
GET    /google-photos/media/:mediaId/download   // Proxy full image
```

---

## Phase 4: Backend - Google Photos Service

### 4.1 Picker API Integration

The Picker API uses a session-based flow that differs significantly from Immich:

**googlePhotos.service.ts** methods:

```typescript
// Session management
createPickerSession(accessToken): Promise<PickerSession>
getSessionStatus(accessToken, sessionId): Promise<PickerSession>

// Media retrieval (after user selection)
listPickedMediaItems(accessToken, sessionId, pageToken?): Promise<PickedMediaItems>
getMediaItem(accessToken, sessionId, mediaItemId): Promise<MediaItem>

// Content streaming (with short-lived baseUrls)
streamThumbnail(accessToken, baseUrl): Promise<Stream>
streamOriginal(accessToken, baseUrl): Promise<Stream>
```

### 4.2 Handling URL Expiration

**Critical Challenge**: Google Photos `baseUrl` expires after 60 minutes.

**Solution Options**:

| Option | Pros | Cons |
|--------|------|------|
| **A. Always fetch fresh baseUrl** | Simple, always works | Slow, API quota usage |
| **B. Cache baseUrl for 55 min** | Fast repeated access | Complex cache invalidation |
| **C. Download thumbnails locally** | No expiration issues | Storage space, sync complexity |
| **D. Hybrid: cache thumbnail locally, stream original** | Best of both | Medium complexity |

**Recommended: Option D (Hybrid)**
- On first access, download and cache thumbnail locally
- Store local thumbnail path in Photo record
- For original/download, always fetch fresh baseUrl
- Reduces API calls while handling expiration gracefully

### 4.3 Rate Limiting Considerations

Google Photos API has quotas:
- Respect rate limits in service implementation
- Implement exponential backoff on 429 errors
- Consider batching requests where possible

---

## Phase 5: Backend - Photo Linking

### 5.1 Photo Service Extensions

Add to `photo.service.ts`:

```typescript
// Single photo linking
linkGooglePhoto(userId, data: LinkGooglePhotoInput): Promise<Photo>

// Batch linking (for multiple selections)
linkGooglePhotosBatch(userId, data: LinkGooglePhotoBatchInput): Promise<BatchResult>
```

### 5.2 Photo Linking Flow

```
1. User completes Picker session (selects photos in Google Photos UI)
2. Frontend polls session until mediaItemsSet = true
3. Frontend fetches list of picked media items
4. Frontend sends items to backend for linking
5. Backend:
   a. Gets fresh baseUrl for each item
   b. Downloads and caches thumbnail locally
   c. Extracts metadata (date, location if available)
   d. Creates Photo record with source='google_photos'
   e. Stores googlePhotosId for deduplication
```

### 5.3 Deduplication

Before linking, check for existing `googlePhotosId` in trip to prevent duplicates:

```typescript
const existingIds = await prisma.photo.findMany({
  where: { tripId, googlePhotosId: { not: null } },
  select: { googlePhotosId: true }
});
const existingSet = new Set(existingIds.map(p => p.googlePhotosId));
```

---

## Phase 6: Frontend - Settings & OAuth

### 6.1 New Components

| Component | Purpose |
|-----------|---------|
| `GooglePhotosSettings.tsx` | OAuth connection UI |
| `GooglePhotosBrowser.tsx` | Photo selection interface |

### 6.2 GooglePhotosSettings Component

Features:
- "Connect Google Photos" button (redirects to OAuth)
- Display connection status
- "Disconnect" button with confirmation
- Show connected Google account email (if available)

UI Flow:
```
Not Connected State:
┌────────────────────────────────────────┐
│ Google Photos                          │
│ Connect your Google Photos account to  │
│ easily import photos to your trips.    │
│                                        │
│ [Connect Google Photos]                │
└────────────────────────────────────────┘

Connected State:
┌────────────────────────────────────────┐
│ Google Photos                     ✓    │
│ Connected                              │
│                                        │
│ [Disconnect]                           │
└────────────────────────────────────────┘
```

### 6.3 OAuth Callback Handling

Since OAuth redirects away from the app:

**Option A: Dedicated callback page**
- Create `/auth/google-photos/callback` page
- Backend redirects here after token exchange
- Page shows success/error, then redirects to settings

**Option B: Query parameter on settings page**
- Backend redirects to `/settings?google-photos=success`
- Settings page shows toast notification

**Recommended: Option A** for clearer user experience.

---

## Phase 7: Frontend - Google Photos Browser

### 7.1 Key Differences from Immich Browser

| Aspect | Immich | Google Photos |
|--------|--------|---------------|
| Browsing | Direct API access to all photos | Picker UI in Google Photos app |
| Selection | In-app selection with checkboxes | User selects in Google Photos, then confirms |
| Filtering | Date range, albums, favorites | Limited to what Picker supports |
| UX Flow | Stay in app | Opens new tab/window to Google Photos |

### 7.2 Picker-Based Flow

```
┌─────────────────────────────────────────────────────────┐
│ Import from Google Photos                               │
│                                                         │
│ Click below to open Google Photos and select the        │
│ photos you want to import to this trip.                 │
│                                                         │
│ [Open Google Photos Picker]                             │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ Status: Waiting for selection...                        │
│ (Tab will auto-close when you finish selecting)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Session Polling Implementation

```typescript
// Frontend logic
const startPickerSession = async () => {
  // 1. Create session
  const session = await googlePhotosService.createSession();

  // 2. Open picker URL (with /autoclose suffix for web)
  window.open(session.pickerUri + '/autoclose', '_blank');

  // 3. Poll for completion
  const pollInterval = session.pollingConfig.pollInterval; // e.g., 5000ms

  while (!session.mediaItemsSet) {
    await sleep(pollInterval);
    session = await googlePhotosService.getSession(session.id);
  }

  // 4. Fetch selected items
  const items = await googlePhotosService.listPickedItems(session.id);

  // 5. Link to trip
  await linkSelectedPhotos(items);
};
```

### 7.4 Post-Selection Preview

After user completes selection in Google Photos:

```
┌─────────────────────────────────────────────────────────┐
│ Import from Google Photos                               │
│                                                         │
│ You selected 24 photos                                  │
│                                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │     │ │     │ │     │ │     │ │     │  +19 more     │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                         │
│ [Import Selected Photos]           [Select Different]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 8: Frontend - Photo Upload Integration

### 8.1 Modify PhotoUpload Component

Add Google Photos as a source option alongside Immich:

```typescript
// Source tabs
<Tabs>
  <Tab>Upload Files</Tab>
  <Tab>Import from Immich</Tab>
  <Tab>Import from Google Photos</Tab>  // NEW
</Tabs>
```

### 8.2 Conditional Rendering

```typescript
// In PhotoUpload.tsx
{activeTab === 'google-photos' && (
  userSettings.googlePhotosConnected ? (
    <GooglePhotosBrowser
      tripId={tripId}
      onPhotosLinked={handlePhotosLinked}
    />
  ) : (
    <GooglePhotosNotConnected />
  )
)}
```

---

## Phase 9: Frontend Services & Types

### 9.1 New Service File

**googlePhotos.service.ts**:

```typescript
class GooglePhotosService {
  // Auth
  getAuthUrl(): Promise<{ url: string }>
  getConnectionStatus(): Promise<{ connected: boolean }>
  disconnect(): Promise<void>

  // Picker
  createSession(): Promise<PickerSession>
  getSession(sessionId: string): Promise<PickerSession>
  listPickedItems(sessionId: string): Promise<PickedMediaItem[]>

  // Photo linking
  linkPhoto(data: LinkGooglePhotoInput): Promise<Photo>
  linkPhotosBatch(data: LinkGooglePhotoBatchInput): Promise<BatchResult>
}
```

### 9.2 Type Definitions

**googlePhotos.ts**:

```typescript
interface PickerSession {
  id: string;
  pickerUri: string;
  mediaItemsSet: boolean;
  pollingConfig: {
    pollInterval: number;  // milliseconds
    timeoutIn: number;     // milliseconds
  };
}

interface PickedMediaItem {
  id: string;
  baseUrl: string;
  mimeType: string;
  mediaFile: {
    baseUrl: string;
    mimeType: string;
    filename: string;
  };
  type: 'PHOTO' | 'VIDEO';
}

interface LinkGooglePhotoInput {
  tripId: number;
  googlePhotosId: string;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
}
```

---

## Phase 10: Thumbnail Caching Strategy

### 10.1 Local Thumbnail Storage

Since Google Photos URLs expire, cache thumbnails locally:

```
uploads/
  photos/
    google-photos/
      thumbnails/
        {googlePhotosId}_thumb.jpg
```

### 10.2 Caching Flow

```
Photo Display Request
       │
       ▼
Check if local thumbnail exists
       │
       ├─── YES ──► Serve local file
       │
       └─── NO ───► Fetch from Google Photos
                         │
                         ▼
                   Download thumbnail
                         │
                         ▼
                   Save locally
                         │
                         ▼
                   Update Photo.thumbnailPath
                         │
                         ▼
                   Serve file
```

### 10.3 Implementation in Photo Service

```typescript
async getGooglePhotosThumbnail(userId: number, photoId: number): Promise<string> {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });

  // If thumbnail already cached locally
  if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
    return photo.thumbnailPath;
  }

  // Need to fetch from Google Photos
  const accessToken = await googlePhotosAuth.getValidAccessToken(userId);

  // Create picker session or use stored session to get fresh baseUrl
  // This is the tricky part - may need to store session ID

  // Download and cache thumbnail
  const thumbnailPath = await downloadAndCacheThumbnail(
    accessToken,
    photo.googlePhotosId
  );

  // Update photo record
  await prisma.photo.update({
    where: { id: photoId },
    data: { thumbnailPath }
  });

  return thumbnailPath;
}
```

---

## Phase 11: Comparison - Immich vs Google Photos

| Feature | Immich | Google Photos |
|---------|--------|---------------|
| **Auth** | API Key | OAuth 2.0 with refresh tokens |
| **Browsing** | Direct API access | Picker API (opens Google Photos UI) |
| **Filtering** | Date range, albums, metadata search | Limited (Picker UI controlled by Google) |
| **Album Import** | Yes, full album access | Limited - only picked items |
| **URL Expiration** | Never | 60 minutes |
| **Thumbnail Strategy** | Proxy on demand | Cache locally |
| **Rate Limits** | Self-hosted, unlimited | Google quotas apply |
| **Setup Complexity** | Low (URL + API Key) | High (OAuth, Google Cloud project) |
| **Verification** | None needed | Google app verification for production |

---

## Phase 12: Security Considerations

### 12.1 Token Storage
- Store refresh tokens encrypted at rest (consider using environment-based encryption key)
- Never send tokens to frontend
- Clear tokens completely on disconnect

### 12.2 OAuth State Parameter
- Use cryptographically random state parameter
- Include user ID (signed/encrypted) to prevent CSRF
- Validate state on callback

### 12.3 Token Refresh
- Implement automatic refresh before expiry
- Handle refresh failures gracefully (prompt re-authentication)
- Log token refresh events for debugging

---

## Phase 13: Testing Strategy

### 13.1 Unit Tests

| Test Area | Tests |
|-----------|-------|
| OAuth Service | Token exchange, refresh, revocation |
| Google Photos Service | Session creation, polling, media retrieval |
| Photo Service | Google Photos linking, deduplication |

### 13.2 Integration Tests
- Full OAuth flow with test account
- Picker session lifecycle
- Photo linking and thumbnail caching

### 13.3 Manual Testing Checklist
- [ ] OAuth connection flow
- [ ] OAuth disconnect flow
- [ ] Token refresh (wait for expiry)
- [ ] Picker session creation and polling
- [ ] Photo selection in Google Photos UI
- [ ] Photo import (single and batch)
- [ ] Thumbnail display after import
- [ ] Thumbnail display after URL expiration
- [ ] Error handling (network failures, quota exceeded)
- [ ] Deduplication (import same photos twice)

---

## Phase 14: Rollout Plan

### 14.1 Development Phase
1. Set up Google Cloud project with test users
2. Implement OAuth flow
3. Implement Picker API integration
4. Implement photo linking
5. Test with development accounts

### 14.2 Beta Phase
1. Deploy to staging environment
2. Test with small group of users
3. Monitor for issues (token refresh, quota)
4. Gather feedback on UX

### 14.3 Production Phase
1. Submit app for Google verification
2. Complete verification process (may take weeks)
3. Deploy OAuth integration
4. Enable for all users
5. Monitor usage and quotas

---

## Phase 15: Known Limitations & Future Enhancements

### 15.1 Current Limitations (Picker API)
- Cannot browse all photos programmatically (user must select in Google Photos UI)
- Limited filtering options compared to Immich
- No album-level import (only individual photo selection)
- Session expires, requiring new session for each import
- Video support may have processing delays

### 15.2 Potential Future Enhancements
- **Smart date suggestions**: Pre-set trip date range in Picker (if supported)
- **Album creation in Google Photos**: Use Library API to create albums from Travel Life
- **Sync indicator**: Show which photos are already imported
- **Video support**: Handle video processing status
- **Offline thumbnail cache**: Pre-cache thumbnails during import

---

## Implementation Order Summary

1. **Database changes** (Phase 2) - Foundation for storing tokens and photo references
2. **OAuth flow** (Phase 3) - Enable Google account connection
3. **Google Photos service** (Phase 4) - API wrapper
4. **Backend routes** (Phase 3-5) - Expose functionality
5. **Frontend settings** (Phase 6) - OAuth connection UI
6. **Frontend browser** (Phase 7) - Photo selection interface
7. **Photo upload integration** (Phase 8) - Add as source option
8. **Thumbnail caching** (Phase 10) - Handle URL expiration
9. **Testing** (Phase 13) - Verify all flows work
10. **Google verification** (Phase 14) - Required for production

---

## Open Questions

1. **Encryption strategy**: How should OAuth tokens be encrypted at rest?
2. **Session persistence**: Should Picker sessions be stored for reuse within expiry window?
3. **Quota monitoring**: How to handle quota exhaustion gracefully?
4. **Video support**: Include videos in MVP or phase 2?
5. **Mobile considerations**: Any special handling for mobile browsers with Picker?

---

## References

- [Google Photos APIs Overview](https://developers.google.com/photos/overview/about)
- [Picker API Getting Started](https://developers.google.com/photos/picker/guides/get-started-picker)
- [Picker API Sessions](https://developers.google.com/photos/picker/guides/sessions)
- [Picker API Media Items](https://developers.google.com/photos/picker/guides/media-items)
- [Authorization Scopes](https://developers.google.com/photos/overview/authorization)
- [API Policy & Requirements](https://developers.google.com/photos/support/api-policy)
- [April 2025 API Changes](https://developers.googleblog.com/en/google-photos-picker-api-launch-and-library-api-updates/)
