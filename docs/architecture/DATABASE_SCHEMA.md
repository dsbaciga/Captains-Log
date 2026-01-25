# Database Schema Reference

Travel Life uses PostgreSQL with PostGIS extension for geospatial data. The schema is managed via Prisma ORM.

## Schema Location

```
backend/prisma/schema.prisma
```

## Entity Relationship Diagram

```
                                    ┌─────────────────┐
                                    │      User       │
                                    │─────────────────│
                                    │ id              │
                                    │ username        │
                                    │ email           │
                                    │ passwordHash    │
                                    │ timezone        │
                                    │ settings...     │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
          ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
          │     Trip        │      │    TripTag      │      │TravelCompanion  │
          │─────────────────│      │─────────────────│      │─────────────────│
          │ id              │      │ id              │      │ id              │
          │ title           │      │ name            │      │ name            │
          │ status          │      │ color           │      │ relationship    │
          │ dates           │      └────────┬────────┘      └────────┬────────┘
          └────────┬────────┘               │                        │
                   │                        │                        │
    ┌──────────────┼──────────────┐         │                        │
    │              │              │         │                        │
    ▼              ▼              ▼         ▼                        ▼
┌────────┐   ┌────────┐   ┌────────┐  ┌────────────┐         ┌────────────┐
│Location│   │ Photo  │   │Activity│  │TagAssign   │         │TripCompan  │
│        │   │        │   │        │  │ment        │         │ion         │
│        │   │        │   │        │  └────────────┘         └────────────┘
│        │   │        │   │        │
└────┬───┘   └────┬───┘   └────┬───┘
     │            │            │
     │            │            │
     └────────────┼────────────┘
                  │
                  ▼
          ┌─────────────────┐
          │   EntityLink    │◄────── Universal linking system
          │─────────────────│
          │ sourceType      │
          │ sourceId        │
          │ targetType      │
          │ targetId        │
          │ relationship    │
          └─────────────────┘
```

## Core Models

### User

Primary user account model with authentication and settings.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| username | String | Unique username |
| email | String | Unique email address |
| passwordHash | String | Bcrypt hashed password |
| timezone | String? | User's home timezone (default: UTC) |
| activityCategories | Json | Custom activity category list |
| immichApiUrl | String? | Immich server URL |
| immichApiKey | String? | Immich API key |
| weatherApiKey | String? | OpenWeatherMap API key |
| aviationstackApiKey | String? | Flight tracking API key |
| openrouteserviceApiKey | String? | Road routing API key |
| createdAt | DateTime | Account creation timestamp |

### Trip

Central entity representing a travel trip.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | Owner foreign key |
| title | String | Trip title |
| description | String? | Trip description |
| startDate | Date? | Trip start date |
| endDate | Date? | Trip end date |
| timezone | String? | Trip timezone |
| status | String | Dream, Planning, Planned, In Progress, Completed, Cancelled |
| privacyLevel | String | Private, Shared, Public |
| coverPhotoId | Int? | Cover photo foreign key |
| bannerPhotoId | Int? | Banner photo foreign key |
| addToPlacesVisited | Boolean | Include in visited places map |

**Status Values:**
- `Dream` - Wishlist trip
- `Planning` - Actively planning
- `Planned` - Fully planned, not started
- `In Progress` - Currently traveling
- `Completed` - Trip finished
- `Cancelled` - Trip cancelled

### Location

Points of interest within a trip.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| parentId | Int? | Parent location (for nested locations) |
| name | String | Location name |
| address | String? | Full address |
| latitude | Decimal(10,8)? | Latitude coordinate |
| longitude | Decimal(11,8)? | Longitude coordinate |
| categoryId | Int? | Location category foreign key |
| visitDatetime | DateTime? | Planned/actual visit time |
| visitDurationMinutes | Int? | Expected duration |
| notes | String? | Notes |
| coordinates | Geography? | PostGIS point (auto-generated) |

### Photo

Photos associated with trips. Supports local uploads and Immich integration.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| source | String | 'local' or 'immich' |
| mediaType | String | 'image' or 'video' |
| immichAssetId | String? | Immich asset ID (if from Immich) |
| localPath | String? | Local file path |
| thumbnailPath | String? | Thumbnail file path |
| duration | Int? | Video duration in seconds |
| caption | String? | Photo caption |
| latitude | Decimal(10,8)? | EXIF latitude |
| longitude | Decimal(11,8)? | EXIF longitude |
| takenAt | DateTime? | EXIF timestamp |

### Activity

Planned or completed activities.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| parentId | Int? | Parent activity (for sub-activities) |
| name | String | Activity name |
| description | String? | Description |
| category | String? | Category (sightseeing, dining, etc.) |
| allDay | Boolean | All-day event flag |
| startTime | DateTime? | Start time |
| endTime | DateTime? | End time |
| timezone | String? | Activity timezone |
| cost | Decimal(10,2)? | Cost |
| currency | String? | Currency code (USD, EUR, etc.) |
| bookingUrl | String? | Booking URL |
| bookingReference | String? | Confirmation number |
| manualOrder | Int? | Custom sort order |

### Transportation

