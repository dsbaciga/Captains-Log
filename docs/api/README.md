# API Reference

Travel Life API documentation. The backend provides a RESTful API for all application functionality.

## Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Most endpoints require JWT authentication.

### Headers

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

- **Access Token**: 15 minutes validity
- **Refresh Token**: 7 days validity
- Tokens are automatically refreshed by the frontend

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Create new user account | No |
| POST | `/login` | Authenticate user | No |
| POST | `/refresh` | Refresh access token | No |
| POST | `/logout` | Invalidate refresh token | Yes |
| GET | `/me` | Get current user profile | Yes |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |
| PUT | `/settings` | Update user settings | Yes |
| GET | `/categories` | Get location categories | Yes |
| POST | `/categories` | Create location category | Yes |

### Trips (`/api/trips`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List all trips | Yes |
| POST | `/` | Create new trip | Yes |
| GET | `/:id` | Get trip details | Yes |
| PUT | `/:id` | Update trip | Yes |
| DELETE | `/:id` | Delete trip | Yes |
| POST | `/:id/duplicate` | Clone a trip | Yes |
| GET | `/:id/timeline` | Get trip timeline | Yes |

### Locations (`/api/trips/:tripId/locations`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List locations | Yes |
| POST | `/` | Create location | Yes |
| GET | `/:id` | Get location | Yes |
| PUT | `/:id` | Update location | Yes |
| DELETE | `/:id` | Delete location | Yes |

### Photos (`/api/trips/:tripId/photos`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List photos | Yes |
| POST | `/upload` | Upload photo | Yes |
| POST | `/batch-upload` | Upload multiple photos | Yes |
| GET | `/:id` | Get photo | Yes |
| PUT | `/:id` | Update photo | Yes |
| DELETE | `/:id` | Delete photo | Yes |
| POST | `/import-immich` | Import from Immich | Yes |

### Photo Albums (`/api/trips/:tripId/albums`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List albums | Yes |
| POST | `/` | Create album | Yes |
| GET | `/:id` | Get album with photos | Yes |
| PUT | `/:id` | Update album | Yes |
| DELETE | `/:id` | Delete album | Yes |
| POST | `/:id/photos` | Add photos to album | Yes |
| DELETE | `/:id/photos/:photoId` | Remove photo from album | Yes |

### Activities (`/api/trips/:tripId/activities`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List activities | Yes |
| POST | `/` | Create activity | Yes |
| GET | `/:id` | Get activity | Yes |
| PUT | `/:id` | Update activity | Yes |
| DELETE | `/:id` | Delete activity | Yes |

### Transportation (`/api/trips/:tripId/transportation`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List transportation | Yes |
| POST | `/` | Create transportation | Yes |
| GET | `/:id` | Get transportation | Yes |
| PUT | `/:id` | Update transportation | Yes |
| DELETE | `/:id` | Delete transportation | Yes |

### Lodging (`/api/trips/:tripId/lodging`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List lodging | Yes |
| POST | `/` | Create lodging | Yes |
| GET | `/:id` | Get lodging | Yes |
| PUT | `/:id` | Update lodging | Yes |
| DELETE | `/:id` | Delete lodging | Yes |

### Journal Entries (`/api/trips/:tripId/journal`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List journal entries | Yes |
| POST | `/` | Create journal entry | Yes |
| GET | `/:id` | Get journal entry | Yes |
| PUT | `/:id` | Update journal entry | Yes |
| DELETE | `/:id` | Delete journal entry | Yes |

### Entity Links (`/api/trips/:tripId/entity-links`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all links for trip | Yes |
| POST | `/` | Create entity link | Yes |
| POST | `/bulk` | Create multiple links | Yes |
| DELETE | `/:id` | Delete link | Yes |
| GET | `/entity/:type/:id` | Get links for entity | Yes |
| GET | `/summary` | Get link summary | Yes |

### Tags (`/api/tags`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List user's tags | Yes |
| POST | `/` | Create tag | Yes |
| PUT | `/:id` | Update tag | Yes |
| DELETE | `/:id` | Delete tag | Yes |

### Companions (`/api/companions`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List companions | Yes |
| POST | `/` | Create companion | Yes |
| PUT | `/:id` | Update companion | Yes |
| DELETE | `/:id` | Delete companion | Yes |

### Checklists (`/api/checklists`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List checklists | Yes |
| POST | `/` | Create checklist | Yes |
| GET | `/:id` | Get checklist | Yes |
| PUT | `/:id` | Update checklist | Yes |
| DELETE | `/:id` | Delete checklist | Yes |
| POST | `/:id/items` | Add item | Yes |
| PUT | `/:id/items/:itemId` | Update item | Yes |
| DELETE | `/:id/items/:itemId` | Delete item | Yes |

### Search (`/api/search`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Global search | Yes |
| GET | `/suggestions` | Search suggestions | Yes |

### Collaboration (`/api/trips/:tripId/collaboration`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/collaborators` | List collaborators | Yes |
| POST | `/invite` | Send invitation | Yes |
| GET | `/invitations` | List invitations | Yes |
| POST | `/invitations/:token/accept` | Accept invitation | Yes |
| POST | `/invitations/:token/decline` | Decline invitation | Yes |
| DELETE | `/collaborators/:userId` | Remove collaborator | Yes |

### Immich Integration (`/api/immich`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/test` | Test Immich connection | Yes |
| GET | `/albums` | List Immich albums | Yes |
| GET | `/albums/:id/assets` | Get album assets | Yes |
| GET | `/assets/search` | Search Immich assets | Yes |

### Weather (`/api/weather`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/forecast` | Get weather forecast | Yes |
| GET | `/historical` | Get historical weather | Yes |

### Backup & Restore (`/api/backup`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/export` | Export all user data | Yes |
| POST | `/import` | Import backup data | Yes |

## Response Format

All responses follow this structure:

```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "Optional message"
}
```

### Success Response

```json
{
  "status": "success",
  "data": {
    "trip": {
      "id": 1,
      "title": "Japan 2024",
      ...
    }
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Trip not found",
  "code": "NOT_FOUND"
}
```

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
| 500 | Internal Server Error |

## Pagination

List endpoints support pagination:

```
GET /api/trips?skip=0&take=20
```

Response includes pagination metadata:

```json
{
  "status": "success",
  "data": {
    "trips": [...],
    "total": 50,
    "hasMore": true
  }
}
```

## Filtering

Many endpoints support filtering via query parameters:

```
GET /api/trips?status=completed&tag=vacation
GET /api/trips/:id/photos?locationId=5
```

## File Uploads

Photo uploads use `multipart/form-data`:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "photo=@/path/to/image.jpg" \
  -F "caption=My photo" \
  http://localhost:5000/api/trips/1/photos/upload
```

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Upload endpoints: 20 requests/minute
- Search endpoints: 30 requests/minute

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:5000/api-docs
```

## Related Documentation

- [Backend Architecture](../architecture/BACKEND_ARCHITECTURE.md) - Server-side implementation details
- [Database Schema](../architecture/DATABASE_SCHEMA.md) - Data model reference
