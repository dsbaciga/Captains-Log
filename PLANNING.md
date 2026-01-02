# Travel Life - Travel Documentation Application
## Complete Planning Document

---

## Project Overview

**Travel Life** is a comprehensive multi-user web application for documenting travels with rich location data, media integration, transportation tracking, and journal capabilities.

### Tech Stack
- **Frontend**: React with TypeScript, Material-UI/Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with PostGIS extension
- **Deployment**: Docker Compose
- **Maps**: OpenStreetMap with self-hosted Nominatim for geocoding
- **Photo Integration**: Immich API + local filesystem storage
- **Weather API**: OpenWeatherMap
- **Flight Tracking**: AviationStack

---

## Core Features Summary

1. **User Management** - Multi-user with authentication, privacy controls
2. **Trip Management** - Create/manage trips with multiple destinations, statuses, tags
3. **Location Management** - POIs with custom categories, visit duration, routes
4. **Photo Management** - Immich integration, albums, bulk upload, geotagging
5. **Transportation Tracking** - Multiple types, booking details, status, connections, routes
6. **Lodging Management** - Multiple lodgings per trip, booking details
7. **Journal Entries** - Trip-level and daily journals with mood/weather tracking
8. **Places Visited Map** - Aggregate view of all visited locations
9. **Search & Discovery** - Global search, advanced filtering, travel companions
10. **Dashboard & Analytics** - Travel statistics and visualizations
11. **Weather Integration** - Historical and forecast weather data
12. **Flight Tracking** - Real-time flight status updates
13. **Import/Export** - XML format, print-friendly reports

---

## Detailed Feature Specifications

### 1. User Management & Authentication

#### Features
- User registration with email/password
- JWT-based authentication with refresh tokens
- User profiles (name, email, avatar)
- Privacy controls for trips
- Permission system for shared trips (view-only, edit, admin)

#### User Roles
- Standard User (default)
- Future: Admin role for system management

---

### 2. Trip Management

#### Trip Attributes
- **Basic Info**: Title, description
- **Dates**: Start date, end date (trips can overlap)
- **Status**:
  - Dream (bucket list items)
  - Planning (actively planning)
  - Planned (fully planned and booked)
  - In Progress (currently on trip)
  - Completed (trip finished)
  - Cancelled (trip was cancelled)
- **Privacy**: Private, Shared (with specific users), Public
- **Media**: Banner photo, cover photo
- **Tags**: User-customizable tags (e.g., "honeymoon", "adventure", "business")
- **Companions**: Travel companions for the trip
- **Places Visited**: Boolean flag to include in "Places I've Visited" map
  - Automatically set to true when status changed to "Completed"
  - User can manually override

#### Trip Views
- List view (sortable/filterable)
- Timeline view (chronological)
- Map view (all trip locations)
- Calendar view (trip dates on calendar)

#### Trip Operations
- Create, read, update, delete
- Duplicate trip (optional future feature)
- Share with other users
- Export to XML
- Import from XML
- Print-friendly report

---

### 3. Location Management

#### Location Attributes
- Name
- Address
- Coordinates (latitude, longitude)
- Category (user-defined, customizable)
- Visit date/time
- Visit duration (in minutes)
- Notes
- Associated photos

#### Location Categories
- System defaults: Restaurant, Museum, Hotel, Landmark, Park, Beach, etc.
- User-defined: Custom categories with names, icons, colors
- Category management UI

#### Location Features
- Add/edit/delete locations
- Associate with trips
- Display on map with custom category markers
- Route visualization between locations
- Geocoding via self-hosted Nominatim
- Reverse geocoding (coordinates to address)

---

### 4. Photo Management

#### Photo Sources
1. **Immich Integration**
   - Connect to user's Immich instance
   - Browse and link photos without uploading
   - Reference photos via Immich API
   - Sync metadata (geotags, dates)

2. **Direct Upload**
   - Upload photos directly (max 50MB per photo)
   - Store on local filesystem
   - Bulk upload support (drag-and-drop multiple files)

#### Photo Attributes
- Caption/description
- Date taken (from EXIF or manual)
- Geotag (latitude, longitude from EXIF or manual)
- Associated trip
- Associated location
- Album assignment

#### Photo Features
- Photo albums within trips
- Set trip banner photo
- Gallery view (grid layout)
- Timeline view (chronological)
- Lightbox viewer
- Automatic thumbnail generation
- EXIF data extraction for geotagging

---

### 5. Transportation Tracking

#### Transportation Types
- Flight
- Train
- Bus
- Ferry
- Car Rental
- Subway/Metro
- Cable Car
- Walking

#### Transportation Attributes
- Type
- Start location (can reference location or free text)
- End location (can reference location or free text)
- Scheduled start date/time
- Scheduled end date/time
- Actual start date/time (if different)
- Actual end date/time (if different)
- Company/Airline name
- Flight/Train/Bus number
- Seat number
- Booking reference/confirmation number
- Booking URL
- Cost
- Currency
- Status: On-time, Delayed, Cancelled
- Delay duration (minutes)
- Notes
- Route geometry (PostGIS LineString)
- Connection group (for linked segments)
- Auto-generated flag (for walking routes)

#### Transportation Features
- Add/edit/delete transportation
- Display in timeline
- Visualize routes on map
- Group connected segments (multi-leg journeys)
- Auto-suggest walking routes between nearby locations
- Flight tracking integration (AviationStack API)
  - Real-time status updates
  - Gate information
  - Delay notifications

---

### 6. Lodging Management

#### Lodging Attributes
- Name
- Address/location (can reference location)
- Check-in date/time
- Check-out date/time (must be within trip dates)
- Booking reference/confirmation number
- Booking URL
- Cost
- Currency
- Rating (1-5 stars, optional)
- Notes
- Associated photos

#### Lodging Features
- Add/edit/delete lodging
- Multiple lodgings per trip (overlaps allowed)
- Display on map with markers
- Date validation (within trip dates)
- Link to booking confirmations

---

