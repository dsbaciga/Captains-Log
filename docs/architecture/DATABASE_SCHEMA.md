# Database Schema Reference

Travel Life uses PostgreSQL with PostGIS extension for geospatial data. The schema is managed via Prisma ORM.

The schema defines **32 models** (mapped to **32 tables**) and **8 enums**.

## Schema Location

```text
backend/prisma/schema.prisma
```

## Entity Relationship Diagram

```text
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
│Location│   │ Photo  │   │Activity│  │TripTag     │         │Trip        │
│        │   │        │   │        │  │Assignment  │         │Companion   │
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
| type | String | custom, airports, countries, cities, us_states |
| isDefault | Boolean | System-generated list |
| sortOrder | Int | Display order |

### ChecklistItem

Individual items within a checklist.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| checklistId | Int | Checklist foreign key |
| name | String | Item name |
| description | String? | Item description |
| isChecked | Boolean | Completion state |
| isDefault | Boolean | Pre-populated item flag |
| sortOrder | Int | Display order |
| metadata | Json? | Extra info (airport code, country code, etc.) |
| checkedAt | DateTime? | When the item was checked |

## Trip Organization Models

### TripSeries

Groups related trips together (e.g. an annual trip, a multi-leg journey).

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | Owner foreign key |
| name | String | Series name |
| description | String? | Series description |

Trips reference a series via `Trip.seriesId` / `Trip.seriesOrder`.

### TripCollaborator

Grants another registered user access to a trip.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| userId | Int | Collaborator user foreign key |
| permissionLevel | String | view, edit, admin |

Unique on `(tripId, userId)`.

### TripInvitation

A pending email invitation to collaborate on a specific trip.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| invitedByUserId | Int | Inviting user foreign key |
| email | String | Invitee email address |
| permissionLevel | String | view, edit, admin |
| token | String | Unique token used to accept the invitation |
| status | String | pending, accepted, declined, expired |
| message | String? | Optional personal message |
| expiresAt | DateTime | Expiration timestamp |
| respondedAt | DateTime? | When the invitation was answered |

### UserInvitation

Invites a person to register for the Travel Life application itself (account-level, not trip-level).

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| invitedByUserId | Int? | Inviting user (null for system invites) |
| email | String | Invitee email address |
| token | String | Unique token used to accept the invitation |
| status | UserInvitationStatus | PENDING, ACCEPTED, DECLINED, EXPIRED |
| message | String? | Optional personal message |
| expiresAt | DateTime | Expiration timestamp |
| respondedAt | DateTime? | When the invitation was answered |
| acceptedUserId | Int? | User who accepted (set after registration) |

### LocationCategory

Categories used to classify locations. System defaults have a null `userId`.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int? | Owner foreign key (null for system defaults) |
| name | String | Category name |
| icon | String? | Icon identifier |
| color | String? | Hex color code |
| isDefault | Boolean | System default category flag |

Referenced by `Location.categoryId`.

## Media and Content Models

### PhotoAlbumAssignment

Junction table assigning photos to albums (many-to-many).

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| albumId | Int | Album foreign key |
| photoId | Int | Photo foreign key |
| sortOrder | Int | Order within the album |

Unique on `(albumId, photoId)`.

### WeatherData

Cached weather information for a trip (optionally tied to a location/date).

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| locationId | Int? | Location foreign key |
| date | Date | Weather date |
| temperatureHigh | Decimal? | High temperature |
| temperatureLow | Decimal? | Low temperature |
| conditions | String? | Conditions description |
| precipitation | Decimal? | Precipitation amount |
| humidity | Int? | Humidity percentage |
| windSpeed | Decimal? | Wind speed |
| sunrise | DateTime? | Sunrise time |
| sunset | DateTime? | Sunset time |
| fetchedAt | DateTime | When data was fetched |

### FlightTracking

Live flight status data linked one-to-one to a Transportation record.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| transportationId | Int | Transportation foreign key (unique) |
| flightNumber | String? | Flight number |
| airlineCode | String? | Airline code |
| status | String? | scheduled, active, landed, cancelled, diverted |
| gate | String? | Gate |
| terminal | String? | Terminal |
| baggageClaim | String? | Baggage claim area |
| departureDelay | Int? | Departure delay (minutes) |
| arrivalDelay | Int? | Arrival delay (minutes) |
| scheduledDeparture | DateTime? | Scheduled departure |
| actualDeparture | DateTime? | Actual departure |
| scheduledArrival | DateTime? | Scheduled arrival |
| actualArrival | DateTime? | Actual arrival |
| lastUpdatedAt | DateTime | Last status refresh |

## Travel Documents and Languages

### TravelDocument

Stores user travel documents (passports, visas, etc.).

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | Owner foreign key |
| type | TravelDocumentType | PASSPORT, VISA, ID_CARD, GLOBAL_ENTRY, VACCINATION |
| issuingCountry | String | Issuing country |
| documentNumber | String? | Document number |
| issueDate | Date? | Issue date |
| expiryDate | Date? | Expiry date |
| name | String | Name on document or descriptive name |
| notes | String? | Notes |
| isPrimary | Boolean | Primary document flag |
| alertDaysBefore | Int | Days before expiry to alert (default 180) |

### VisaRequirement

Static reference data for visa requirements between countries.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| passportCountry | String | Passport-holder country |
| destinationCountry | String | Destination country |
| visaRequired | Boolean | Whether a visa is required |
| visaType | String | visa_free, visa_on_arrival, e_visa, visa_required |
| maxStayDays | Int? | Maximum stay length |
| notes | String? | Notes |
| sourceUrl | String? | Source reference URL |
| lastVerified | Date? | When the data was last verified |

Unique on `(passportCountry, destinationCountry)`.

### TripLanguage

Languages selected for a trip (used for phrase lookup).

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| languageCode | String | ISO language code |
| language | String | Language display name |

Unique on `(tripId, languageCode)`.

### LanguagePhrase

Reference bank of common travel phrases per language.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| language | String | Language display name |
| languageCode | String | ISO language code |
| category | String | greetings, directions, food, emergency, etc. |
| english | String | English phrase |
| translation | String | Translated phrase |
| pronunciation | String? | Pronunciation guide |
| notes | String? | Notes |
| sortOrder | Int | Display order |

## Validation and Caching Models

### DismissedValidationIssue

Records trip-health-check issues a user has dismissed so they no longer affect trip status.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Trip foreign key |
| issueType | String | Issue type identifier |
| issueKey | String | Unique key for a specific issue instance |
| category | ValidationIssueCategory | Issue category |
| dismissedAt | DateTime | When the issue was dismissed |

Unique on `(tripId, issueType, issueKey)`.

### RouteCache

Caches calculated routes (distance/duration) from OpenRouteService to avoid repeat API calls.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| fromLat / fromLon | Decimal | Origin coordinates |
| toLat / toLon | Decimal | Destination coordinates |
| distance | Decimal | Route distance (km) |
| duration | Decimal | Route duration (minutes) |
| profile | String | driving-car, cycling-regular, foot-walking |
| routeGeometry | Json? | Route polyline coordinates |

Unique on `(fromLat, fromLon, toLat, toLon, profile)`.

## PDF + AI Import Models

These models power the PDF + AI import system: a user uploads a PDF (e.g. a
booking confirmation), it is parsed by an LLM into candidate entities, and the
user reviews those candidates before they are committed into a trip.

### PdfImport

Represents a single uploaded PDF file and its parsing lifecycle.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | Owner foreign key |
| originalName | String | Original uploaded file name |
| storedPath | String | Path to the stored file |
| fileSizeBytes | Int | File size in bytes |
| status | PdfImportStatus | UPLOADED, PARSING, PARSED, PARSE_FAILED, NO_ENTITIES |
| errorMessage | String? | Error detail if parsing failed |
| processedAt | DateTime? | When parsing completed |

### PendingEntity

A candidate entity extracted from a `PdfImport` by the AI parser, awaiting user review.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| pdfImportId | Int | Parent PdfImport foreign key |
| userId | Int | Owner foreign key |
| entityType | PendingEntityType | TRANSPORTATION, LODGING, ACTIVITY, LOCATION |
| parsedData | Json | Raw parsed entity data |
| confidence | Float | Parser confidence score (default 0.8) |
| matchedTripId | Int? | Trip the entity was matched to |
| status | PendingEntityStatus | PENDING, ACCEPTED, REJECTED |
| createdEntityId | Int? | ID of the real entity created on acceptance |
| createdEntityType | PendingEntityType? | Type of the created entity |
| reviewedAt | DateTime? | When the user reviewed the candidate |

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

8 values:

```text
PHOTO, LOCATION, ACTIVITY, LODGING, TRANSPORTATION, JOURNAL_ENTRY, PHOTO_ALBUM, PDF_IMPORT
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

