# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Important References:**

All documentation is organized in the `docs/` folder. Start with the [Documentation Index](docs/README.md) for navigation.

### Quick Reference

| Need | Document |
|------|----------|
| **Understand the codebase** | [Backend Architecture](docs/architecture/BACKEND_ARCHITECTURE.md), [Frontend Architecture](docs/architecture/FRONTEND_ARCHITECTURE.md) |
| **Work on the UI** | [Style Guide](docs/architecture/STYLE_GUIDE.md) (**required reading**) |
| **Understand the database** | [Database Schema](docs/architecture/DATABASE_SCHEMA.md) |
| **Use the API** | [API Reference](docs/api/README.md) |
| **Deploy to production** | [Deployment Guide](DEPLOYMENT.md), [Quick Start](QUICK_START_PRODUCTION.md) |
| **Release a new version** | [Build & Push](docs/guides/BUILD_AND_PUSH.md), [Release Checklist](RELEASE_CHECKLIST.md) |
| **Track progress** | [Implementation Status](docs/development/IMPLEMENTATION_STATUS.md) |
| **Debug issues** | [Debugger Agent](.agents/DEBUGGER.md) |
| **Optimize code** | [Code Optimizer Agent](.agents/CODE_OPTIMIZER.md) |

### Architecture Documentation (`docs/architecture/`)

- [FRONTEND_ARCHITECTURE.md](docs/architecture/FRONTEND_ARCHITECTURE.md) - **Detailed frontend architecture guide covering component patterns, state management, data flow, routing, and best practices.**
- [BACKEND_ARCHITECTURE.md](docs/architecture/BACKEND_ARCHITECTURE.md) - **Detailed backend architecture guide covering layered architecture, database patterns, authentication, validation, error handling, and best practices.**
- [DATABASE_SCHEMA.md](docs/architecture/DATABASE_SCHEMA.md) - **Database schema reference with entity relationships, all models, indexes, and the entity linking system.**
- [STYLE_GUIDE.md](docs/architecture/STYLE_GUIDE.md) - **REQUIRED READING for UI work. Complete design system covering colors (Compass Gold palette), typography, component classes, dark mode, animations, and accessibility. Always consult before creating or modifying UI components.**
- [BACKEND_OPTIMIZATION_PLAN.md](docs/architecture/BACKEND_OPTIMIZATION_PLAN.md) - Backend performance optimization strategies.

### API Documentation (`docs/api/`)

- [README.md](docs/api/README.md) - **Complete API reference with all endpoints, authentication, request/response formats, and examples.**

### Development Tracking (`docs/development/`)

- [IMPLEMENTATION_STATUS.md](docs/development/IMPLEMENTATION_STATUS.md) - **Current project status, completed features, and remaining work. Update this file whenever significant features are completed or new issues are discovered.**
- [FEATURE_BACKLOG.md](docs/development/FEATURE_BACKLOG.md) - **Prioritized feature backlog with 94 future enhancement ideas organized by priority and category.**
- [UI_UX_IMPROVEMENT_PLAN.md](docs/development/UI_UX_IMPROVEMENT_PLAN.md) - UI/UX enhancement roadmap.
- [BUGS.md](docs/development/BUGS.md) - Known bugs and issues tracking.

### Guides & Instructions (`docs/guides/`)

- [BUILD_AND_PUSH.md](docs/guides/BUILD_AND_PUSH.md) - **Step-by-step checklist for building and pushing new versions.**
- [TESTING_GUIDE.md](docs/guides/TESTING_GUIDE.md) - Testing procedures and guidelines.
- [ROUTING_SETUP.md](docs/guides/ROUTING_SETUP.md) - **OpenRouteService configuration for accurate road distance calculations (required for car/bike/walking transportation)**

### User Documentation (`docs/user-guide/`)

- [README.md](docs/user-guide/README.md) - **End-user guide covering all application features, workflows, and tips.**

### Planning Documents (`docs/plans/`)

- [GOOGLE_MAPS_INTEGRATION_PLAN.md](docs/plans/GOOGLE_MAPS_INTEGRATION_PLAN.md) - Google Maps integration roadmap.
- [GOOGLE_PHOTOS_INTEGRATION_PLAN.md](docs/plans/GOOGLE_PHOTOS_INTEGRATION_PLAN.md) - Google Photos integration roadmap.
- [UI_IMPROVEMENTS.md](docs/plans/UI_IMPROVEMENTS.md) - Planned UI improvements.
- [TRIP_DASHBOARD_PLAN.md](docs/plans/TRIP_DASHBOARD_PLAN.md) - Trip dashboard enhancement plan.

### Agent Documentation (`.agents/`)

- [DEBUGGER.md](.agents/DEBUGGER.md) - **Systematic debugging agent for investigating and fixing bugs. Use this when encountering errors or issues.**
- [CODE_OPTIMIZER.md](.agents/CODE_OPTIMIZER.md) - **Code optimization agent for identifying code reuse opportunities and refactoring to reduce duplication. Use this to improve maintainability.**

### Root-Level Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - **Comprehensive production deployment guide with Docker, TrueNAS, reverse proxy, SSL, backups, and monitoring.**
- [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) - **Quick production setup in under 10 minutes.**
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) - **Complete release checklist covering testing, versioning, building, publishing, and deployment.**
- [README.md](README.md) - Project overview and quick start for development.

## Project Overview

Travel Life is a full-stack travel documentation application built with a React frontend and Express backend. The application enables users to track trips with rich features including locations, photos, transportation, lodging, journal entries, and more.