### 7. Journal Entries

#### Journal Types
1. **Trip-level journals**: Overall trip reflections/notes
2. **Daily journals**: Specific to a date within the trip

#### Journal Attributes
- Title
- Content (rich text, WYSIWYG editor)
- Entry type (trip/daily)
- Date (for daily journals)
- Mood (happy, excited, tired, sad, neutral, etc.)
- Weather notes (free text)
- Associated photos
- Associated locations
- Created/updated timestamps

#### Journal Features
- WYSIWYG rich text editor (TipTap)
  - Bold, italic, underline
  - Headings, lists
  - Links
  - Image embedding
- Attach photos to entries
- Reference locations in entries
- View/edit/delete journals
- Export journals

---

### 8. Places Visited Map

#### Features
- Global map showing all visited locations from trips marked with "Add to Places Visited"
- Typically includes trips with status = "Completed" and add_to_places_visited = true
- Interactive map with markers for all visited locations
- Marker clustering for performance
- Color-coding options (by year, by trip, by country)
- Click marker to see trip details

#### Statistics
- Total trips completed
- Countries visited
- Cities visited
- Total distance traveled
- First trip date
- Most recent trip date
- Most visited destination

#### Views
- Map view (primary)
- List view of visited locations
- Filter by date range
- Filter by companion
- Filter by tags

---

### 9. Search & Discovery

#### Global Search
- Search across:
  - Trip titles and descriptions
  - Location names and notes
  - Journal entry content
  - Tags
  - Travel companions
- Real-time search results
- Results grouped by type

#### Advanced Filtering
- **By Status**: Dream, Planning, Planned, In Progress, Completed, Cancelled
- **By Date Range**: Start date, end date
- **By Tags**: Multiple tag selection
- **By Companion**: Filter by travel companion
- **By Privacy**: Private, Shared, Public
- **By Country/Region**: Geographic filtering
- **By Year**: Annual filtering

#### Travel Companions
- Create companion profiles (name, relationship optional)
- Assign companions to trips
- View trips by companion
- Filter and search by companion

---

### 10. Dashboard & Analytics

#### Dashboard Components
- **Trip Statistics Widget**
  - Total trips by status
  - Trips this year
  - Upcoming trips
  - Recent trips

- **Travel Statistics**
  - Countries visited
  - Cities visited
  - Total distance traveled
  - Total photos
  - Most visited destination

- **Recent Activity Feed**
  - Recent trip updates
  - Recent photos added
  - Recent journal entries

- **Travel Map**
  - Overview map with all trips
  - Quick navigation to trips

#### Year in Review
- Summary view for selected year
- Trips taken
- Places visited
- Photos taken
- Distance traveled
- Map of year's travels

---

### 11. Weather Integration

#### Weather Data
- Integration with OpenWeatherMap API
- Two modes:
  1. **Historical weather**: For completed trips (past dates)
  2. **Weather forecast**: For planned/in-progress trips (future dates)

#### Weather Attributes
- Date
- Temperature (high, low)
- Conditions (clear, cloudy, rain, snow, etc.)
- Precipitation
- Humidity
- Wind speed
- Associated trip/location

#### Weather Features
- Display weather widget on trip detail page
- Weather timeline across trip duration
- Manual refresh weather data
- Store fetched weather data to minimize API calls

---

### 12. Flight Tracking Integration

#### Flight Tracking Features
- Integration with AviationStack API
- Enable tracking for flight transportation entries
- Real-time flight status updates

#### Tracked Information
- Flight status (scheduled, active, landed, cancelled, diverted)
- Gate information
- Terminal
- Baggage claim
- Departure/arrival delays
- Actual departure/arrival times

#### Flight Tracking UI
- Flight status widget on transportation detail
- Status badge (on-time, delayed, cancelled)
- Manual refresh option
- Automatic periodic updates (configurable)

---

### 13. Import/Export

#### XML Export
- Export complete trip data to XML format
- Includes:
  - Trip metadata
  - All locations
  - All transportation
  - All lodging
  - All photos (references or base64 encoding)
  - All journal entries
  - Tags, companions
  - Weather data

#### XML Import
- Import trip from XML file
- Validate XML structure
- Handle conflicts (duplicate trips)
- Import options (merge vs replace)

#### Print-friendly Reports
- Generate printable trip itinerary
- Includes:
  - Trip overview
  - Day-by-day itinerary
  - Transportation schedule
  - Lodging details
  - Photos
  - Journal entries
  - Map overview
- PDF generation (optional future feature)

---

## Database Schema

### Tables Overview

1. **users** - User accounts
2. **trips** - Trip records
3. **trip_tags** - User-defined tags
4. **trip_tag_assignments** - Many-to-many: trips ↔ tags
5. **travel_companions** - Companion profiles
6. **trip_companions** - Many-to-many: trips ↔ companions
7. **trip_collaborators** - Shared trip permissions
8. **locations** - Points of interest
9. **location_categories** - Location categories (system + user)
10. **photos** - Photo records (Immich or uploaded)
11. **photo_albums** - Photo albums within trips
12. **photo_album_assignments** - Many-to-many: albums ↔ photos
13. **transportation** - Transportation entries
14. **lodging** - Lodging entries
15. **journal_entries** - Journal entries
16. **journal_photos** - Many-to-many: journals ↔ photos
17. **journal_locations** - Many-to-many: journals ↔ locations
18. **weather_data** - Cached weather information
19. **flight_tracking** - Flight tracking data

### Detailed Schema