```text
Photo (id=5) --TAKEN_AT--> Location (id=12)
Activity (id=3) --OCCURRED_AT--> Location (id=8)
Album (id=2) --FEATURED_IN--> Location (id=15)
```

## Other Enums

The schema defines 8 enums in total. Besides `EntityType` and `LinkRelationship`
(documented above), the remaining 6 are:

### PdfImportStatus

Lifecycle status of a `PdfImport` record.

| Value | Meaning |
|-------|---------|
| UPLOADED | File uploaded, not yet parsed |
| PARSING | Parsing in progress |
| PARSED | Parsing completed successfully |
| PARSE_FAILED | Parsing failed |
| NO_ENTITIES | Parsed, but no entities were found |

### PendingEntityType

Type of entity a `PendingEntity` represents (and may become on acceptance).

| Value |
|-------|
| TRANSPORTATION |
| LODGING |
| ACTIVITY |
| LOCATION |

### PendingEntityStatus

Review state of a `PendingEntity`.

| Value | Meaning |
|-------|---------|
| PENDING | Awaiting user review |
| ACCEPTED | Approved and committed to a trip |
| REJECTED | Discarded by the user |

### ValidationIssueCategory

Category for a `DismissedValidationIssue` (trip health check).

| Value | Meaning |
|-------|---------|
| SCHEDULE | Timeline conflicts, impossible travel times |
| ACCOMMODATIONS | Missing lodging |
| TRANSPORTATION | Gaps, tight connections |
| COMPLETENESS | Missing info (lower priority) |
| DOCUMENTS | Passport validity, visa requirements |

### TravelDocumentType

Type of a `TravelDocument`.

| Value |
|-------|
| PASSPORT |
| VISA |
| ID_CARD |
| GLOBAL_ENTRY |
| VACCINATION |

### UserInvitationStatus

Status of a `UserInvitation` (application-level invite).

| Value | Meaning |
|-------|---------|
| PENDING | Awaiting acceptance |
| ACCEPTED | Invitee registered |
| DECLINED | Invitation declined |
| EXPIRED | Invitation expired |

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
