# Captain's Log - Feature List & Development Log

This document provides a comprehensive list of all features in Captain's Log, organized by functional area. **Update this file whenever new features are added or existing features are modified.**

Last Updated: 2025-01-22 | Current Version: v1.2.6

---

## Table of Contents

1. [Authentication & User Management](#authentication--user-management)
2. [Trip Management](#trip-management)
3. [Location Management](#location-management)
4. [Activity Management](#activity-management)
5. [Transportation Management](#transportation-management)
6. [Lodging Management](#lodging-management)
7. [Journal Entries](#journal-entries)
8. [Photo Management](#photo-management)
9. [Timeline & Visualization](#timeline--visualization)
10. [Collaboration Features](#collaboration-features)
11. [Settings & Customization](#settings--customization)
12. [External Integrations](#external-integrations)

---

## Authentication & User Management

### Core Authentication
- **User Registration**
  - Email-based account creation
  - Password hashing with bcrypt
  - Automatic default category seeding on registration

- **User Login**
  - JWT-based authentication
  - Access tokens (15-minute expiry)
  - Refresh tokens (7-day expiry)
  - Automatic token refresh via axios interceptors

- **Session Management**
  - Persistent login via refresh tokens
  - Automatic logout on token expiration
  - Secure token storage

### User Profile
- View and edit user profile information
- Manage account settings
- Delete account (with cascade deletion of all user data)

---

## Trip Management

### Trip CRUD Operations
- **Create Trips**
  - Title, description
  - Start/end dates
  - Trip status (Dream, Planning, Planned, In Progress, Completed, Cancelled)
  - Privacy level (Private, Shared, Public)
  - Timezone selection
  - Add to "Places Visited" toggle

- **Edit Trips**
  - Update all trip metadata
  - Change status and privacy level
  - Modify dates and timezone

- **Delete Trips**
  - Cascade deletion of all related data
  - Confirmation prompt

### Trip Organization
- **Trip Status Workflow**
  - Dream: Ideas and aspirations
  - Planning: Active planning phase
  - Planned: Finalized but not started
  - In Progress: Currently traveling
  - Completed: Trip finished
  - Cancelled: Trip cancelled

- **Trip Filtering & Search**
  - Filter by status
  - Filter by date range
  - Search by title/description
  - Filter by tags

- **Trip Tags**
  - Create custom tags
  - Assign colors to tags
  - Many-to-many tag assignments
  - Filter trips by tags

### Trip Details View
- **Overview Tab**
  - Trip summary information
  - Quick stats (activities, locations, photos, etc.)
  - Date and timezone display

- **Timeline Tab**
  - Chronological view of all scheduled activities
  - Visual timeline with date separators
  - Transportation between locations
  - Weather integration (if configured)

- **Unscheduled Tab**
  - Activities without specific times
  - Easy promotion to scheduled activities

---

## Location Management

### Location CRUD
- **Create Locations**
  - Name and address
  - Coordinates (latitude/longitude)
  - Category assignment
  - Visit date/time
  - Visit duration
  - Notes
  - Search-based location finder with geocoding

- **Edit Locations**
  - Update all location details
  - Change coordinates via map interface
  - Clear optional fields (notes, address)

- **Delete Locations**
  - Remove location from trip
  - Confirmation prompt

### Location Features
- **Location Quick-Add** (v1.2.4)
  - Add locations directly from Activity/Lodging forms
  - Integrated geocoding search
  - Automatic selection after creation

- **Location Search & Geocoding**
  - Search for places by name or address
  - Nominatim-powered geocoding
  - Interactive map for coordinate selection
  - Debounced search (500ms delay)

- **Location Categories**
  - Default categories (Restaurant, Museum, Park, etc.)
  - Custom user-defined categories
  - Category icons and colors
  - Filter by category

- **Location Display**
  - Address display in activity/lodging lists
  - Map visualization on trip detail page
  - Coordinates display

### Places Visited
- **Global Places Visited View**
  - Map showing all locations from completed trips
  - Filter by trip
  - Timeline of visits
  - Link back to original trips

---

## Activity Management

### Activity CRUD
- **Create Activities**
  - Name and description
  - Category (custom user categories)
  - Location assignment
  - Start/end date and time
  - All-day activities
  - Timezone (inherits from trip or custom)
  - Cost and currency
  - Booking URL and reference number
  - Notes

- **Edit Activities**
  - Update all activity details
  - Change from scheduled to unscheduled
  - Clear optional fields

- **Delete Activities**
  - Remove activity from trip
  - Confirmation prompt

### Activity Organization
- **Scheduled vs Unscheduled**
  - Scheduled: Activities with specific times (appear on timeline)
  - Unscheduled: Activities with dates but no times
  - Easy conversion between states

- **Activity Categories**
  - User-customizable categories
  - Default categories seeded on registration
  - Category-based filtering and organization

- **Parent-Child Activities**
  - Nest sub-activities under parent activities
  - Hierarchical display
  - Useful for complex multi-part activities

### Activity Display
- **Timeline Integration**
  - Activities appear in chronological order
  - Timezone-aware display (v1.2.3)
  - Visual grouping by day

- **Activity List View**
  - Sortable and filterable
  - Location and address display (v1.2.4)
  - Cost and booking information
  - Quick edit/delete actions

---

## Transportation Management

### Transportation CRUD
- **Create Transportation**
  - Type (Flight, Train, Bus, Car, Ferry, Bicycle, Walk, Other)
  - Origin and destination locations
  - Origin/destination location names (text fallback)
  - Departure and arrival times
  - Separate timezones for departure/arrival (v1.2.3)
  - Carrier and vehicle number
  - Confirmation number
  - Cost and currency
  - Notes

- **Edit Transportation**
  - Update all transportation details
  - Change times and locations
  - Clear optional fields (v1.2.5)

- **Delete Transportation**
  - Remove transportation segment
  - Confirmation prompt

### Transportation Features
- **Transportation Types**
  - Flight (with carrier and flight number)
  - Train
  - Bus
  - Car (rental or personal)
  - Ferry
  - Bicycle
  - Walk
  - Other

- **Connection Grouping**
  - Group connected transportation segments
  - Multi-leg journey support
  - Automatic connection display

- **Timeline Integration**
  - Transportation appears between activities
  - Visual connection lines on timeline
  - Travel duration calculation

---

## Lodging Management

### Lodging CRUD
- **Create Lodging**
  - Type (Hotel, Hostel, Airbnb, Vacation Rental, Camping, Resort, Motel, B&B, Apartment, Friends/Family, Other)
  - Name and location
  - Address (optional)
  - Check-in and check-out dates
  - Timezone (v1.2.3)
  - Confirmation number
  - Cost and currency
  - Booking URL
  - Notes

- **Edit Lodging**
  - Update all lodging details
  - Change dates and location
  - Clear optional fields (v1.2.5)

- **Delete Lodging**
  - Remove lodging reservation
  - Confirmation prompt

### Lodging Features
- **Lodging Types**
  - 11 different accommodation types
  - Custom "Other" category

- **Location Integration**
  - Link to location database
  - Address display (v1.2.4)
  - Map visualization

- **Booking Management**
  - Confirmation number tracking
  - Booking URL storage
  - Cost tracking

---

## Journal Entries

### Journal CRUD
- **Create Journal Entries**
  - Title and content (rich text)
  - Entry date
  - Trip-level or date-specific entries
  - Multiple entry types (Daily, Trip Summary, Reflection, etc.)

- **Edit Journal Entries**
  - Update title and content
  - Change entry date
  - Clear optional fields (v1.2.5, v1.2.6)

- **Delete Journal Entries**
  - Remove journal entry
  - Confirmation prompt

### Journal Organization
- **Entry Types**
  - Daily entries
  - Trip summaries
  - Reflections
  - Notes

- **Cross-References**
  - Link to specific locations
  - Link to activities
  - Link to lodging
  - Link to transportation

- **Journal Display**
  - Chronological listing
  - Expandable entries
  - Inline editing
  - Associated entities shown

### Journal Entry Associations
- **Location Assignments**
  - Associate entry with multiple locations
  - Display location context

- **Activity Associations**
  - Link journal entries to activities
  - Show related activities in entry view

- **Button Integration** (v1.2.4)
  - Quick access to journal entries from activities
  - Quick access from locations
  - "Journal Entries" button component

---

## Photo Management

### Photo Upload & Storage
- **Local Photo Upload**
  - Drag-and-drop upload
  - Multi-file upload
  - EXIF data extraction (date, location)
  - Image processing with Sharp
  - Thumbnail generation

- **Photo Organization**
  - Assign photos to trips
  - Assign photos to locations
  - Assign photos to activities
  - "Unsorted" photos section

- **Photo Albums**
  - Create custom albums
  - Album descriptions
  - Assign photos to albums
  - Album cover photos
  - Many-to-many photo-album relationships

### Immich Integration
- **Immich Photo Library**
  - Connect to self-hosted Immich instance
  - Browse Immich photos within Captain's Log
  - Link Immich photos to trips
  - Reference external photo URLs
  - Hybrid local/Immich photo management

- **Photo Browser**
  - Immich photo browser component
  - Filter by album
  - Search photos
  - Select photos for trip association

### Photo Display
- **Photo Gallery**
  - Grid view of photos
  - Lightbox for full-size viewing
  - EXIF data display
  - Location on map (if geotagged)

- **Album View**
  - Album-specific photo galleries
  - Album management interface
  - Photo count per album

- **Associated Albums Component** (v1.2.4)
  - Show albums associated with entities
  - Quick navigation to album views
  - Display in activity/location/lodging cards

---

## Timeline & Visualization

### Timeline View
- **Chronological Display**
  - All scheduled activities in order
  - Transportation segments between activities
  - Date separators
  - Time-based sorting

- **Timezone Support** (v1.2.3)
  - Timezone-aware time display
  - Show timezone abbreviations (PST, EST, etc.)
  - Hierarchical timezone fallback (entity ’ trip ’ browser)
  - Proper DST handling with IANA timezone identifiers

- **Timeline Features**
  - Expandable activity details
  - Quick edit buttons
  - Visual grouping by day
  - Travel time indicators

### Map Visualization
- **Trip Map**
  - Leaflet-based interactive maps
  - Location markers
  - Category-based marker colors
  - Popup with location details
  - Zoom and pan controls

- **Places Visited Map**
  - Global map of all visited locations
  - Trip-based filtering
  - Marker clustering for dense areas
  - Link to original trips

### Weather Integration (Optional)
- **Weather Data**
  - OpenWeatherMap API integration
  - Historical weather data
  - Weather display on timeline
  - Temperature, conditions, precipitation

---

## Collaboration Features

### Trip Sharing
- **Privacy Levels**
  - Private: Only owner can view
  - Shared: Specific users can view
  - Public: Anyone with link can view

- **Trip Collaborators**
  - Invite collaborators by email
  - Permission levels (View, Edit, Admin)
  - Collaborative trip planning
  - Real-time updates (with page refresh)

### Companion Management
- **Travel Companions**
  - Add companions to trips
  - Companion details (name, email, phone)
  - Associate companions with activities
  - Companion notes

- **Companion Display**
  - List of trip companions
  - Companion-specific views
  - Activity participation tracking

---

## Settings & Customization

### User Settings
- **Profile Settings**
  - Update user information
  - Change password
  - Profile preferences

- **Custom Categories**
  - Activity categories
  - Location categories
  - Category colors and icons
  - Per-user customization

- **Default Settings**
  - Default timezone
  - Default currency
  - Default privacy level
  - Date/time format preferences

### Appearance
- **Dark Mode**
  - System-based theme detection
  - Manual theme toggle
  - Persistent theme preference
  - Dark mode for all views

- **Tailwind CSS Styling**
  - Responsive design
  - Mobile-friendly interface
  - Consistent styling across all components

---

## External Integrations

### Geocoding
- **Nominatim Integration**
  - Self-hosted Nominatim instance (optional)
  - External Nominatim API (fallback)
  - Address ’ Coordinates conversion
  - Reverse geocoding
  - Place name search

- **Geocoding Features**
  - Debounced search
  - Result ranking
  - Display name formatting
  - Bounding box support

### Photo Library
- **Immich Integration**
  - Connect to Immich API
  - Browse Immich albums
  - Link Immich photos to trips
  - Dual photo source support (local + Immich)

- **Photo Source Tracking**
  - Track whether photo is local or Immich
  - Immich asset ID storage
  - Hybrid photo management

### Weather (Optional)
- **OpenWeatherMap API**
  - Historical weather data
  - Current weather conditions
  - Weather forecasts
  - Weather display on timeline

### Flight Tracking (Optional)
- **AviationStack API**
  - Flight status tracking
  - Real-time flight information
  - Automatic flight updates
  - Flight delay notifications

---

## Recent Features & Updates

### v1.2.6 (2025-01-22)
- **Backend Validation Fix**
  - Fixed Zod schemas to accept `null` for clearing fields
  - Updated location, journal, and trip update schemas
  - Enables proper field clearing during updates

### v1.2.5 (2025-01-22)
- **Empty Field Updates**
  - Changed frontend to send `null` instead of `undefined` for empty fields
  - Fixed all manager components (Activity, Lodging, Transportation, Journal)
  - Enables users to clear optional field values

- **Tab Count Updates**
  - Added `onUpdate` callback to all manager components
  - Tab counts refresh immediately after create/update/delete
  - No manual page refresh required

### v1.2.4 (2025-01-22)
- **Location Quick-Add**
  - Add locations inline from Activity/Lodging forms
  - Geocoding search integration
  - Auto-selection of new locations

- **Location Editing**
  - Edit existing locations in-place
  - Update coordinates via map search
  - No need to delete and recreate

- **Address Display**
  - Show location addresses in activity/lodging lists
  - Full address in location details

### v1.2.3 (2025-01-22)
- **Timezone Support**
  - Timezone-aware display for all times
  - IANA timezone identifiers
  - Separate timezones for transportation departure/arrival
  - Hierarchical timezone fallback
  - Timezone abbreviation display (PST, EST, etc.)

### v1.2.2 (2025-01-21)
- **Datetime Validation Fix**
  - Removed strict `.datetime()` validation
  - Accept ISO strings with or without timezone suffix

### v1.2.1 (2025-01-21)
- **Migration Handling**
  - Automatic detection of missing migration files
  - Cleanup of invalid migration references
  - Improved docker-entrypoint.sh

---

## Feature Categories Summary

### Core Trip Management 
- Trips, Locations, Activities, Transportation, Lodging, Journals
- CRUD operations for all entities
- Advanced filtering and search

### Visual & Organization 
- Timeline view with timezone support
- Interactive maps (Leaflet)
- Custom categories and tags
- Photo albums and galleries

### External Services 
- Nominatim geocoding (self-hosted or external)
- Immich photo library integration
- Optional weather and flight tracking APIs

### User Experience 
- Dark mode
- Responsive design
- Quick-add features
- Inline editing
- Automatic refresh and updates

### Collaboration 
- Privacy levels (Private/Shared/Public)
- Trip collaborators
- Travel companions
- Shareable trip links

---

## Development Guidelines

### When Adding New Features

1. **Update this document** with:
   - Feature name and description
   - Version number
   - Date added
   - Related components/files

2. **Update IMPLEMENTATION_STATUS.md** if:
   - Marking a planned feature as complete
   - Discovering new issues or limitations

3. **Create release notes** (RELEASE_NOTES_vX.X.X.md) with:
   - Detailed feature description
   - Breaking changes (if any)
   - Migration steps (if needed)
   - Testing recommendations

4. **Update CLAUDE.md** if:
   - Adding new development patterns
   - Introducing new architectural concepts
   - Changing existing conventions

### Feature Documentation Template

```markdown
### Feature Name (vX.X.X - Date)
- **Brief Description**
  - Sub-feature 1
  - Sub-feature 2

- **Implementation Details**
  - Key files modified
  - New components created
  - API endpoints added

- **User Impact**
  - What users can now do
  - Any breaking changes
```

---

## Related Documentation

- [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) - Current status and known issues
- [FEATURE_IDEAS.md](../FEATURE_IDEAS.md) - Planned future features
- [CLAUDE.md](../CLAUDE.md) - Development guidelines for AI assistants
- [BUILD_AND_PUSH.md](BUILD_AND_PUSH.md) - Build and release process