#### users
```sql
id                SERIAL PRIMARY KEY
username          VARCHAR(255) UNIQUE NOT NULL
email             VARCHAR(255) UNIQUE NOT NULL
password_hash     VARCHAR(255) NOT NULL
avatar_url        VARCHAR(500)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

#### trips
```sql
id                      SERIAL PRIMARY KEY
user_id                 INTEGER REFERENCES users(id) ON DELETE CASCADE
title                   VARCHAR(500) NOT NULL
description             TEXT
start_date              DATE
end_date                DATE
status                  VARCHAR(50) NOT NULL -- Dream, Planning, Planned, In Progress, Completed, Cancelled
privacy_level           VARCHAR(50) NOT NULL -- Private, Shared, Public
cover_photo_id          INTEGER REFERENCES photos(id) ON DELETE SET NULL
banner_photo_id         INTEGER REFERENCES photos(id) ON DELETE SET NULL
add_to_places_visited   BOOLEAN DEFAULT FALSE
created_at              TIMESTAMP DEFAULT NOW()
updated_at              TIMESTAMP DEFAULT NOW()

CHECK (end_date >= start_date OR end_date IS NULL)
```

#### trip_tags
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
name        VARCHAR(255) NOT NULL
color       VARCHAR(7) -- Hex color code
created_at  TIMESTAMP DEFAULT NOW()

UNIQUE(user_id, name)
```

#### trip_tag_assignments
```sql
id          SERIAL PRIMARY KEY
trip_id     INTEGER REFERENCES trips(id) ON DELETE CASCADE
tag_id      INTEGER REFERENCES trip_tags(id) ON DELETE CASCADE
created_at  TIMESTAMP DEFAULT NOW()

UNIQUE(trip_id, tag_id)
```

#### travel_companions
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE
name            VARCHAR(255) NOT NULL
relationship    VARCHAR(255) -- e.g., "friend", "spouse", "family"
created_at      TIMESTAMP DEFAULT NOW()
```

#### trip_companions
```sql
id              SERIAL PRIMARY KEY
trip_id         INTEGER REFERENCES trips(id) ON DELETE CASCADE
companion_id    INTEGER REFERENCES travel_companions(id) ON DELETE CASCADE
created_at      TIMESTAMP DEFAULT NOW()

UNIQUE(trip_id, companion_id)
```

#### trip_collaborators
```sql
id                  SERIAL PRIMARY KEY
trip_id             INTEGER REFERENCES trips(id) ON DELETE CASCADE
user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE
permission_level    VARCHAR(50) NOT NULL -- view, edit, admin
created_at          TIMESTAMP DEFAULT NOW()

UNIQUE(trip_id, user_id)
```

#### locations
```sql
id                      SERIAL PRIMARY KEY
trip_id                 INTEGER REFERENCES trips(id) ON DELETE CASCADE
name                    VARCHAR(500) NOT NULL
address                 TEXT
latitude                DECIMAL(10, 8)
longitude               DECIMAL(11, 8)
coordinates             GEOGRAPHY(POINT, 4326) -- PostGIS
category_id             INTEGER REFERENCES location_categories(id) ON DELETE SET NULL
visit_datetime          TIMESTAMP
visit_duration_minutes  INTEGER
notes                   TEXT
created_at              TIMESTAMP DEFAULT NOW()
updated_at              TIMESTAMP DEFAULT NOW()
```

#### location_categories
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE -- NULL for system categories
name        VARCHAR(255) NOT NULL
icon        VARCHAR(100) -- Icon identifier
color       VARCHAR(7) -- Hex color code
is_default  BOOLEAN DEFAULT FALSE -- System default categories
created_at  TIMESTAMP DEFAULT NOW()
```

#### photos
```sql
id              SERIAL PRIMARY KEY
trip_id         INTEGER REFERENCES trips(id) ON DELETE CASCADE
location_id     INTEGER REFERENCES locations(id) ON DELETE SET NULL
immich_id       VARCHAR(255) -- Reference to Immich photo
file_path       VARCHAR(500) -- Local filesystem path (if uploaded)
caption         TEXT
latitude        DECIMAL(10, 8)
longitude       DECIMAL(11, 8)
coordinates     GEOGRAPHY(POINT, 4326) -- PostGIS
taken_at        TIMESTAMP
uploaded_at     TIMESTAMP DEFAULT NOW()
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()

CHECK (immich_id IS NOT NULL OR file_path IS NOT NULL)
```

#### photo_albums
```sql
id              SERIAL PRIMARY KEY
trip_id         INTEGER REFERENCES trips(id) ON DELETE CASCADE
name            VARCHAR(255) NOT NULL
description     TEXT
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### photo_album_assignments
```sql
id          SERIAL PRIMARY KEY
album_id    INTEGER REFERENCES photo_albums(id) ON DELETE CASCADE
photo_id    INTEGER REFERENCES photos(id) ON DELETE CASCADE
sort_order  INTEGER DEFAULT 0
created_at  TIMESTAMP DEFAULT NOW()

UNIQUE(album_id, photo_id)
```

#### transportation
```sql
id                      SERIAL PRIMARY KEY
trip_id                 INTEGER REFERENCES trips(id) ON DELETE CASCADE
type                    VARCHAR(50) NOT NULL -- Flight, Train, Bus, Ferry, Car Rental, Subway, Cable Car, Walking
start_location_id       INTEGER REFERENCES locations(id) ON DELETE SET NULL
start_location_text     VARCHAR(500)
end_location_id         INTEGER REFERENCES locations(id) ON DELETE SET NULL
end_location_text       VARCHAR(500)
scheduled_start         TIMESTAMP
scheduled_end           TIMESTAMP
actual_start            TIMESTAMP
actual_end              TIMESTAMP
company                 VARCHAR(255) -- Airline/Company name
reference_number        VARCHAR(255) -- Flight number, train number, etc.
seat_number             VARCHAR(50)
booking_reference       VARCHAR(255) -- Confirmation number
booking_url             VARCHAR(500)
cost                    DECIMAL(10, 2)
currency                VARCHAR(3) -- ISO currency code
status                  VARCHAR(50) DEFAULT 'on_time' -- on_time, delayed, cancelled
delay_minutes           INTEGER
notes                   TEXT
route_geometry          GEOGRAPHY(LINESTRING, 4326) -- PostGIS
connection_group_id     VARCHAR(100) -- Groups connected segments
is_auto_generated       BOOLEAN DEFAULT FALSE -- For auto-calculated walking routes
created_at              TIMESTAMP DEFAULT NOW()
updated_at              TIMESTAMP DEFAULT NOW()
```

#### lodging
```sql
id                  SERIAL PRIMARY KEY
trip_id             INTEGER REFERENCES trips(id) ON DELETE CASCADE
location_id         INTEGER REFERENCES locations(id) ON DELETE SET NULL
name                VARCHAR(500) NOT NULL
check_in            TIMESTAMP NOT NULL
check_out           TIMESTAMP NOT NULL
booking_reference   VARCHAR(255)
booking_url         VARCHAR(500)
cost                DECIMAL(10, 2)
currency            VARCHAR(3)
rating              INTEGER CHECK (rating >= 1 AND rating <= 5)
notes               TEXT
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()