Travel between locations (flights, trains, etc.).

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| type | String | Flight, Train, Bus, Ferry, Car, etc. |
| startLocationId | Int? | Start location foreign key |
| startLocationText | String? | Start location (text fallback) |
| endLocationId | Int? | End location foreign key |
| endLocationText | String? | End location (text fallback) |
| scheduledStart | DateTime? | Scheduled departure |
| scheduledEnd | DateTime? | Scheduled arrival |
| startTimezone | String? | Departure timezone |
| endTimezone | String? | Arrival timezone |
| actualStart | DateTime? | Actual departure |
| actualEnd | DateTime? | Actual arrival |
| company | String? | Carrier/company name |
| referenceNumber | String? | Flight/train number |
| seatNumber | String? | Seat assignment |
| cost | Decimal(10,2)? | Cost |
| status | String | on_time, delayed, cancelled |
| connectionGroupId | String? | Groups connected segments |
| calculatedDistance | Decimal? | Route distance (km) |
| calculatedDuration | Decimal? | Route duration (minutes) |
| distanceSource | String? | 'route' or 'haversine' |

### Lodging

Accommodations during trips.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| type | String | Hotel, Airbnb, Hostel, Camping, etc. |
| name | String | Property name |
| address | String? | Address |
| checkInDate | DateTime | Check-in date |
| checkOutDate | DateTime | Check-out date |
| timezone | String? | Property timezone |
| confirmationNumber | String? | Booking confirmation |
| bookingUrl | String? | Booking URL |
| cost | Decimal(10,2)? | Total cost |
| currency | String? | Currency code |
| notes | String? | Notes |

### JournalEntry

Trip journals and daily entries.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| date | Date? | Entry date (null for trip-level) |
| title | String? | Entry title |
| content | String | Entry content (rich text) |
| entryType | String | 'trip' or 'daily' |
| mood | String? | Mood indicator |
| weatherNotes | String? | Weather description |

## Supporting Models

### PhotoAlbum

Organize photos into albums.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| name | String | Album name |
| description | String? | Description |
| coverPhotoId | Int? | Cover photo foreign key |

### TripTag

User-defined tags for categorizing trips.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | User foreign key |
| name | String | Tag name |
| color | String? | Background color (hex) |
| textColor | String? | Text color (hex) |

### TravelCompanion

People who travel with the user.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | User foreign key |
| name | String | Companion name |
| email | String? | Email address |
| phone | String? | Phone number |
| relationship | String? | Relationship (friend, spouse, etc.) |
| isMyself | Boolean | Represents the user themselves |

### Checklist

Pre-trip and travel checklists.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | User foreign key |
| tripId | Int? | Associated trip (null for global) |
| name | String | Checklist name |
| type | String | custom, airports, countries, cities |
| isDefault | Boolean | System-generated list |

## Entity Linking System

The `EntityLink` model provides a polymorphic linking system for connecting any entity to any other entity within a trip.

### EntityLink

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| sourceType | EntityType | Source entity type |
| sourceId | Int | Source entity ID |
| targetType | EntityType | Target entity type |
| targetId | Int | Target entity ID |
| relationship | LinkRelationship | Type of relationship |
| sortOrder | Int? | Custom ordering |
| notes | String? | Link notes |

### EntityType Enum

```
PHOTO, LOCATION, ACTIVITY, LODGING, TRANSPORTATION, JOURNAL_ENTRY, PHOTO_ALBUM
```

### LinkRelationship Enum

| Value | Use Case |
|-------|----------|
| RELATED | Generic relationship |
| TAKEN_AT | Photo taken at location |
| OCCURRED_AT | Activity at location |
| PART_OF | Sub-activity, nested item |
| DOCUMENTS | Journal documents entity |
| FEATURED_IN | Photo in album/journal |

### Example Links

```
Photo (id=5) --TAKEN_AT--> Location (id=12)
Activity (id=3) --OCCURRED_AT--> Location (id=8)
Album (id=2) --FEATURED_IN--> Location (id=15)
```

## Indexes

Key indexes for performance:

| Table | Index | Purpose |
|-------|-------|---------|
| trips | (userId, status) | Dashboard filtering |
| trips | (startDate, endDate) | Date range queries |
| locations | (tripId) | Trip location listing |
| locations | coordinates (GIST) | Geospatial queries |
| photos | (tripId, takenAt) | Chronological photo listing |
| entity_links | (tripId, sourceType, sourceId) | Forward link queries |
| entity_links | (tripId, targetType, targetId) | Reverse link queries |
| transportation | (connectionGroupId) | Grouped connections |

## Cascade Deletes

Deleting a trip automatically deletes:
- All locations, photos, activities, transportation, lodging
- All journal entries and photo albums
- All entity links within the trip
- Tag and companion assignments (not the tags/companions themselves)

## Coordinate Precision

- **Latitude**: Decimal(10,8) - Range: -90 to 90
- **Longitude**: Decimal(11,8) - Range: -180 to 180

This provides ~1.1mm precision, more than sufficient for travel applications.

## PostGIS Usage

The `coordinates` field on Location and Photo uses PostGIS Geography type for:
- Efficient spatial indexing
- Distance calculations
- Proximity queries

```sql
-- Example: Find locations within 10km of a point
SELECT * FROM locations
WHERE ST_DWithin(
  coordinates,
  ST_GeogFromText('POINT(-122.4194 37.7749)'),
  10000
);
```

## Database Management

### Generate Prisma Client

```bash
cd backend
npx prisma generate
```

### Create Migration

```bash
npx prisma migrate dev --name descriptive_name
```

### Apply Migrations (Production)

```bash
npx prisma migrate deploy
```

### View Schema Visually

```bash
npx prisma studio
```

Opens GUI at http://localhost:5555

## Related Documentation

- [Backend Architecture](BACKEND_ARCHITECTURE.md) - Service layer patterns
- [API Reference](../api/README.md) - REST endpoint documentation
