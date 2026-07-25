# API Reference

Travel Life API documentation. The backend provides a RESTful API for all application functionality.

> Last updated: 2026-05-15 — Travel Life v5.4.0

## Base URL

All API endpoints are mounted under `/api`. There is no path versioning.

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`

## Service & Health Endpoints

These endpoints are not authenticated and are useful for monitoring and diagnostics.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check, includes database connectivity status | No |
| GET | `/api` | API root - returns name, version, and running status | No |
| GET | `/api/version` | Returns the backend version and package name | No |

## Authentication

Most endpoints require JWT authentication.

### Headers

```text
Authorization: Bearer <access_token>
```

### Token Lifecycle

- **Access Token**: short-lived; sent in the `Authorization` header.
- **Refresh Token**: long-lived; stored as an `httpOnly` cookie (not exposed to JavaScript).
- On page load, the frontend calls `POST /api/auth/silent-refresh`, which reads the refresh token cookie and returns a fresh access token if the cookie is valid.
- The access token is refreshed transparently by the frontend.

### CSRF Protection

All `/api` routes (except `/api/auth/*` and the public invitation endpoints) are protected by CSRF validation. Auth routes bootstrap the CSRF token.

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Create new user account | No |
| POST | `/login` | Authenticate user, returns tokens | No |
| POST | `/refresh` | Refresh access token (reads refresh token cookie) | No |
| POST | `/silent-refresh` | Restore auth state from httpOnly cookie on page load | No |
| GET | `/me` | Get current authenticated user | Yes |
| POST | `/logout` | Clear refresh token cookie (works even with an expired token) | No |

### Users (`/api/users`)

All user routes require authentication.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/me` | Get current user profile | Yes |
| GET | `/settings` | Get user settings | Yes |
| PUT | `/settings` | Update user settings | Yes |
| PUT | `/settings/trip-types/rename` | Rename a custom trip type | Yes |
| DELETE | `/settings/trip-types/:typeName` | Delete a custom trip type | Yes |
| PUT | `/settings/categories/rename` | Rename a custom category | Yes |
| DELETE | `/settings/categories/:categoryName` | Delete a custom category | Yes |
| GET | `/immich-settings` | Get Immich integration settings | Yes |
| PUT | `/immich-settings` | Update Immich integration settings | Yes |
| GET | `/weather-settings` | Get weather integration settings | Yes |
| PUT | `/weather-settings` | Update weather integration settings | Yes |
| GET | `/aviationstack-settings` | Get AviationStack (flight tracking) settings | Yes |
| PUT | `/aviationstack-settings` | Update AviationStack settings | Yes |
| GET | `/openrouteservice-settings` | Get OpenRouteService (routing) settings | Yes |
| PUT | `/openrouteservice-settings` | Update OpenRouteService settings | Yes |
| GET | `/smtp-settings` | Get SMTP email settings | Yes |
| PUT | `/smtp-settings` | Update SMTP email settings | Yes |
| POST | `/smtp-settings/test` | Send a test email to verify SMTP configuration | Yes |
| PUT | `/username` | Update username | Yes |
| PUT | `/password` | Update password | Yes |
| GET | `/search` | Search users by email or username (rate limited) | Yes |
| GET | `/travel-partner` | Get travel partner settings | Yes |
| PUT | `/travel-partner` | Update travel partner settings (rate limited) | Yes |

> Note: `GET` and `PUT` settings endpoints accept and return only whether sensitive values (API keys, SMTP password) are set; secret values are never returned.

### Trips (`/api/trips`)

All trip routes require authentication.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create new trip | Yes |
| GET | `/` | List trips (supports `status` and `search` query params) | Yes |
| GET | `/:id` | Get trip details | Yes |
| PUT | `/:id` | Update trip | Yes |
| DELETE | `/:id` | Delete trip | Yes |
| PUT | `/:id/cover-photo` | Set the trip's cover photo | Yes |
| GET | `/:id/validate` | Run a trip validation / health check | Yes |
| GET | `/:id/validation-status` | Get the current validation status | Yes |
| POST | `/:id/validation/dismiss` | Dismiss a validation issue | Yes |
| POST | `/:id/validation/restore` | Restore a previously dismissed validation issue | Yes |
| POST | `/:id/duplicate` | Clone a trip | Yes |

### Locations (`/api/locations`)

Locations are a flat resource. The owning trip is referenced by `tripId` in the body or path.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create location (requires `tripId` in body) | Yes |
| GET | `/visited` | Get all locations marked as "Places Visited" across the user's trips | Yes |
| GET | `/trip/:tripId` | List locations for a trip | Yes |
| DELETE | `/trip/:tripId/bulk` | Bulk delete locations | Yes |
| PATCH | `/trip/:tripId/bulk` | Bulk update locations | Yes |
| GET | `/categories/list` | List location categories (system + user) | Yes |
| POST | `/categories` | Create a custom location category | Yes |
| PUT | `/categories/:id` | Update a custom location category | Yes |
| DELETE | `/categories/:id` | Delete a custom location category | Yes |
| GET | `/:id` | Get a location by ID | Yes |
| PUT | `/:id` | Update a location | Yes |
| DELETE | `/:id` | Delete a location | Yes |

### Photos (`/api/photos`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/upload` | Upload a photo or video (`multipart/form-data`, max 500MB) | Yes |
| POST | `/immich` | Link a single photo from Immich | Yes |
| POST | `/immich/batch` | Link multiple photos from Immich in one request | Yes |
| GET | `/trip/:tripId` | List photos for a trip | Yes |
| GET | `/trip/:tripId/immich-asset-ids` | List Immich asset IDs already linked to a trip | Yes |
| GET | `/trip/:tripId/unsorted` | List photos not assigned to any album in a trip | Yes |
| GET | `/trip/:tripId/date-groupings` | Get date groupings (dates + photo counts) for lazy loading | Yes |
| GET | `/trip/:tripId/by-date/:date` | Get photos for a specific date (`YYYY-MM-DD`) | Yes |
| GET | `/trip/:tripId/suggest-albums` | Get smart album suggestions based on photo clustering | Yes |
| POST | `/trip/:tripId/accept-suggestion` | Create an album from an album suggestion | Yes |
| GET | `/:id` | Get a photo by ID | Yes |
| PUT | `/:id` | Update photo metadata | Yes |
| DELETE | `/:id` | Delete a photo | Yes |

### Photo Albums (`/api/albums`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List all albums across all trips (supports `skip`/`take` pagination) | Yes |
| POST | `/` | Create a new album (requires `tripId` in body) | Yes |
| GET | `/trip/:tripId` | List albums for a specific trip | Yes |
| GET | `/:id` | Get an album with paginated photos (supports `skip`/`take`) | Yes |
| PUT | `/:id` | Update an album | Yes |
| DELETE | `/:id` | Delete an album (does not delete the photos) | Yes |
| POST | `/:id/photos` | Add photos to an album | Yes |
| DELETE | `/:id/photos/:photoId` | Remove a photo from an album (does not delete the photo) | Yes |

### Activities (`/api/activities`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create an activity (requires `tripId` in body) | Yes |
| GET | `/trip/:tripId` | List activities for a trip | Yes |
| GET | `/:id` | Get an activity by ID | Yes |
| PUT | `/:id` | Update an activity | Yes |
| DELETE | `/:id` | Delete an activity | Yes |
| DELETE | `/trip/:tripId/bulk` | Bulk delete activities | Yes |
| PATCH | `/trip/:tripId/bulk` | Bulk update activities | Yes |

### Transportation (`/api/transportation`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create a transportation record (requires `tripId` in body) | Yes |
| GET | `/` | List all transportation for the current user | Yes |
| GET | `/trip/:tripId` | List transportation for a trip | Yes |
| POST | `/trip/:tripId/recalculate-distances` | Recalculate route distances for a trip's transportation | Yes |
| DELETE | `/trip/:tripId/bulk` | Bulk delete transportation | Yes |
| PATCH | `/trip/:tripId/bulk` | Bulk update transportation | Yes |
| GET | `/:id` | Get a transportation record by ID | Yes |
| PUT | `/:id` | Update a transportation record | Yes |
| DELETE | `/:id` | Delete a transportation record | Yes |

### Lodging (`/api/lodging`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create a lodging record (requires `tripId` in body) | Yes |
| GET | `/trip/:tripId` | List lodging for a trip | Yes |
| DELETE | `/trip/:tripId/bulk` | Bulk delete lodging | Yes |
| PATCH | `/trip/:tripId/bulk` | Bulk update lodging | Yes |
| GET | `/:id` | Get a lodging record by ID | Yes |
| PUT | `/:id` | Update a lodging record | Yes |
| DELETE | `/:id` | Delete a lodging record | Yes |

### Journal Entries (`/api/journal`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create a journal entry (requires `tripId` in body) | Yes |
| GET | `/trip/:tripId` | List journal entries for a trip | Yes |
| GET | `/:id` | Get a journal entry by ID | Yes |
| PUT | `/:id` | Update a journal entry | Yes |
| DELETE | `/:id` | Delete a journal entry | Yes |
| POST | `/:id/ai-enhance` | AI-enhance a journal entry (rate limited) | Yes |

### Entity Links (`/api/trips/:tripId/links`)

Links connect any two entities (photos, locations, activities, lodging, transportation, journal entries, albums) within a trip.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create a link between two entities | Yes |
| POST | `/bulk` | Create multiple links from one source to many targets | Yes |
| POST | `/photos` | Link multiple photos to a target entity | Yes |
| POST | `/cleanup-orphans` | Remove links whose source or target no longer exists | Yes |
| GET | `/summary` | Get link counts grouped by entity type for the trip | Yes |
| GET | `/target-type/:targetType` | Get all links pointing to a given target type | Yes |
| GET | `/from/:entityType/:entityId` | Get all links originating from an entity | Yes |
| GET | `/to/:entityType/:entityId` | Get all links pointing to an entity | Yes |
| GET | `/entity/:entityType/:entityId` | Get all links involving an entity (both directions) | Yes |
| GET | `/photos/:entityType/:entityId` | Get all photos linked to an entity | Yes |
| PATCH | `/:linkId` | Update a link's relationship or notes | Yes |
| DELETE | `/entity/:entityType/:entityId` | Delete all links for an entity | Yes |
| DELETE | `/:linkId` | Delete a link by ID | Yes |
| DELETE | `/` | Delete a link by source and target (specified in body) | Yes |

### Tags (`/api/tags`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create a tag | Yes |
| GET | `/` | List the current user's tags | Yes |
| PUT | `/reorder` | Reorder tags | Yes |
| GET | `/:id` | Get a tag by ID | Yes |
| PUT | `/:id` | Update a tag | Yes |
| DELETE | `/:id` | Delete a tag | Yes |
| POST | `/link` | Link a tag to a trip | Yes |
| DELETE | `/trips/:tripId/tags/:tagId` | Unlink a tag from a trip | Yes |
| GET | `/trips/:tripId` | List tags for a specific trip | Yes |

### Companions (`/api/companions`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create a travel companion | Yes |
| GET | `/` | List the current user's companions | Yes |
| GET | `/:id` | Get a companion by ID | Yes |
| PUT | `/:id` | Update a companion | Yes |
| DELETE | `/:id` | Delete a companion | Yes |
| POST | `/:id/avatar` | Upload a companion avatar (`multipart/form-data`, max 5MB) | Yes |
| DELETE | `/:id/avatar` | Delete a companion's avatar | Yes |
| POST | `/:id/avatar/immich` | Set a companion's avatar from an Immich asset | Yes |
| POST | `/link` | Link a companion to a trip | Yes |
| DELETE | `/trips/:tripId/companions/:companionId` | Unlink a companion from a trip | Yes |
| GET | `/trips/:tripId` | List companions for a specific trip | Yes |

### Checklists (`/api/checklists`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List checklists (optional `tripId` query param) | Yes |
| POST | `/` | Create a checklist | Yes |
| GET | `/:id` | Get a checklist with its items | Yes |
| PUT | `/:id` | Update a checklist | Yes |
| DELETE | `/:id` | Delete a checklist | Yes |
| POST | `/:id/items` | Add an item to a checklist | Yes |
| PUT | `/items/:itemId` | Update a checklist item | Yes |
| DELETE | `/items/:itemId` | Delete a checklist item | Yes |
| POST | `/initialize` | Initialize default checklists for the user | Yes |
| POST | `/auto-check` | Auto-check items based on existing trip data | Yes |
| DELETE | `/defaults` | Remove all default checklists | Yes |
| POST | `/defaults/restore` | Restore default checklists | Yes |
| GET | `/defaults/status` | Get the status of default checklists | Yes |
| POST | `/defaults/add` | Add specific default checklists by type | Yes |
| POST | `/defaults/remove` | Remove specific default checklists by type | Yes |

### Search (`/api/search`)

The search endpoint is rate limited to 30 requests per minute.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Global search across all entities | Yes |

Query parameters for `GET /api/search`:

- `q` (required) - search query string
- `types` - comma-separated entity types to search (`trips`, `locations`, `activities`, `lodging`, `photos`, `albums`, `journals`)
- `tripId` - limit search to a specific trip
- `limit` - maximum results per entity type (default 10)

### Collaboration (`/api/collaboration`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/invitations/token/:token` | Get invitation details by token (for invite links) | No |
| GET | `/invitations` | Get pending invitations for the current user | Yes |
| POST | `/invitations/:invitationId/accept` | Accept an invitation | Yes |
| POST | `/invitations/:invitationId/decline` | Decline an invitation | Yes |
| GET | `/trips/shared` | Get trips shared with the current user | Yes |
| GET | `/trips/:tripId/permission` | Get the user's permission level for a trip | Yes |
| GET | `/trips/:tripId/collaborators` | List collaborators for a trip | Yes |
| PATCH | `/trips/:tripId/collaborators/:userId` | Update a collaborator's permission level | Yes |
| DELETE | `/trips/:tripId/collaborators/:userId` | Remove a collaborator (or leave the trip) | Yes |
| GET | `/trips/:tripId/invitations` | List pending invitations for a trip | Yes |
| POST | `/trips/:tripId/invitations` | Send an invitation to collaborate on a trip | Yes |
| DELETE | `/trips/:tripId/invitations/:invitationId` | Cancel a pending trip invitation | Yes |
| POST | `/trips/:tripId/invitations/:invitationId/resend` | Resend a pending trip invitation | Yes |

### Immich Integration (`/api/immich`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/test` | Test the connection to the configured Immich instance | Yes |
| GET | `/assets` | Get the user's Immich assets (supports `page`/`size`) | Yes |
| GET | `/assets/date-range` | Get Immich assets within a date range | Yes |
| GET | `/assets/:assetId/thumbnail` | Get an asset thumbnail (proxied from Immich) | Yes |
| GET | `/assets/:assetId/original` | Get an asset's original file (proxied from Immich) | Yes |
| GET | `/assets/:assetId` | Get a single Immich asset by ID | Yes |
| GET | `/assets/:assetId/urls` | Get thumbnail and file URLs for an asset | Yes |
| POST | `/search` | Search Immich assets by metadata | Yes |
| GET | `/albums` | List the user's Immich albums | Yes |
| GET | `/albums/:albumId` | Get an Immich album with its assets | Yes |

### Weather

Weather endpoints are trip-scoped and mounted directly under `/api/trips`.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/trips/:tripId/weather` | Get weather data for the trip's date range | Yes |
| POST | `/api/trips/:tripId/weather/refresh` | Force-refresh weather for a specific date | Yes |
| POST | `/api/trips/:tripId/weather/refresh-all` | Force-refresh all weather data for a trip | Yes |

### Backup & Restore (`/api/backup`)

Backup and restore endpoints accept large payloads (up to 100MB). The create/restore endpoints are rate limited.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/create` | Create and download a backup (ZIP archive of all user data) | Yes |
| POST | `/restore` | Restore user data from a backup file (overwrites existing data) | Yes |
| GET | `/info` | Get backup info including entity counts and estimated size | Yes |

### AI

AI features are trip-scoped and mounted under `/api/trips/:tripId/ai`. All AI endpoints are rate limited (per-user).

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/trips/:tripId/ai/link-suggestions` | Get AI-suggested entity links for a trip | Yes |
| POST | `/api/trips/:tripId/ai/journal-summary` | Generate an AI summary of the trip's journal entries | Yes |

> Related: `POST /api/journal/:id/ai-enhance` (see Journal Entries) also uses AI to enhance a single journal entry.

### PDF Imports (`/api/pdf-imports`)

Upload travel documents (PDFs) and let AI extract trip data into pending entities for review. The upload and reparse endpoints are rate limited (per-user AI limiter).

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/upload` | Upload a PDF for AI parsing (`multipart/form-data`, max 25MB) | Yes |
| GET | `/pending/count` | Get the count of pending (unreviewed) extracted entities | Yes |
| GET | `/pending` | List pending extracted entities awaiting review | Yes |
| PUT | `/pending/:id` | Update a pending extracted entity before accepting | Yes |
| POST | `/pending/:id/accept` | Accept a pending entity and create the real record | Yes |
| POST | `/pending/:id/reject` | Reject a pending entity | Yes |
| GET | `/` | List the user's PDF imports | Yes |
| GET | `/:id` | Get a PDF import by ID | Yes |
| POST | `/:id/reparse` | Re-run AI parsing on an existing import | Yes |
| DELETE | `/:id` | Delete a PDF import | Yes |

### Saved Links (`/api/saved-links`)

Reference URLs kept alongside a trip. Links are user-scoped and may exist with no
trip (the "inbox"), which is why these routes are not nested under `/api/trips`.
Open Graph metadata is fetched in the background after creation, so a new link is
returned immediately with `metadataStatus: "PENDING"`.

Tracking parameters (`utm_*`, `fbclid`, `gclid`, and similar) are stripped from
the URL before it is stored. URLs resolving to internal or private addresses are
rejected with a 400.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Save a link, optionally assigning it to a trip | Yes |
| GET | `/` | List saved links; `?tripId=<id>` or `?tripId=none` for the inbox | Yes |
| GET | `/inbox-count` | Count of links not yet assigned to a trip | Yes |
| GET | `/:id` | Get a saved link by ID | Yes |
| PATCH | `/:id` | Update a link; `tripId: null` returns it to the inbox | Yes |
| DELETE | `/:id` | Delete a link and any entity links pointing at it | Yes |
| POST | `/:id/refresh-metadata` | Re-scrape Open Graph metadata | Yes |
| GET | `/api/trips/:tripId/saved-links` | List a trip's links (visible to collaborators) | Yes |

Saved links participate in the entity-linking system as `SAVED_LINK`, so they can
be attached to activities, lodging, locations, and the rest via
`/api/trips/:tripId/links`.

Links also arrive by email. A background job polls a configured IMAP mailbox, and
messages from a recognised sender have their URLs captured as saved links with
`source: "EMAIL"` and no trip, landing in the inbox. There is no endpoint for
this — it is cron-driven — but the trusted-sender list is managed here:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/link-ingest` | Get the ingest mailbox and trusted sender list | Yes |
| PUT | `/api/users/link-ingest` | Replace the trusted sender list (max 20) | Yes |

### Flight Tracking

Flight tracking endpoints are mounted under `/api` and scoped to transportation or trips. They use the AviationStack API.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/transportation/:transportationId/flight-status` | Get real-time flight status for a transportation record | Yes |
| PUT | `/api/transportation/:transportationId/flight-status` | Manually update flight tracking info (gate, terminal, etc.) | Yes |
| POST | `/api/trips/:tripId/flights/refresh` | Refresh flight status for all flights in a trip | Yes |

### Packing Suggestions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/trips/:tripId/packing-suggestions` | Get packing suggestions based on the trip's weather data | Yes |

### Travel Documents (`/api/travel-documents`)

Manage passports, visas, and other travel documents, including expiry alerts.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List the user's travel documents | Yes |
| POST | `/` | Create a travel document | Yes |
| GET | `/alerts` | List documents expiring within their alert window | Yes |
| GET | `/primary-passport` | Get the user's primary passport (or null) | Yes |
| GET | `/trip/:tripId/check` | Check document validity for a specific trip | Yes |
| GET | `/:id` | Get a travel document by ID | Yes |
| PUT | `/:id` | Update a travel document | Yes |
| DELETE | `/:id` | Delete a travel document | Yes |

### Language Phrases

Phrase data endpoints are public; trip-language management endpoints require authentication.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/languages` | List all available languages with phrase counts | No |
| GET | `/api/phrases/categories` | List phrase categories | No |
| GET | `/api/phrases/:languageCode` | Get all phrases for a language | No |
| GET | `/api/phrases/:languageCode/category/:category` | Get phrases for a language filtered by category | No |
| GET | `/api/trips/:tripId/languages` | Get languages selected for a trip | Yes |
| POST | `/api/trips/:tripId/languages` | Add a language to a trip | Yes |
| DELETE | `/api/trips/:tripId/languages/:languageCode` | Remove a language from a trip | Yes |
| GET | `/api/trips/:tripId/phrases` | Get phrases for all languages selected for a trip | Yes |

### User Invitations (`/api/user-invitations`)

Invite people who do not yet have an account. The public endpoints rely on the cryptographically random invitation token plus rate limiting in place of CSRF protection.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/email-status` | Check whether email sending is configured | Yes |
| GET | `/` | List invitations sent by the current user | Yes |
| POST | `/` | Send a new user invitation (rate limited) | Yes |
| DELETE | `/:invitationId` | Cancel a pending invitation | Yes |
| POST | `/:invitationId/resend` | Resend a pending invitation (rate limited) | Yes |
| GET | `/token/:token` | Get invitation details by token (rate limited) | No |
| POST | `/accept` | Accept an invitation and create an account (rate limited) | No |
| POST | `/decline/:token` | Decline an invitation (rate limited) | No |

### Trip Series (`/api/trip-series`)

Group related trips into an ordered series.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List the user's trip series | Yes |
| POST | `/` | Create a trip series | Yes |
| GET | `/:id` | Get a trip series by ID | Yes |
| PUT | `/:id` | Update a trip series | Yes |
| DELETE | `/:id` | Delete a trip series | Yes |
| POST | `/:id/trips` | Add a trip to a series | Yes |
| DELETE | `/:id/trips/:tripId` | Remove a trip from a series | Yes |
| PUT | `/:id/reorder` | Reorder the trips within a series | Yes |

## Response Format

Most responses follow this structure:

```json
{
  "status": "success",
  "data": { },
  "message": "Optional message"
}
```

Some endpoints return binary content directly (e.g. image proxies, backup ZIP downloads) rather than the JSON envelope.

### Success Response

```json
{
  "status": "success",
  "data": {
    "trip": {
      "id": 1,
      "title": "Japan 2024"
    }
  }
}
```

### Error Response

A generic error response contains a `status` and a `message`:

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

Validation errors (Zod) additionally include a `fields` array naming the invalid fields:

```json
{
  "status": "error",
  "message": "Validation failed",
  "fields": ["title", "startDate"]
}
```

Unique constraint violations include the offending `field`:

```json
{
  "status": "error",
  "message": "A record with this value already exists",
  "field": "email"
}
```

> The error response does not include a machine-readable `code` field.

## Common Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 413 | Payload Too Large (e.g. oversized upload) |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (e.g. database down, Immich unreachable) |

## Pagination

Album endpoints support `skip`/`take` pagination:

```text
GET /api/albums?skip=0&take=30
GET /api/albums/:id?skip=0&take=40
```

Trip listing does not use `skip`/`take`; it supports `status` and `search` query parameters instead.

## Filtering

Several endpoints support filtering via query parameters:

```text
GET /api/trips?status=completed&search=japan
GET /api/checklists?tripId=5
GET /api/search?q=tokyo&types=trips,locations&limit=20
```

## File Uploads

Photo uploads use `multipart/form-data` and accept the `photo` field:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "photo=@/path/to/image.jpg" \
  -F "tripId=1" \
  -F "caption=My photo" \
  http://localhost:5000/api/photos/upload
```

Other multipart uploads:

- Companion avatars: `POST /api/companions/:id/avatar`, field `avatar` (max 5MB)
- PDF imports: `POST /api/pdf-imports/upload`, field `file` (max 25MB, PDF only)
- Backup restore: `POST /api/backup/restore`, field `backup`

## Rate Limiting

Rate limits are applied per IP or per user depending on the endpoint:

- General API: 1000 requests per 15 minutes per IP
- Auth routes (`/api/auth/*`): 15 requests per 15 minutes per IP
- Silent refresh (`/api/auth/silent-refresh`): 60 requests per 15 minutes per IP
- Search (`/api/search`): 30 requests per minute per IP
- Backup create/restore, AI endpoints, PDF import upload/reparse, and sensitive user endpoints have their own dedicated limiters.

Rate-limited requests receive a `429 Too Many Requests` response.

## Swagger Documentation

Interactive API documentation generated from the route definitions is available at:

```text
http://localhost:5000/api-docs
```

## Related Documentation

- [Backend Architecture](../architecture/BACKEND_ARCHITECTURE.md) - Server-side implementation details
- [Database Schema](../architecture/DATABASE_SCHEMA.md) - Data model reference