CHECK (check_out > check_in)
```

#### journal_entries
```sql
id              SERIAL PRIMARY KEY
trip_id         INTEGER REFERENCES trips(id) ON DELETE CASCADE
date            DATE -- NULL for trip-level journals
title           VARCHAR(500)
content         TEXT NOT NULL
entry_type      VARCHAR(50) NOT NULL -- trip, daily
mood            VARCHAR(50) -- happy, excited, tired, sad, neutral, etc.
weather_notes   TEXT
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### journal_photos
```sql
id              SERIAL PRIMARY KEY
journal_id      INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE
photo_id        INTEGER REFERENCES photos(id) ON DELETE CASCADE
created_at      TIMESTAMP DEFAULT NOW()

UNIQUE(journal_id, photo_id)
```

#### journal_locations
```sql
id              SERIAL PRIMARY KEY
journal_id      INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE
location_id     INTEGER REFERENCES locations(id) ON DELETE CASCADE
created_at      TIMESTAMP DEFAULT NOW()

UNIQUE(journal_id, location_id)
```

#### weather_data
```sql
id                  SERIAL PRIMARY KEY
trip_id             INTEGER REFERENCES trips(id) ON DELETE CASCADE
location_id         INTEGER REFERENCES locations(id) ON DELETE SET NULL
date                DATE NOT NULL
temperature_high    DECIMAL(5, 2)
temperature_low     DECIMAL(5, 2)
conditions          VARCHAR(255) -- Description of weather
precipitation       DECIMAL(5, 2) -- mm or inches
humidity            INTEGER -- Percentage
wind_speed          DECIMAL(5, 2)
fetched_at          TIMESTAMP DEFAULT NOW()
created_at          TIMESTAMP DEFAULT NOW()
```

#### flight_tracking
```sql
id                  SERIAL PRIMARY KEY
transportation_id   INTEGER REFERENCES transportation(id) ON DELETE CASCADE
flight_number       VARCHAR(50)
airline_code        VARCHAR(10)
status              VARCHAR(50) -- scheduled, active, landed, cancelled, diverted
gate                VARCHAR(20)
terminal            VARCHAR(20)
baggage_claim       VARCHAR(20)
last_updated_at     TIMESTAMP DEFAULT NOW()
created_at          TIMESTAMP DEFAULT NOW()
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user account

### Trips
- `GET /api/trips` - List all trips (with filters: status, tags, companions, privacy, search)
- `POST /api/trips` - Create trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip
- `GET /api/trips/:id/timeline` - Get trip timeline (all events chronologically)
- `POST /api/trips/:id/share` - Share trip with users
- `DELETE /api/trips/:id/share/:userId` - Remove user from shared trip
- `GET /api/trips/:id/export` - Export trip to XML
- `POST /api/trips/import` - Import trip from XML

### Tags
- `GET /api/tags` - Get user's tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag
- `POST /api/trips/:tripId/tags` - Assign tag to trip
- `DELETE /api/trips/:tripId/tags/:tagId` - Remove tag from trip

### Travel Companions
- `GET /api/companions` - Get user's companions
- `POST /api/companions` - Create companion
- `PUT /api/companions/:id` - Update companion
- `DELETE /api/companions/:id` - Delete companion
- `POST /api/trips/:tripId/companions` - Add companion to trip
- `DELETE /api/trips/:tripId/companions/:companionId` - Remove companion from trip

### Locations
- `GET /api/trips/:tripId/locations` - List locations for trip
- `POST /api/trips/:tripId/locations` - Add location to trip
- `GET /api/locations/:id` - Get location details
- `PUT /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

### Location Categories
- `GET /api/locations/categories` - Get all categories (system + user)
- `POST /api/locations/categories` - Create custom category
- `PUT /api/locations/categories/:id` - Update category
- `DELETE /api/locations/categories/:id` - Delete category

### Photos
- `GET /api/trips/:tripId/photos` - List photos for trip
- `POST /api/trips/:tripId/photos` - Upload photo(s)
- `POST /api/trips/:tripId/photos/immich` - Link Immich photo
- `GET /api/photos/:id` - Get photo details
- `PUT /api/photos/:id` - Update photo metadata
- `DELETE /api/photos/:id` - Delete photo

### Photo Albums
- `GET /api/trips/:tripId/albums` - List albums for trip
- `POST /api/trips/:tripId/albums` - Create album
- `GET /api/albums/:id` - Get album details
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album
- `POST /api/albums/:id/photos` - Add photos to album
- `DELETE /api/albums/:id/photos/:photoId` - Remove photo from album
- `PUT /api/albums/:id/photos/reorder` - Reorder photos in album

### Transportation
- `GET /api/trips/:tripId/transportation` - List transportation for trip
- `POST /api/trips/:tripId/transportation` - Add transportation
- `GET /api/transportation/:id` - Get transportation details
- `PUT /api/transportation/:id` - Update transportation
- `DELETE /api/transportation/:id` - Delete transportation
- `GET /api/transportation/:id/route` - Get route geometry

### Lodging
- `GET /api/trips/:tripId/lodging` - List lodging for trip
- `POST /api/trips/:tripId/lodging` - Add lodging
- `GET /api/lodging/:id` - Get lodging details
- `PUT /api/lodging/:id` - Update lodging
- `DELETE /api/lodging/:id` - Delete lodging