### Naming Convention

**IMPORTANT**: The application has two different names used in different contexts:

- **Travel Life** - The user-facing application name used in the UI, branding, and user documentation
- **Captain's Log** - The technical infrastructure name used for:
  - Top-level folder name (`Captains-Log/`)
  - Docker container names (`captains-log-backend`, `captains-log-frontend`, `captains-log-db`)
  - Database name (`captains_log`)
  - Docker image names (`ghcr.io/dsbaciga/captains-log-backend`, `ghcr.io/dsbaciga/captains-log-frontend`)
  - Git repository references
  - Environment variables and configuration files
  - Build scripts and deployment commands

**DO NOT change any technical infrastructure names** when updating the application. The "Captain's Log" naming in containers, databases, usernames, passwords, and folder structure remains unchanged for compatibility and deployment stability.

### Current Implementation Status

**The application is ~92% complete and production-ready for personal use.** See [docs/development/IMPLEMENTATION_STATUS.md](docs/development/IMPLEMENTATION_STATUS.md) for detailed progress tracking and [docs/development/FEATURE_BACKLOG.md](docs/development/FEATURE_BACKLOG.md) for future enhancements.

**Core Features (100% Complete)**:

- ✅ **Authentication System** - User registration, login, JWT tokens, refresh tokens, secure httpOnly cookies, CSRF protection, token blacklisting
- ✅ **Trip Management** - Full CRUD with status tracking (Dream → Planning → Planned → In Progress → Completed → Cancelled), automatic status updates based on dates
- ✅ **Location Management** - Interactive maps, geocoding, custom categories, photo linking
- ✅ **Photo Management** - Local uploads, Immich integration, EXIF parsing, albums, thumbnails, paged pagination, video support
- ✅ **Transportation** - Flights, trains, buses, cars with dual timezone support, connections, flight route visualization, statistics dashboard
- ✅ **Lodging** - Hotels, Airbnb, camping with booking details and multi-day display
- ✅ **Activities** - Status tracking, cost tracking, custom categories
- ✅ **Journal Entries** - Multiple entry types, mood tracking, weather notes, photo/location linking
- ✅ **Tags & Companions** - Many-to-many relationships with trips, color customization
- ✅ **Entity Linking** - Unified system to link any entity to any other (photos↔locations, activities↔locations, etc.)
- ✅ **Timeline View** - Chronological trip events with dual timezone display and printable itinerary export
- ✅ **User Settings** - Profile, timezone, theme (light/dark), custom categories
- ✅ **Dark Mode** - Full support across all components
- ✅ **Checklists** - Trip checklists with items, categories, auto-population of defaults, completion tracking
- ✅ **Trip Health Check** - Automated validation for schedule conflicts, missing accommodations, transportation gaps
- ✅ **Trip Collaboration** - Full UI for inviting collaborators, managing permissions (view/edit/admin)
- ✅ **Backup & Restore** - Full data export/import with photo metadata preservation and merge capabilities
- ✅ **Advanced Dashboard** - Filter trips by status, tags, date range, search
- ✅ **Global Search** - Cross-entity search with autocomplete (Ctrl+K/Cmd+K)
- ✅ **Places Visited Map** - Aggregate map showing all visited locations with clustering
- ✅ **Calendar View** - GitHub-style calendar heatmap showing travel activity
- ✅ **Batch Operations** - Multi-select mode with bulk delete and bulk edit capabilities
- ✅ **Auto-Save Drafts** - Form state preservation to localStorage with restore prompt
- ✅ **Weather Integration** - OpenWeatherMap service with caching, forecast and historical data
- ✅ **Flight Tracking** - AviationStack integration for real-time flight status, gate/terminal info

**Key Features Still in Progress**:

- ⏳ Public trip sharing (privacy levels implemented, shareable link UI needed)
- ⏳ Google Photos integration
- ⏳ PDF export
- ⏳ Offline support / PWA
- ⏳ Mobile app

**Unique Features**:

- **Dual timezone timeline** - View trip events in both trip timezone and home timezone simultaneously
- **Printable itinerary** - Export timeline to a beautifully formatted, print-ready document with day-by-day breakdown
- **Paged pagination** - Memory-efficient photo album viewing with true page navigation (not infinite scroll)
- **Multi-day lodging** - Lodging automatically appears on every day from check-in to check-out
- **Immich integration** - Connect to self-hosted photo library
- **Custom categories** - User-defined location and activity categories
- **Rich journal entries** - Multiple entry types with mood and weather tracking
- **Universal entity linking** - Link any entity to any other (photos to locations, activities to locations, albums to multiple locations) with bidirectional discovery
- **Trip health check** - Automated validation identifies schedule conflicts, missing accommodations, and transportation gaps
- **Travel time alerts** - Calculates travel times between activities, warns about impossible/tight connections
- **Flight route visualization** - Interactive maps showing flight paths with curved arcs
- **Places visited map** - Aggregate visualization of all locations you've visited with clustering

## Tech Stack

**Backend**: Node.js + Express + TypeScript + PostgreSQL (PostGIS) + Prisma ORM + JWT Authentication
**Frontend**: React + TypeScript + Vite + Tailwind CSS + TanStack Query + Zustand + Leaflet
**Infrastructure**: Docker Compose with self-hosted Nominatim for geocoding

## Development Commands

### Backend (run from `backend/` directory)
- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build
- `npm test` - Run Jest tests
- `npm run prisma:generate` - Generate Prisma Client after schema changes
- `npm run prisma:migrate` - Create and run a new migration
- `npm run prisma:studio` - Open Prisma Studio GUI at http://localhost:5555

