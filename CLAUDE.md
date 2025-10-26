# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Important References:**

- [reference/DEVELOPMENT_LOG.md](reference/DEVELOPMENT_LOG.md) - **Comprehensive feature list organized by functional area. Update this file when adding new features or modifying existing ones.**
- [reference/FRONTEND_ARCHITECTURE.md](reference/FRONTEND_ARCHITECTURE.md) - **Detailed frontend architecture guide covering component patterns, state management, data flow, routing, and best practices.**
- [reference/BACKEND_ARCHITECTURE.md](reference/BACKEND_ARCHITECTURE.md) - **Detailed backend architecture guide covering layered architecture, database patterns, authentication, validation, error handling, and best practices.**
- [reference/IMPLEMENTATION_STATUS.md](reference/IMPLEMENTATION_STATUS.md) - **Current project status, completed features, and remaining work. Update this file whenever significant features are completed or new issues are discovered.**
- [reference/FEATURE_IDEAS.md](reference/FEATURE_IDEAS.md) - **Future enhancement ideas and feature requests organized by category (50+ ideas including Quick Wins).**
- [reference/BUILD_AND_PUSH.md](reference/BUILD_AND_PUSH.md) - **Step-by-step checklist for building and pushing new versions.**
- [agents/DEBUGGER.md](agents/DEBUGGER.md) - **Systematic debugging agent for investigating and fixing bugs. Use this when encountering errors or issues.**
- [agents/CODE_OPTIMIZER.md](agents/CODE_OPTIMIZER.md) - **Code optimization agent for identifying code reuse opportunities and refactoring to reduce duplication. Use this to improve maintainability.**
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) - Quick production setup (< 10 min)
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) - Release preparation and deployment checklist

## Project Overview

Captain's Log is a full-stack travel documentation application built with a React frontend and Express backend. The application enables users to track trips with rich features including locations, photos, transportation, lodging, journal entries, and more.

### Current Implementation Status

**The application is ~75% complete and production-ready for personal use.** See [reference/IMPLEMENTATION_STATUS.md](reference/IMPLEMENTATION_STATUS.md) for detailed progress tracking.

**Core Features (100% Complete)**:
- ✅ **Authentication System** - User registration, login, JWT tokens, refresh tokens
- ✅ **Trip Management** - Full CRUD with status tracking (Dream → Planning → Planned → In Progress → Completed → Cancelled)
- ✅ **Location Management** - Interactive maps, geocoding, custom categories, photo linking
- ✅ **Photo Management** - Local uploads, Immich integration, EXIF parsing, albums, thumbnails
- ✅ **Transportation** - Flights, trains, buses, cars with dual timezone support and connections
- ✅ **Lodging** - Hotels, Airbnb, camping with booking details and multi-day display
- ✅ **Activities** - Status tracking, cost tracking, custom categories
- ✅ **Journal Entries** - Multiple entry types, mood tracking, weather notes, photo/location linking
- ✅ **Tags & Companions** - Many-to-many relationships with trips, color customization
- ✅ **Timeline View** - Chronological trip events with dual timezone display
- ✅ **User Settings** - Profile, timezone, theme (light/dark), custom categories
- ✅ **Dark Mode** - Full support across all components

**Key Features Still in Progress**:
- ⏳ Trip collaboration UI (database schema complete, UI needed)
- ⏳ Public trip sharing (privacy levels implemented, sharing UI needed)
- ⏳ Advanced dashboard filtering (by status, tags, date range)
- ⏳ Statistics and analytics dashboard
- ⏳ Weather data integration (OpenWeatherMap API configured but not integrated)
- ⏳ Flight tracking integration (AviationStack API configured but not integrated)

**Unique Features**:
- **Dual timezone timeline** - View trip events in both trip timezone and home timezone simultaneously
- **Multi-day lodging** - Lodging automatically appears on every day from check-in to check-out
- **Immich integration** - Connect to self-hosted photo library
- **Custom categories** - User-defined location and activity categories
- **Rich journal entries** - Multiple entry types with mood and weather tracking

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

- `./release.sh patch|minor|major` - Automated version bump, tagging, and build
- See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for full release process

## Build and Deployment Workflow

**IMPORTANT**: When the user asks you to "build and deploy", "build and push", "push a new version", or similar deployment requests, you MUST:

1. **Reference [reference/BUILD_AND_PUSH.md](reference/BUILD_AND_PUSH.md)** - This contains the step-by-step checklist for building and pushing new versions
2. **Follow the checklist systematically** - Don't skip steps or assume steps are done
3. **Verify each step completes** before moving to the next
4. **Update version numbers** in all required files (package.json files, docker-compose files, etc.)
5. **Test the build locally** before pushing to registry
6. **Document what was deployed** in the appropriate files

The BUILD_AND_PUSH.md file includes:
- Pre-deployment checklist (tests, TypeScript compilation, dependency updates)
- Version bumping process
- Docker build and tag commands
- Push to container registry steps
- Post-deployment verification
- Common troubleshooting steps

**DO NOT** attempt to build/deploy without first reading BUILD_AND_PUSH.md to ensure all steps are followed correctly.

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

### Database Schema Highlights

The Prisma schema models a complex travel data structure:

**Core Models**:
- `User` - Authentication, settings, custom categories
- `Trip` - Central entity with status (Dream/Planning/Planned/In Progress/Completed/Cancelled)
- `Location` - Points of interest with coordinates and custom categories
- `Photo` - Supports both local uploads and Immich integration
- `Transportation` - Flights, trains, buses with tracking and connections
- `Lodging` - Accommodation with booking details
- `Activity` - Planned/completed activities with cost tracking
- `JournalEntry` - Trip-level or daily journal entries
- `PhotoAlbum` - Organize photos into albums

**Relationships**:
- Many-to-many: Trips ↔ Tags, Trips ↔ Companions
- One-to-many: Trip → Locations → Photos
- Self-referential: Transportation connections via `connectionGroupId`
- Optional relations: Location ↔ Weather data

**Key Design Patterns**:
- Soft privacy via `privacyLevel` (Private/Shared/Public)
- Trip collaboration via `TripCollaborator` (view/edit/admin permissions)
- Flexible location references: Locations can reference Location table or use text fields
- Photo source tracking: `source` field indicates 'local' or 'immich'

## Environment Setup

### Required Environment Variables

**Backend** (`.env` file in `backend/`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/captains_log?schema=public
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
NOMINATIM_URL=http://localhost:8080
```

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
- prompt: "Act as the DEBUGGER agent from agents/DEBUGGER.md.

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

See [agents/DEBUGGER.md](agents/DEBUGGER.md) for the complete debugging guide.

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
- prompt: "Act as the CODE_OPTIMIZER agent from agents/CODE_OPTIMIZER.md.

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

See [agents/CODE_OPTIMIZER.md](agents/CODE_OPTIMIZER.md) for the complete optimization guide.

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