### Journal Entries
- `GET /api/trips/:tripId/journals` - List journal entries for trip
- `POST /api/trips/:tripId/journals` - Create journal entry
- `GET /api/journals/:id` - Get journal entry
- `PUT /api/journals/:id` - Update journal entry
- `DELETE /api/journals/:id` - Delete journal entry

### Search
- `GET /api/search?q={query}&type={type}&filters={filters}` - Global search

### Dashboard
- `GET /api/user/dashboard` - Get dashboard statistics
- `GET /api/user/year-review/:year` - Get year in review data

### Places Visited
- `GET /api/user/places-visited` - Get all locations from visited trips
- `GET /api/user/places-visited/stats` - Get aggregate statistics
- `GET /api/user/places-visited/map-data` - Get optimized map data

### Weather
- `GET /api/trips/:tripId/weather` - Get weather data for trip
- `POST /api/trips/:tripId/weather/fetch` - Fetch weather data from OpenWeatherMap API
- `GET /api/weather/forecast?lat={lat}&lon={lon}&date={date}` - Get weather forecast

### Flight Tracking
- `POST /api/transportation/:id/track-flight` - Enable flight tracking
- `GET /api/transportation/:id/flight-status` - Get current flight status
- `POST /api/transportation/:id/refresh-flight` - Manually refresh flight data

### Geocoding (via self-hosted Nominatim)
- `GET /api/geocode/search?q={query}` - Search locations (geocoding)
- `GET /api/geocode/reverse?lat={lat}&lon={lon}` - Reverse geocode

### Routes
- `POST /api/routes` - Calculate route between points
- `POST /api/routes/walking` - Calculate walking route
- `POST /api/trips/:tripId/suggest-walking-routes` - Auto-suggest walking routes

---

## Frontend Component Architecture

### Pages
- **AuthPage** - Login/Register
- **DashboardPage** - Overview with statistics and recent activity
- **TripListPage** - List/Timeline/Map/Calendar views of trips
- **TripDetailPage** - Single trip detail with tabs
- **TripEditPage** - Create/Edit trip form
- **PlacesVisitedPage** - Global map of visited places
- **UserProfilePage** - User profile and settings
- **SettingsPage** - App settings

### Components by Feature

#### Layout
- `AppLayout` - Main app layout with navigation
- `Header` - Top navigation bar
- `Sidebar` - Side navigation menu
- `Footer` - Footer component

#### Authentication
- `LoginForm` - Login form
- `RegisterForm` - Registration form
- `ProtectedRoute` - Route guard for authenticated users

#### Trip Management
- `TripCard` - Trip preview card
- `TripList` - List of trip cards
- `TripTimeline` - Timeline view of trips
- `TripMap` - Map view component
- `TripCalendar` - Calendar view
- `TripForm` - Trip create/edit form
- `TripStats` - Trip statistics widget
- `TripDetailTabs` - Tabbed interface for trip details
- `TripSharingDialog` - Share trip modal

#### Tags
- `TagManager` - Manage user tags
- `TagSelector` - Multi-select tag picker
- `TagBadge` - Display tag chip/badge
- `TagFilter` - Filter by tags

#### Travel Companions
- `CompanionManager` - Manage companions
- `CompanionSelector` - Add companions to trip
- `CompanionList` - Display trip companions
- `CompanionFilter` - Filter trips by companion

#### Location Management
- `LocationList` - List of locations
- `LocationForm` - Add/edit location form
- `LocationCard` - Location display card
- `LocationMap` - Interactive map with markers
- `CategoryManager` - Manage location categories
- `CategorySelector` - Select category for location
- `RouteVisualization` - Show routes on map

#### Photo Management
- `PhotoGallery` - Grid view of photos
- `PhotoUpload` - Photo upload component
- `BulkPhotoUpload` - Drag-drop multiple files
- `ImmichIntegration` - Immich photo picker
- `PhotoViewer` - Lightbox photo viewer
- `PhotoTimeline` - Photos in chronological order
- `PhotoMetadataForm` - Edit photo metadata

#### Photo Albums
- `AlbumManager` - Create/edit albums
- `AlbumGallery` - Display album with photos
- `AlbumSelector` - Assign photos to albums
- `AlbumList` - List of albums

#### Transportation
- `TransportationList` - List of transportation entries
- `TransportationForm` - Add/edit transportation
- `TransportationCard` - Transportation display card
- `TransportationTimeline` - Visual timeline
- `RouteMap` - Show route on map
- `ConnectionGroupManager` - Group connected segments
- `WalkingRouteSuggester` - Suggest walking routes
- `TransportationStatus` - Status badge (on-time/delayed/cancelled)

#### Flight Tracking
- `FlightStatusWidget` - Real-time flight status
- `FlightTrackingSetup` - Enable tracking
- `FlightTimelineItem` - Flight in timeline with status

#### Lodging
- `LodgingList` - List of lodgings
- `LodgingForm` - Add/edit lodging
- `LodgingCard` - Lodging display card

#### Journal
- `JournalList` - List of journal entries
- `JournalEditor` - Rich text editor
- `JournalViewer` - Display journal entry
- `DailyJournal` - Day-specific journal
- `MoodSelector` - Pick mood for journal entry
- `WeatherNoteInput` - Weather notes field
- `RichTextEditor` - WYSIWYG editor component (TipTap)

#### Weather
- `WeatherWidget` - Display weather for trip/location
- `WeatherTimeline` - Weather across trip duration
- `WeatherFetcher` - Fetch weather data button

#### Dashboard
- `DashboardStats` - Statistics overview
- `TravelMap` - Map with all travel
- `RecentActivity` - Recent updates widget
- `YearInReview` - Annual summary view

#### Places Visited
- `PlacesVisitedMap` - Global map with all visited locations
- `PlacesVisitedStats` - Statistics widget
- `PlacesVisitedTimeline` - Chronological view
- `VisitedCountriesList` - List of countries/regions

