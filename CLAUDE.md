# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Important References:**
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Current project status, completed features, and remaining work. **Update this file whenever significant features are completed or new issues are discovered.**
- [FEATURE_IDEAS.md](FEATURE_IDEAS.md) - Future enhancement ideas and feature requests.

## Project Overview

Captain's Log is a full-stack travel documentation application built with a React frontend and Express backend. The application enables users to track trips with rich features including locations, photos, transportation, lodging, journal entries, and more.

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
- `docker-compose up -d` - Start all services (db, backend, frontend, nominatim)
- `docker-compose down` - Stop all services
- `docker ps` - Check running containers
- `docker logs captains-log-backend` - View backend logs
- `docker logs captains-log-frontend` - View frontend logs
- `docker exec -it captains-log-backend npx prisma migrate dev` - Run migrations in container

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

## Known Configuration Notes

- **Nominatim** takes 1-2 hours to initialize on first Docker startup (downloads US map data)
- Default location categories are seeded when users are created
- Default activity categories stored in User model as array
- Windows paths may require escaping in file operations
- Frontend runs on port 5173 locally (Vite default), but 3000 in Docker for consistency