### Frontend (run from `frontend/` directory)
- `npm run dev` - Start Vite dev server (typically runs on port 5173 locally, 3000 in Docker)
- `npm run build` - Build production bundle (runs TypeScript compiler first)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Docker Commands (run from project root)

**Development:**
- `docker-compose up -d` - Start all services (db, backend, frontend, nominatim)
- `docker-compose down` - Stop all services
- `docker ps` - Check running containers
- `docker logs captains-log-backend` - View backend logs
- `docker logs captains-log-frontend` - View frontend logs
- `docker exec -it captains-log-backend npx prisma migrate dev` - Run migrations in container

**Production:**

- `./build.sh v1.0.0` (Linux/Mac) or `.\build.ps1 -Version v1.0.0` (Windows) - Build production images
- `docker-compose -f docker-compose.prod.yml --env-file .env.production up -d` - Start production services
- `docker exec captains-log-backend npx prisma migrate deploy` - Run production migrations

**Release Management:**

- `./release.sh patch|minor|major` (Linux/Mac) - Automated version bump, tagging, and build
- `.\release.ps1 -Version patch|minor|major` (Windows) - PowerShell release script with more features
- `.\release.ps1 -Version v1.2.3 -NoConfirm` - Non-interactive release with explicit version
- `.\release.ps1 -Version patch -DryRun` - Preview changes without executing
- See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for full release process

## Build and Deployment Workflow

**CRITICAL - READ THIS SECTION CAREFULLY**

When the user asks you to "build and deploy", "build and push", "push a new version", "release", or ANY similar deployment request:

### YOU MUST ONLY USE THE STEPS IN BUILD_AND_PUSH.md

**MANDATORY REQUIREMENTS:**

1. **FIRST ACTION**: Read [docs/guides/BUILD_AND_PUSH.md](docs/guides/BUILD_AND_PUSH.md) in its entirety
2. **FOLLOW EVERY STEP**: Execute the checklist systematically from start to finish
3. **NO SHORTCUTS**: Do not skip steps, assume steps are done, or use alternative methods
4. **NO IMPROVISATION**: Do not deviate from the documented process
5. **VERIFY COMPLETION**: Check each step completes successfully before proceeding

**WHY THIS IS CRITICAL:**

The BUILD_AND_PUSH.md checklist ensures:
- All tests pass before deployment
- Version numbers are updated in ALL required files (package.json, docker-compose files, etc.)
- Docker images are built and tagged correctly
- Images are pushed to the registry successfully
- Git tags are created and pushed
- Documentation is updated

**WHAT BUILD_AND_PUSH.md CONTAINS:**

- Pre-deployment verification (tests, TypeScript compilation, clean working directory)
- Complete version bumping process across all files
- Docker build commands with correct tags
- Container registry push commands
- Git tag creation and push
- Post-deployment verification steps
- Common troubleshooting and rollback procedures

**CONSEQUENCES OF NOT FOLLOWING THIS PROCESS:**

- Inconsistent version numbers across services
- Failed deployments due to missing steps
- Broken production environments
- Loss of deployment history
- Wasted time troubleshooting preventable issues

### DO NOT ATTEMPT BUILD/DEPLOY WITHOUT READING AND FOLLOWING BUILD_AND_PUSH.md

If you are unsure about any step, STOP and ask the user for clarification. Do not guess or improvise.

## Architecture

### Backend Architecture

The backend follows a layered architecture with clear separation of concerns:

**Routes → Controllers → Services → Prisma Client → Database**

- **Routes** (`src/routes/*.routes.ts`): Define API endpoints and apply middleware
- **Controllers** (`src/controllers/*.controller.ts`): Handle HTTP requests/responses, validate input with Zod schemas
- **Services** (`src/services/*.service.ts`): Contain business logic and database operations via Prisma
- **Middleware** (`src/middleware/`): Authentication (`auth.ts`), error handling (`errorHandler.ts`)
- **Types** (`src/types/*.types.ts`): TypeScript interfaces and Zod validation schemas

**Key Services**:

- `auth.service.ts` - User registration, login, JWT token management
- `trip.service.ts` - Trip CRUD with filtering by status, date range, tags
- `photo.service.ts` - Photo uploads, Immich integration, EXIF parsing
- `location.service.ts` - Location management with geocoding support
- `immich.service.ts` - Integration with self-hosted Immich photo library
- `entityLink.service.ts` - Unified entity linking with automatic relationship detection, bulk operations, bidirectional queries
- `checklist.service.ts` - Trip checklists with items, categories, and auto-population
- `collaboration.service.ts` - Trip sharing, collaborator management, invitations
- `backup.service.ts` / `restore.service.ts` - Full data export/import with relationship preservation
- `tripValidator.service.ts` - Trip health check, schedule conflict detection, travel time alerts
- `routing.service.ts` - OpenRouteService integration for road distance calculations
- `search.service.ts` - Cross-entity search across trips, locations, photos, journals
- `weather.service.ts` - OpenWeatherMap integration with caching
- `flightTracking.service.ts` - AviationStack integration for real-time flight status

**Authentication Flow**:
1. JWT access tokens (15min expiry) and refresh tokens (7 days)
2. `authenticate` middleware extracts and verifies tokens, attaches `req.user`
3. All protected routes require `authenticate` middleware
4. Controllers check `req.user` and extract `userId` for authorization
5. Frontend auto-refreshes tokens via axios interceptors