#### Search
- `GlobalSearch` - Search bar with results
- `AdvancedFilterPanel` - Complex filtering UI
- `SearchResults` - Display search results by type

#### Shared/Common
- `MapComponent` - Reusable OpenStreetMap component
- `DateRangePicker` - Date range selector
- `LocationPicker` - Map-based location picker
- `ImageUploader` - Drag-drop image upload
- `FilterPanel` - Generic filter component
- `SearchBar` - Search functionality
- `ShareDialog` - Trip sharing modal
- `ExportDialog` - Export options modal
- `ConfirmDialog` - Confirmation modal
- `LoadingSpinner` - Loading indicator
- `ErrorBoundary` - Error handling component
- `Pagination` - Pagination component
- `SortControl` - Sorting controls

---

## Implementation Roadmap

### Phase 1: Foundation & MVP (4-6 weeks)

#### Week 1-2: Setup & Infrastructure
- [ ] Initialize project repository
- [ ] Set up Docker Compose configuration
  - PostgreSQL with PostGIS
  - Backend (Node.js)
  - Frontend (React)
  - Self-hosted Nominatim
- [ ] Initialize backend (Node.js + Express + TypeScript)
  - Project structure
  - Database connection (Prisma ORM)
  - Basic middleware (CORS, body-parser, error handling)
- [ ] Initialize frontend (React + TypeScript)
  - Project structure with Vite
  - UI framework setup (Material-UI or Tailwind)
  - React Router
  - State management (Redux Toolkit or Zustand)
- [ ] Database schema creation with migrations
- [ ] Basic CI/CD pipeline (GitHub Actions or GitLab CI)

#### Week 2-3: Authentication & User Management
- [ ] User registration and login endpoints
- [ ] JWT authentication with refresh tokens
- [ ] Password hashing (bcrypt)
- [ ] Protected route middleware (backend)
- [ ] Login/Register forms (frontend)
- [ ] Protected route guards (frontend)
- [ ] User profile page
- [ ] Authentication state management

#### Week 3-5: Basic Trip Management
- [ ] Trip CRUD endpoints
- [ ] Trip database operations
- [ ] Trip list page with cards
- [ ] Trip detail page (basic)
- [ ] Trip create/edit form
- [ ] Trip status dropdown
- [ ] Privacy level selector
- [ ] "Add to Places Visited" checkbox with auto-check logic
- [ ] Trip filtering by status
- [ ] Trip sorting

#### Week 5-6: Location Management
- [ ] Location CRUD endpoints
- [ ] OpenStreetMap integration (Leaflet)
- [ ] Self-hosted Nominatim setup in Docker
- [ ] Geocoding endpoints (search, reverse)
- [ ] Location form with map picker
- [ ] Location list for trip
- [ ] Map view with location markers
- [ ] Default location categories
- [ ] Location category management

---

### Phase 2: Core Features (6-8 weeks)

#### Week 7-8: Photo Management
- [ ] Photo upload endpoints (local filesystem)
- [ ] File storage structure
- [ ] Thumbnail generation (Sharp library)
- [ ] EXIF data extraction
- [ ] Photo gallery component
- [ ] Photo upload form
- [ ] Bulk upload support
- [ ] Photo metadata editing
- [ ] Photo deletion
- [ ] Associate photos with locations

#### Week 9-10: Transportation Tracking
- [ ] Transportation CRUD endpoints
- [ ] Transportation types enum
- [ ] Transportation form component
- [ ] Transportation list/timeline
- [ ] Route geometry storage (PostGIS)
- [ ] Basic route visualization on map
- [ ] Transportation status tracking
- [ ] Seat number and booking details

#### Week 11-12: Lodging Management
- [ ] Lodging CRUD endpoints
- [ ] Lodging form component
- [ ] Lodging list display
- [ ] Lodging markers on map
- [ ] Date validation (within trip dates)
- [ ] Check-in/check-out datetime picker

---

### Phase 3: Enhanced Features (6-8 weeks)

#### Week 13-14: Advanced Trip Views
- [ ] Timeline view implementation
- [ ] Calendar view integration (FullCalendar or similar)
- [ ] Map view showing all trips
- [ ] Enhanced filtering UI
- [ ] Sorting options
- [ ] Trip search functionality

#### Week 15-16: Journal Entries
- [ ] Journal entry CRUD endpoints
- [ ] Rich text editor integration (TipTap)
- [ ] Journal editor component
- [ ] Journal viewer component
- [ ] Trip-level journals
- [ ] Daily journals
- [ ] Associate photos with journals
- [ ] Associate locations with journals
- [ ] Mood selector
- [ ] Weather notes field

#### Week 17-18: Immich Integration
- [ ] Immich API client setup
- [ ] Immich authentication flow
- [ ] Immich photo browser component
- [ ] Link Immich photos to trips
- [ ] Display Immich photos in gallery
- [ ] Sync Immich photo metadata
- [ ] Handle Immich photo URLs

#### Week 19-20: Photo Albums
- [ ] Photo album CRUD endpoints
- [ ] Album management UI
- [ ] Album gallery component
- [ ] Assign photos to albums
- [ ] Reorder photos in albums
- [ ] Album filtering

---

### Phase 4: Collaboration & Social (4-5 weeks)

#### Week 21-22: Tags & Companions
- [ ] Tag CRUD endpoints
- [ ] Tag management UI
- [ ] Tag selector component
- [ ] Tag filtering
- [ ] Companion CRUD endpoints
- [ ] Companion management UI
- [ ] Companion selector for trips
- [ ] Filter trips by companion

#### Week 23-24: Trip Sharing
- [ ] Trip collaborator endpoints
- [ ] Share trip dialog
- [ ] Permission management (view, edit, admin)
- [ ] Shared trips view
- [ ] Accept/decline sharing invitations
- [ ] Email notifications (optional)

#### Week 25: Custom Categories
- [ ] User-defined category endpoints
- [ ] Category manager component
- [ ] Icon and color picker
- [ ] Custom category markers on map

---

### Phase 5: Search, Discovery & Analytics (4-5 weeks)

#### Week 26-27: Search & Filtering
- [ ] Global search endpoint
- [ ] Search indexing strategy
- [ ] Global search component
- [ ] Advanced filter panel
- [ ] Search results display
- [ ] Filter by country/region
- [ ] Filter by year
- [ ] Filter by tags, companions, privacy

#### Week 28-29: Dashboard & Analytics
- [ ] Dashboard statistics endpoints
- [ ] Dashboard page layout
- [ ] Trip statistics widgets
- [ ] Travel statistics widgets
- [ ] Recent activity feed
- [ ] Travel map overview
- [ ] Year in review endpoint
- [ ] Year in review component

#### Week 30: Places Visited Map
- [ ] Places visited endpoints
- [ ] Places visited map component
- [ ] Marker clustering
- [ ] Places visited statistics
- [ ] Filter by date range
- [ ] Visited countries list
- [ ] Places visited timeline

---

### Phase 6: Integrations (4-5 weeks)

#### Week 31-32: Weather Integration
- [ ] OpenWeatherMap API client
- [ ] Weather data endpoints
- [ ] Fetch historical weather
- [ ] Fetch weather forecast
- [ ] Weather widget component
- [ ] Weather timeline component
- [ ] Cache weather data in database

#### Week 33-34: Flight Tracking
- [ ] AviationStack API client
- [ ] Flight tracking endpoints
- [ ] Enable/disable flight tracking
- [ ] Flight status updates
- [ ] Flight status widget
- [ ] Periodic flight data refresh
- [ ] Flight status badges

#### Week 35: Route Calculation
- [ ] OpenRouteService/GraphHopper integration
- [ ] Route calculation endpoints
- [ ] Walking route auto-suggestion
- [ ] Route visualization on map
- [ ] Connection group management
- [ ] Multi-leg journey display

---

### Phase 7: Import/Export & Polish (3-4 weeks)

#### Week 36-37: Import/Export
- [ ] XML export endpoint
- [ ] XML schema definition
- [ ] Export trip to XML
- [ ] XML import endpoint
- [ ] Parse and validate XML
- [ ] Import trip from XML
- [ ] Handle import conflicts
- [ ] Export dialog component

#### Week 38: Print Reports
- [ ] Print-friendly trip report endpoint
- [ ] Generate HTML report
- [ ] Print stylesheet
- [ ] Trip itinerary layout
- [ ] Include photos in report
- [ ] Include maps in report
- [ ] PDF generation (optional)

#### Week 39-40: Polish & Optimization
- [ ] Performance optimization
  - Database query optimization
  - Index creation
  - API response caching
- [ ] Mobile responsiveness
- [ ] Error handling improvements
- [ ] Loading states and skeletons
- [ ] User onboarding flow
- [ ] Help documentation
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Testing (unit, integration, e2e)
- [ ] Security audit
- [ ] Deployment documentation

---

## Technology Stack Details

### Frontend

#### Core
- **React 18+** with TypeScript
- **Vite** - Build tool
- **React Router v6** - Routing

#### UI Framework Options
**Option A: Material-UI (MUI)**
- Pros: Comprehensive components, mature, good documentation
- Cons: Bundle size, opinionated design

**Option B: Tailwind CSS + Headless UI**
- Pros: Flexible, smaller bundle, modern
- Cons: More manual component building

#### State Management
- **Redux Toolkit** or **Zustand**
- React Query (TanStack Query) for server state

#### Forms & Validation
- **React Hook Form** - Form management
- **Zod** - Schema validation

#### Maps
- **React-Leaflet** - React wrapper for Leaflet
- **Leaflet** - OpenStreetMap rendering
- **Leaflet.markercluster** - Marker clustering

#### Rich Text Editor
- **TipTap** - Headless WYSIWYG editor

#### Date/Time
- **date-fns** or **Day.js** - Date manipulation

#### HTTP Client
- **Axios** or **Fetch API** with React Query

#### Additional Libraries
- **react-dropzone** - File upload
- **react-image-lightbox** - Photo viewer
- **recharts** or **Chart.js** - Charts for analytics
- **react-hot-toast** - Notifications

---

### Backend

#### Core
- **Node.js 18+**
- **Express** - Web framework
- **TypeScript**

#### Database
- **PostgreSQL 15+**
- **PostGIS** - Spatial extension
- **Prisma** - ORM and migrations

#### Authentication
- **jsonwebtoken** - JWT tokens
- **bcrypt** - Password hashing

#### File Handling
- **Multer** - File upload middleware
- **Sharp** - Image processing

#### Validation
- **Zod** or **Joi** - Request validation

#### API Documentation
- **Swagger/OpenAPI** - API documentation

#### External APIs
- **axios** - HTTP client for external APIs
- **node-cron** - Scheduled tasks (flight tracking updates)

#### Additional Libraries
- **dotenv** - Environment variables
- **cors** - CORS middleware
- **helmet** - Security headers
- **winston** or **pino** - Logging
- **express-rate-limit** - Rate limiting
- **exifr** - EXIF data extraction
- **xml2js** - XML parsing/generation

---

### Database

- **PostgreSQL 15+**
- **PostGIS** extension for geospatial data
- **pg_trgm** extension for full-text search

---

### External Services

#### Nominatim (Self-hosted)
- Geocoding and reverse geocoding
- Docker image: `mediagis/nominatim`

#### OpenWeatherMap API
- Historical weather data
- Weather forecasts
- Free tier: 1,000 calls/day

#### AviationStack API
- Flight tracking
- Real-time flight status
- Free tier: 500 calls/month (limited)

#### Immich API
- User's self-hosted Immich instance
- Photo browsing and metadata

#### OpenRouteService / GraphHopper
- Route calculation
- Walking/driving directions
- Self-hosted or API

---

### Infrastructure