**Database**:
- PostgreSQL with PostGIS extension for geospatial data
- Prisma schema at `backend/prisma/schema.prisma`
- All coordinates stored as Decimal(10,8) for latitude, Decimal(11,8) for longitude
- Cascade deletes configured (e.g., deleting trip removes all related data)

### Frontend Architecture

The frontend uses a modern React architecture with clear data flow:

**Pages → Components → Services → API → Zustand Stores**

- **Pages** (`src/pages/*.tsx`): Top-level route components (Dashboard, TripDetail, Albums, Settings)
- **Components** (`src/components/`): Reusable UI components
- **Services** (`src/services/*.service.ts`): API client classes wrapping axios
- **Stores** (`src/store/`): Zustand state management (auth, theme)
- **Lib** (`src/lib/axios.ts`): Configured axios instance with interceptors

**State Management**:
- **Zustand** for global state (authentication, theme)
- **TanStack Query** for server state caching and synchronization
- Local state for UI interactions

**API Communication**:
- Centralized axios instance in `src/lib/axios.ts`
- Automatic token injection via request interceptors
- Auto token refresh on 401 responses via response interceptors
- Service classes provide type-safe API methods

**Key Frontend Services**:

- `auth.service.ts` - Login, register, token refresh
- `trip.service.ts` - Trip CRUD operations
- `photo.service.ts` - Photo upload and management
- `geocoding.service.ts` - Nominatim geocoding queries
- `checklist.service.ts` - Checklist CRUD and item management
- `collaboration.service.ts` - Trip collaborators and invitations
- `backup.service.ts` - Backup download and restore upload
- `search.service.ts` - Global search across all entities
- `entityLink.service.ts` - Entity linking operations

**Key Frontend Hooks**:

- `usePagedPagination` - True paged pagination with page replacement (not accumulative)
- `usePagination` - Legacy infinite scroll pagination (deprecated for albums)
- `useAutoSaveDraft` - Form state auto-save to localStorage with restore prompt
- `useBulkSelection` - Multi-select mode for batch operations
- `useEntityLinking` - Entity link management with counts
- `useKeyboardShortcuts` - Global keyboard shortcuts (?, Esc, Ctrl+K)
- `useManagerCRUD` - Common CRUD patterns for manager components

**Key Frontend Components**:

- `Timeline` - Chronological trip events with dual timezone display
- `PrintableItinerary` - Print-ready itinerary document export
- `Pagination` - Page navigation controls for paged pagination
- `LinkPanel` - Modal for managing entity links
- `LinkedEntitiesDisplay` - Display linked entities with counts
- `TripHealthCheck` - Validation alerts for schedule conflicts, missing accommodations
- `GlobalSearch` - Autocomplete search modal (Ctrl+K)
- `BulkActionBar` - Floating toolbar for batch operations
- `PlacesVisitedMap` - Aggregate location visualization with clustering
- `TravelCalendarHeatmap` - GitHub-style calendar activity view
- `CollaboratorsManager` - Trip sharing and permission management

### Database Schema Highlights

The Prisma schema models a complex travel data structure:

**Core Models** (21 tables total):

- `User` - Authentication, settings, custom categories
- `Trip` - Central entity with status (Dream/Planning/Planned/In Progress/Completed/Cancelled)
- `Location` - Points of interest with coordinates and custom categories
- `LocationCategory` - User-defined location categories
- `Photo` - Supports both local uploads and Immich integration, includes video support
- `PhotoAlbum` - Organize photos into albums
- `Transportation` - Flights, trains, buses with tracking and connections
- `Lodging` - Accommodation with booking details
- `Activity` - Planned/completed activities with cost tracking
- `JournalEntry` - Trip-level or daily journal entries
- `Checklist` - Trip checklists with categories
- `ChecklistItem` - Individual checklist items with completion status
- `TripTag` / `TripTagAssignment` - Tag definitions and many-to-many assignments
- `TravelCompanion` / `TripCompanion` - Companion management
- `TripCollaborator` / `TripInvitation` - Trip sharing and invitations
- `EntityLink` - Polymorphic linking system connecting any entity to any other
- `DismissedValidationIssue` - User-dismissed trip health check warnings
- `RouteCache` - Cached road distance calculations from OpenRouteService
- `WeatherData` - Weather information for locations
- `FlightTracking` - Real-time flight status data

**Relationships**:

- Many-to-many: Trips ↔ Tags, Trips ↔ Companions
- One-to-many: Trip → Locations → Photos
- Self-referential: Transportation connections via `connectionGroupId`
- Optional relations: Location ↔ Weather data

**Key Design Patterns**:

- Soft privacy via `privacyLevel` (Private/Shared/Public)
- Trip collaboration via `TripCollaborator` (view/edit/admin permissions)
- Trip invitations via `TripInvitation` with email tokens
- Flexible location references: Locations can reference Location table or use text fields
- Photo source tracking: `source` field indicates 'local' or 'immich'
- **Polymorphic entity linking**: Universal `EntityLink` table with `EntityType` and `LinkRelationship` enums enables any entity to link to any other (photos→locations, activities→locations, albums→multiple locations, etc.). Replaces need for entity-specific foreign keys.
- **Validation dismissal**: `DismissedValidationIssue` allows users to acknowledge known schedule gaps
- **Route caching**: `RouteCache` stores OpenRouteService responses to reduce API calls

## Environment Setup

### Required Environment Variables