#### Containerization
- **Docker**
- **Docker Compose**

#### Services in Docker Compose
1. **PostgreSQL** (with PostGIS)
2. **Backend** (Node.js/Express)
3. **Frontend** (React - served by Nginx in production)
4. **Nominatim** (OpenStreetMap geocoding)
5. **Redis** (optional - for caching)

#### File Storage
- Local filesystem (Docker volume)
- Structure: `/uploads/trips/{tripId}/photos/{photoId}.jpg`

#### Environment Variables
- `.env` file for configuration
- Separate for development and production

---

## Configuration

### Environment Variables

#### Backend `.env`
```
# Server
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://user:password@db:5432/captains_log?schema=public

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=52428800

# Immich
IMMICH_API_URL=http://your-immich-instance/api
IMMICH_API_KEY=your-immich-api-key

# OpenWeatherMap
OPENWEATHERMAP_API_KEY=your-api-key

# AviationStack
AVIATIONSTACK_API_KEY=your-api-key

# Nominatim
NOMINATIM_URL=http://nominatim:8080

# OpenRouteService (optional)
OPENROUTESERVICE_API_KEY=your-api-key
# Or self-hosted
OPENROUTESERVICE_URL=http://openrouteservice:8080
```

#### Frontend `.env`
```
VITE_API_URL=http://localhost:5000/api
VITE_UPLOAD_URL=http://localhost:5000/uploads
```

---

## Docker Compose Configuration

### Services

1. **db** - PostgreSQL with PostGIS
2. **backend** - Node.js/Express API
3. **frontend** - React app (Nginx in production)
4. **nominatim** - OpenStreetMap geocoding
5. **redis** (optional) - Caching

### Volume Mounts
- Database data persistence
- Photo uploads directory
- Nominatim data

---

## Security Considerations

### Authentication & Authorization
- Password hashing with bcrypt (salt rounds: 10)
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Refresh token rotation
- Secure HTTP-only cookies for refresh tokens (optional)

### API Security
- CORS configuration
- Rate limiting (express-rate-limit)
- Helmet.js for security headers
- Input validation on all endpoints (Zod/Joi)
- SQL injection prevention (Prisma parameterized queries)
- File upload restrictions (type, size)

### Data Privacy
- User data isolation (row-level security)
- Privacy levels enforced on queries
- Shared trip permission checks
- Secure file paths (no directory traversal)

### HTTPS
- SSL/TLS certificates (Let's Encrypt)
- Enforce HTTPS in production

---

## Testing Strategy

### Backend Testing
- **Unit Tests**: Business logic, utility functions
- **Integration Tests**: API endpoints, database operations
- **Framework**: Jest, Supertest

### Frontend Testing
- **Unit Tests**: Components, utilities
- **Integration Tests**: User flows
- **E2E Tests**: Critical paths
- **Framework**: Vitest, React Testing Library, Playwright/Cypress

### Test Coverage Goals
- Backend: 80%+
- Frontend: 70%+

---

## Deployment

### Development
```bash
docker-compose up
```

### Production
- Docker Compose with production configuration
- Nginx reverse proxy
- SSL certificates
- Database backups (pg_dump scheduled)
- Log aggregation
- Monitoring (optional: Grafana, Prometheus)

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Backups configured
- [ ] Logging configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] File upload limits set
- [ ] CORS properly configured

---

## Future Enhancements (Post-MVP)

### Phase 8+
- Mobile app (React Native)
- Offline mode with sync
- Collaborative editing in real-time
- Social features (follow users, like trips)
- Trip recommendations based on preferences
- AI-powered trip suggestions
- Voice notes for journal entries
- Video support
- Expense tracking and budgeting
- Currency conversion
- Multi-language support (i18n)
- Calendar sync (Google Calendar, iCal)
- Booking integration (Booking.com, Airbnb)
- Public trip discovery/explore page
- Trip duplication feature
- PDF export for trip reports
- GPX import/export for routes
- Advanced analytics (carbon footprint, spending trends)
- Integration with travel blogs (export to Medium, WordPress)

---

## Open Questions & Decisions

### Resolved
- ✅ Platform: Web application
- ✅ Backend: Node.js
- ✅ Database: PostgreSQL with PostGIS
- ✅ Deployment: Docker Compose
- ✅ Maps: OpenStreetMap with self-hosted Nominatim
- ✅ Photo Integration: Immich + local storage
- ✅ Weather API: OpenWeatherMap
- ✅ Flight Tracking: AviationStack

### To Be Decided
- [ ] UI Framework: Material-UI vs Tailwind CSS
- [ ] State Management: Redux Toolkit vs Zustand
- [ ] Route Service: OpenRouteService vs GraphHopper (self-hosted or API)
- [ ] Redis for caching: Required or optional?
- [ ] Email notifications: Required or optional? (SendGrid, Mailgun, SMTP)
- [ ] PDF generation library: Puppeteer, PDFKit, or jsPDF?

---

## Resources

### Documentation
- [PostgreSQL](https://www.postgresql.org/docs/)
- [PostGIS](https://postgis.net/documentation/)
- [Prisma](https://www.prisma.io/docs)
- [React](https://react.dev/)
- [Leaflet](https://leafletjs.com/)
- [TipTap](https://tiptap.dev/)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [AviationStack API](https://aviationstack.com/documentation)
- [Nominatim](https://nominatim.org/release-docs/latest/)

### Tutorials & Guides
- Docker Compose for full-stack apps
- PostGIS spatial queries
- JWT authentication in Express
- File uploads with Multer
- Image processing with Sharp
- EXIF data extraction
- OpenStreetMap integration

---

## Contact & Support

- **Project Repository**: TBD
- **Issue Tracker**: TBD
- **Documentation**: TBD

---

## Changelog

### 2024-01-XX - Planning Complete
- Initial project planning and requirements gathering
- Complete feature specification
- Database schema design
- API endpoint planning
- Frontend component architecture
- Implementation roadmap created

---

**End of Planning Document**