**Backend** (`.env` file in `backend/`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/captains_log?schema=public
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
NOMINATIM_URL=http://localhost:8080
```

**Recommended Backend Variables**:
- `OPENROUTESERVICE_API_KEY` - **For accurate road distance calculations (car/bike/walking)**. Without this, distances fall back to straight-line (Haversine) calculations. See [ROUTING_SETUP.md](docs/guides/ROUTING_SETUP.md)

**Optional Backend Variables**:
- `IMMICH_API_URL` and `IMMICH_API_KEY` - For Immich integration
- `OPENWEATHERMAP_API_KEY` - For weather data
- `AVIATIONSTACK_API_KEY` - For flight tracking

**Frontend** (`.env` file in `frontend/`):
```
VITE_API_URL=http://localhost:5000/api
VITE_UPLOAD_URL=http://localhost:5000/uploads
```

### Port Configuration

**Default Ports**:
- Frontend: 3000 (Docker), 5173 (local Vite dev server)
- Backend: 5000
- Database: 5432
- Nominatim: 8080

Check running servers: `netstat -ano | findstr "LISTENING" | findstr ":3000 :5000 :5173"`

## Common Development Workflows

### Adding a New Feature

1. **Update Database Schema**: Modify `backend/prisma/schema.prisma`
2. **Create Migration**: `cd backend && npm run prisma:migrate`
3. **Generate Types**: `npm run prisma:generate`
4. **Backend Implementation**:
   - Create types in `src/types/<feature>.types.ts` (include Zod schemas)
   - Create service in `src/services/<feature>.service.ts`
   - Create controller in `src/controllers/<feature>.controller.ts`
   - Create routes in `src/routes/<feature>.routes.ts`
   - Register routes in `src/index.ts`
5. **Frontend Implementation**:
   - Create TypeScript types in `src/types/<feature>.ts`
   - Create service in `src/services/<feature>.service.ts`
   - Create components/pages as needed
   - **Follow the Style Guide** for all UI components (see below)

### Working with UI Components

**IMPORTANT: Always consult the Style Guide when creating or modifying UI components.**

Before writing any frontend UI code, read [docs/architecture/STYLE_GUIDE.md](docs/architecture/STYLE_GUIDE.md) to ensure consistency with the design system.

**Mandatory Style Guide Usage**:

1. **Colors**: Use the Compass Gold palette (`primary-*`, `accent-*`, `gold`) - never hardcode hex values
2. **Typography**: Use `font-display` (Crimson Pro) for headings, `font-body` (Manrope) for text
3. **Components**: Use existing CSS classes (`.btn-primary`, `.card`, `.input`, etc.) before creating custom styles
4. **Dark Mode**: Always pair light/dark classes (e.g., `bg-white dark:bg-navy-800`)
5. **Animations**: Use defined animations (`animate-fade-in`, `animate-scale-in`, etc.)
6. **Accessibility**: Follow touch target sizes (44x44px), focus indicators, and reduced motion support

**Quick Reference - Common Classes**:

| Need | Use |
|------|-----|
| Primary button | `.btn-primary` |
| Secondary button | `.btn-secondary` |
| Form input | `.input` |
| Card container | `.card` or `.card-interactive` |
| Loading spinner | `<LoadingSpinner />` component |
| Empty state | `<EmptyState />` component |
| Skeleton loading | `<SkeletonCard />`, `<SkeletonGrid />` |

**Key Style Guide Sections**:

- **Color System**: Primary colors, status colors, dark mode colors
- **Components**: Buttons, inputs, cards, modals, tabs, empty states, loading states
- **Animations**: Hover effects, feedback animations, stagger delays
- **Utility Classes**: Responsive typography, visual effects, CSS variable utilities

See the full [STYLE_GUIDE.md](docs/architecture/STYLE_GUIDE.md) for complete documentation including code examples.

### Database Changes

**Always create migrations for schema changes** (never edit migration files):
```bash
cd backend
npx prisma migrate dev --name descriptive_migration_name
npx prisma generate
```

**Reset database** (WARNING: deletes all data):
```bash
cd backend
npx prisma migrate reset
```

**View database in GUI**:
```bash
cd backend
npm run prisma:studio
```

### Working with Authentication

**Protected Backend Routes**:
1. Import middleware: `import { authenticate } from '../middleware/auth';`
2. Apply to routes: `router.get('/protected', authenticate, controller.method);`
3. Access user in controller: `req.user.userId`

**Frontend Authentication**:
- Auth state managed by `useAuthStore` (Zustand)
- Token refresh handled automatically by axios interceptors
- Protected routes should check `isAuthenticated` state

### Working with Entity Linking

The Entity Linking system (v3.0.0) provides a unified way to connect any trip entity to any other entity.

**Backend - Creating Links**:
```typescript
// Single link
await entityLinkService.createLink(userId, tripId, {
  sourceType: 'PHOTO',
  sourceId: photoId,
  targetType: 'LOCATION',
  targetId: locationId,
  relationship: 'TAKEN_AT' // Auto-detected if omitted
});

// Bulk link (one source to many targets)
await entityLinkService.bulkCreateLinks(userId, tripId, {
  sourceType: 'ALBUM',
  sourceId: albumId,
  targets: [
    { targetType: 'LOCATION', targetId: loc1Id },
    { targetType: 'LOCATION', targetId: loc2Id }
  ]
});
```

**Backend - Querying Links**:
```typescript
// Get all links for an entity (bidirectional)
const links = await entityLinkService.getLinksForEntity(userId, tripId, 'PHOTO', photoId);

// Get trip-wide link summary (for UI badges)
const summary = await entityLinkService.getTripLinksSummary(userId, tripId);
```

**Frontend - UI Components**:
```typescript
// LinkButton with count badge
<LinkButton
  entityType="PHOTO"
  entityId={photo.id}
  linkCount={5}
  onClick={() => setShowLinkPanel(true)}
/>

// LinkPanel modal for viewing/managing links
<LinkPanel
  isOpen={showLinkPanel}
  onClose={() => setShowLinkPanel(false)}
  tripId={tripId}
  entityType="PHOTO"
  entityId={photo.id}
/>
```

**Supported Entity Types**:
- `PHOTO`, `LOCATION`, `ACTIVITY`, `LODGING`, `TRANSPORTATION`, `JOURNAL`, `ALBUM`

**Relationship Types** (auto-detected when appropriate):
- `RELATED` - Generic relationship
- `TAKEN_AT` - Photo taken at location
- `OCCURRED_AT` - Activity/event at location
- `PART_OF` - Sub-item or nested element
- `DOCUMENTS` - Journal entry about item
- `FEATURED_IN` - Included in album/journal

**Benefits**:
- No need to create albums just to link photos to locations
- Albums can link to multiple locations (not restricted to one)
- Consistent API and UI patterns across all entity types
- Bidirectional discovery (see what's linked FROM and TO any entity)

See [docs/development/IMPLEMENTATION_STATUS.md](docs/development/IMPLEMENTATION_STATUS.md) for complete documentation.

### Working with Timeline and Printable Itinerary

**Timeline Features**:

The Timeline component displays all trip events chronologically with dual timezone support (trip timezone + home timezone).

**Printable Itinerary (Added v4.0.1)**:

- Export button in Timeline component generates print-ready itinerary document
- Uses `PrintableItinerary` component ([frontend/src/components/timeline/PrintableItinerary.tsx](frontend/src/components/timeline/PrintableItinerary.tsx))
- Renders in hidden div, opens print dialog, cleans up automatically
- Day-by-day breakdown with all events (transportation, lodging, activities, locations)
- Includes unscheduled items section at the end
- Print-optimized CSS in `src/index.css` with `@media print` styles
- Events grouped by date with formatted times and timezone information

**Implementation Pattern**:

```typescript
// Create ref for printable content
const printableRef = useRef<HTMLDivElement>(null);

// Render hidden printable component
<div style={{ display: 'none' }}>
  <PrintableItinerary
    ref={printableRef}
    tripTitle={trip.title}
    dayGroups={dayGroups}
    unscheduled={unscheduledData}
  />
</div>

// Print handler
const handlePrint = () => {
  const printWindow = window.open('', '', 'width=800,height=600');
  // Copy styles and content, trigger print dialog
};
```

### Working with Album Pagination

**Paged Pagination (Added v4.0.1)**:

Album views use true paged pagination instead of infinite scroll to prevent memory issues with large albums.

**Key Components**:

- `usePagedPagination` hook ([frontend/src/hooks/usePagedPagination.ts](frontend/src/hooks/usePagedPagination.ts)) - Replaces items on page change (not accumulative)
- `Pagination` component ([frontend/src/components/Pagination.tsx](frontend/src/components/Pagination.tsx)) - Page number navigation UI

**Usage Pattern**:

```typescript
const {
  items,
  total,
  currentPage,
  totalPages,
  loading,
  hasNextPage,
  hasPreviousPage,
  goToPage,
  nextPage,
  previousPage,
  refresh
} = usePagedPagination(
  async (skip, take) => {
    const result = await albumService.getAlbumPhotos(albumId, skip, take);
    return {
      items: result.photos,
      total: result.total,
      hasMore: result.hasMore
    };
  },
  { pageSize: 40 }
);

// Render pagination controls
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
  hasNext={hasNextPage}
  hasPrevious={hasPreviousPage}
/>
```

**Benefits**:

- Only one page of items in memory at a time (40 photos per page for albums, 30 for global album list)
- Prevents browser memory issues with 1000+ photo albums
- Better UX with page numbers and direct page navigation
- Replaces accumulative "Load More" pattern from old `usePagination` hook

### Working with Checklists

The Checklist system allows users to create and manage trip-specific checklists with auto-population of defaults.

**Backend - Checklist Service**:

```typescript
// Create a checklist for a trip
await checklistService.create(userId, tripId, {
  name: 'Packing List',
  category: 'PACKING',
  items: [
    { text: 'Passport', isCompleted: false },
    { text: 'Chargers', isCompleted: false }
  ]
});

// Auto-populate default checklists
await checklistService.populateDefaults(userId, tripId);
```

**Frontend - ChecklistManager Component**:

```typescript
<ChecklistManager
  tripId={tripId}
  onUpdate={() => refetchTrip()}
/>
```

**Checklist Categories**:

- `PACKING` - Items to pack
- `DOCUMENTS` - Travel documents
- `RESERVATIONS` - Booking confirmations
- `CUSTOM` - User-defined lists

### Working with Trip Health Check

The Trip Health Check system automatically validates trips and identifies potential issues.

**Validation Categories**:

| Category | What It Checks |
|----------|----------------|
| SCHEDULE | Overlapping activities, impossible timing |
| ACCOMMODATIONS | Missing lodging for trip dates |
| TRANSPORTATION | Gaps between segments, missing connections |
| COMPLETENESS | Missing required information |

**Frontend - TripHealthCheck Component**:

```typescript
<TripHealthCheck
  tripId={tripId}
  onIssueClick={(issue) => navigateToEntity(issue)}
/>
```

**Issue Dismissal**:

Users can dismiss known issues (e.g., "staying with friends" when no lodging is booked). Dismissed issues are stored in `DismissedValidationIssue` table and don't reappear.

### Working with Backup & Restore

The Backup & Restore system enables full data export and import with relationship preservation.

**Creating a Backup**:

```typescript
// Backend - Create backup
const backup = await backupService.createBackup(userId);
// Returns JSON with all user data, photos metadata, relationships

// Frontend - Download backup
const blob = await backupService.downloadBackup();
saveAs(blob, `travel-life-backup-${date}.json`);
```

**Restoring from Backup**:

```typescript
// Two modes:
// 1. Clear existing data and restore (clean slate)
// 2. Merge with existing data (adds new, skips duplicates)

await restoreService.restore(userId, backupData, {
  clearExisting: false, // true = replace all, false = merge
});
```

**What's Included in Backups**:

- All trips with full details
- Locations, activities, transportation, lodging
- Journal entries with photo/location links
- Photo metadata (not actual files)
- Tags, companions, checklists
- Entity links
- User settings and preferences

### Working with Trip Collaboration

The Collaboration system allows sharing trips with other users with permission levels.

**Permission Levels**:

| Level | Capabilities |
|-------|--------------|
| VIEW | Read-only access to trip details |
| EDIT | Add/edit locations, activities, photos, etc. |
| ADMIN | Full access including collaborator management |

**Backend - Collaboration Service**:

```typescript
// Invite a collaborator by email
await collaborationService.inviteCollaborator(userId, tripId, {
  email: 'friend@example.com',
  permission: 'EDIT'
});

// Accept an invitation
await collaborationService.acceptInvitation(userId, invitationToken);

// Update collaborator permission
await collaborationService.updatePermission(userId, tripId, collaboratorId, 'ADMIN');
```

**Frontend - CollaboratorsManager Component**:

```typescript
<CollaboratorsManager
  tripId={tripId}
  isOwner={trip.userId === currentUserId}
  onUpdate={() => refetchTrip()}
/>
```

### Working with Global Search

Global Search enables cross-entity searching with autocomplete, accessible via Ctrl+K (Cmd+K on Mac).

**Search Scope**:

- Trips (title, description, notes)
- Locations (name, address, notes)
- Photos (filename, description)
- Journal entries (title, content)
- Activities (name, description)

**Frontend - GlobalSearch Component**:

```typescript
// Automatically available via keyboard shortcut
// Or trigger programmatically:
<GlobalSearch
  isOpen={searchOpen}
  onClose={() => setSearchOpen(false)}
  onSelect={(result) => navigateToResult(result)}
/>
```

### Working with Batch Operations

Batch Operations allow multi-select mode for bulk actions on entities.

**Supported Entities**:

- Activities
- Locations
- Transportation
- Lodging
- Photos

**Frontend - Batch Selection Pattern**:

```typescript
const {
  selectedIds,
  toggleSelection,
  selectAll,
  clearSelection,
  isSelected,
  selectionCount
} = useBulkSelection<string>();

// Render selection checkboxes
<input
  type="checkbox"
  checked={isSelected(item.id)}
  onChange={() => toggleSelection(item.id)}
/>

// Bulk action bar appears when items selected
{selectionCount > 0 && (
  <BulkActionBar
    count={selectionCount}
    onDelete={() => handleBulkDelete(selectedIds)}
    onEdit={() => openBulkEditModal(selectedIds)}
    onClear={clearSelection}
  />
)}
```

### Working with Auto-Save Drafts

Auto-Save Drafts prevents data loss by automatically saving form state to localStorage.

**Frontend - useAutoSaveDraft Hook**:

```typescript
const {
  draftExists,
  restoreDraft,
  clearDraft,
  saveDraft
} = useAutoSaveDraft({
  key: `trip-form-${tripId}`,
  data: formData,
  interval: 5000, // Save every 5 seconds
});

// Show restore prompt if draft exists
{draftExists && (
  <div className="bg-amber-50 p-3 rounded">
    <p>You have an unsaved draft. Would you like to restore it?</p>
    <button onClick={restoreDraft}>Restore</button>
    <button onClick={clearDraft}>Discard</button>
  </div>
)}

// Clear draft on successful save
const handleSubmit = async () => {
  await service.save(formData);
  clearDraft();
};
```

### Debugging Issues

When encountering bugs or issues, use the **Debugger Agent** for systematic debugging:

**When to Use the Debugger Agent**:
- User reports a bug or error
- Feature not working as expected
- Validation errors
- Type errors
- Authorization failures
- Data not updating/refreshing

**How to Invoke**:

Use the Task tool to invoke the debugger agent:

```typescript
// Example invocation
Task tool with:
- subagent_type: "general-purpose"
- description: "Debug [brief issue description]"
- prompt: "Act as the DEBUGGER agent from .agents/DEBUGGER.md.

User Issue: [Describe the problem]
Error Message: [Include exact error if available]
Reproduction Steps: [How to reproduce the issue]

Follow the systematic 8-phase debugging process to identify and fix the root cause."
```

**The Debugger Agent Will**:
1. Understand the problem and classify it
2. Gather context from relevant files
3. Form testable hypotheses
4. Investigate systematically
5. Identify the root cause
6. Implement a minimal fix
7. Verify the fix works
8. Provide a clear report

**Quick Debug Reference** (for simple issues you can handle directly):
- **Validation errors**: Check Zod schemas use `.nullable().optional()` for updates
- **Type errors**: Verify types match between frontend/backend
- **Authorization errors**: Check ownership verification in services
- **Data not refreshing**: Ensure `onUpdate?.()` callbacks are called
- **Empty fields not clearing**: Frontend sends `null`, backend accepts `.nullable().optional()`

See [.agents/DEBUGGER.md](.agents/DEBUGGER.md) for the complete debugging guide.

### Code Optimization and Refactoring

When you notice code duplication or opportunities for simplification, use the **Code Optimizer Agent** for systematic refactoring:

**When to Use the Code Optimizer Agent**:

- Pattern repeated 3+ times across codebase
- Manager components have significant duplication
- Services share identical CRUD patterns
- Forms have repeated state management logic
- Utilities/helpers duplicated across files
- Inconsistent implementations of same task
- User requests code cleanup or refactoring

**How to Invoke**:

Use the Task tool to invoke the code optimizer agent:

```typescript
// Example invocation
Task tool with:
- subagent_type: "general-purpose"
- description: "Optimize code by reducing duplication"
- prompt: "Act as the CODE_OPTIMIZER agent from .agents/CODE_OPTIMIZER.md.

Goal: [What you want to optimize, e.g., 'Reduce Manager component duplication']
Context: [Any specific areas to focus on]

Follow the systematic optimization process:
1. Discover patterns and duplication
2. Analyze if abstraction will simplify code
3. Design the refactoring approach
4. Implement incrementally with testing
5. Document new patterns"
```

**The Code Optimizer Agent Will**:

1. Discover patterns and duplication across codebase
2. Analyze if abstraction simplifies (follows Rule of Three)
3. Design refactoring that reduces complexity
4. Implement abstractions incrementally
5. Migrate existing code one piece at a time
6. Verify functionality preserved
7. Document new patterns in architecture guides
8. Report on improvements (lines saved, maintainability gains)

**Optimization Principles** (what the agent follows):

- **Rule of Three**: Only abstract after 3+ repetitions
- **Simplify, Don't Complicate**: Abstractions must be easier to understand
- **Incremental**: Refactor one file at a time with testing
- **Follow Conventions**: Use existing project patterns
- **Document**: Update architecture docs with new patterns

**Quick Optimization Opportunities** (common wins):

- **Manager Components**: Extract `useEntityCRUD` hook for common state/CRUD patterns
- **Service Methods**: Create helper functions for ownership verification and update builders
- **Form Handling**: Extract `useFormState` hook for common form patterns
- **API Calls**: Create `useApiCall` hook to reduce try-catch-finally boilerplate
- **Validation Schemas**: Use schema helper utilities for common patterns like `.nullable().optional()`

See [.agents/CODE_OPTIMIZER.md](.agents/CODE_OPTIMIZER.md) for the complete optimization guide.

## Important Patterns and Conventions

### Error Handling

**Backend**: Use `AppError` class from `src/utils/errors.ts`:
```typescript
throw new AppError('Resource not found', 404);
```

**Frontend**: Services throw errors, components handle via try-catch or TanStack Query error states

### API Response Format

All backend responses follow this structure:
```typescript
{
  status: 'success' | 'error',
  data?: any,
  message?: string
}
```

### File Uploads

- Backend stores files in `uploads/` directory (Docker volume)
- Use `multer` middleware configured in controllers
- `sharp` library for image processing
- `exifr` library for EXIF data extraction

### Geospatial Data

- Always validate lat/lng ranges (lat: -90 to 90, lng: -180 to 180)
- PostGIS extension enables spatial queries (not heavily used yet)
- Nominatim service for geocoding addresses to coordinates

### TypeScript Best Practices

**Avoid using the `any` type.** The `any` type bypasses TypeScript's type checking and defeats the purpose of using TypeScript. Instead:

- Use proper types or interfaces for known structures
- Use `unknown` when the type is truly unknown (requires type narrowing before use)
- Use generics for reusable components/functions
- Use union types (e.g., `string | number`) for values that can be multiple types
- Use type assertions (`as Type`) sparingly and only when you're certain of the type

**Examples:**

```typescript
// ❌ Bad - avoids type checking
function processData(data: any) { ... }

// ✅ Good - explicit interface
interface UserData {
  id: string;
  name: string;
}
function processData(data: UserData) { ... }

// ✅ Good - use unknown + type narrowing
function processUnknown(data: unknown) {
  if (typeof data === 'string') {
    // data is now typed as string
  }
}

// ✅ Good - generics for flexibility
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

If you encounter existing `any` types in the codebase, consider refactoring them to proper types when working in that area.

## Markdown Formatting Guidelines

When creating or editing Markdown files, follow these formatting conventions for proper rendering:

### Spacing Rules

1. **Fenced code blocks** must be surrounded by blank lines (before and after)
2. **Headings** must be surrounded by blank lines (before and after)
3. **Lists** must be surrounded by blank lines (before and after)

### Examples

**Correct:**

```markdown
Some text here.

## Heading

More text here.

- List item 1
- List item 2

Paragraph after list.
```

**Incorrect:**

```markdown
Some text here.
## Heading
More text here.
- List item 1
- List item 2
Paragraph after list.
```

### Code Blocks

Always use triple backticks with language identifier:

```markdown
```typescript
const example = 'code here';
```
```

These spacing rules ensure consistent rendering across different Markdown parsers and maintain readability.

## Known Configuration Notes

- **Nominatim** takes 1-2 hours to initialize on first Docker startup (downloads US map data)
- Default location categories are seeded when users are created
- Default activity categories stored in User model as array
- Windows paths may require escaping in file operations
- Frontend runs on port 5173 locally (Vite default), but 3000 in Docker for consistency
