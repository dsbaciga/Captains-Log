# Test Coverage Improvement Plan

## Current State (2026-02-07)

### Backend Coverage (Jest + V8 provider)

| Layer | Files | Tested | Stmts | Branches | Funcs |
|-------|-------|--------|-------|----------|-------|
| **Services** | 35 | 10 | 26.23% | 79.60% | 65.35% |
| **Controllers** | 25 | 0 | 0% | 0% | 0% |
| **Routes** | 25 | 0 | 0% | 0% | 0% |
| **Middleware** | 3 | 1 | 41.97% | 84.61% | 50.00% |
| **Utils** | 15 | 4 | 62.10% | 86.25% | 50.00% |
| **Overall** | 103 | 15 | 17.56% | 73.69% | 46.23% |

### Frontend Coverage (Vitest - not measurable yet)

| Layer | Files | Tested |
|-------|-------|--------|
| **Components** | ~184 | 4 |
| **Pages** | 17 | 0 |
| **Hooks** | 33 | 0 |
| **Services** | 33 | 0 |
| **Utils** | ~20 | 3 |
| **Lib** | ~5 | 1 |

**Blockers**: `@vitest/coverage-v8` is not installed. Cannot measure frontend coverage.

---

## Phase 0: Enable Frontend Coverage Measurement

**Goal**: Install coverage tooling and establish baseline.

### Steps

1. Install `@vitest/coverage-v8`:
   ```bash
   cd frontend
   npm install --save-dev @vitest/coverage-v8
   ```

2. Add coverage config to `vitest.config.ts`:
   ```typescript
   test: {
     // ...existing config
     coverage: {
       provider: 'v8',
       reporter: ['text', 'html', 'json-summary'],
       include: ['src/**/*.{ts,tsx}'],
       exclude: [
         'src/**/*.test.{ts,tsx}',
         'src/**/*.spec.{ts,tsx}',
         'src/test/**',
         'src/types/**',
         'src/main.tsx',
         'src/vite-env.d.ts',
         'src/**/*.d.ts',
       ],
     },
   }
   ```

3. Run `npm run test:coverage` to get baseline numbers.

**Estimated effort**: ~10 minutes.

---

## Phase 1: Backend Controllers (Priority: HIGH)

**Goal**: Cover the controller layer, which sits between routes and services.

### Why controllers first?

Controllers have a consistent pattern: extract user/params -> validate body (Zod) -> call service -> return response. The existing test helpers (`createAuthenticatedControllerArgs`, `expectSuccessResponse`, `expectNextCalledWithError`) are specifically designed for controller tests but currently unused.

### Strategy

Controllers are thin wrappers. Each test mocks the service and verifies:
- Correct service method is called with correct args
- Response has correct status code and `{ status: 'success', data }` format
- Validation errors (bad body) produce 400 via Zod
- Missing auth produces 401
- Service errors propagate correctly

### Controller test pattern

```typescript
// backend/src/controllers/__tests__/tag.controller.test.ts
import { createAuthenticatedControllerArgs, expectSuccessResponse } from '../../__tests__/helpers/requests';
import { tagService } from '../../services/tag.service';

jest.mock('../../services/tag.service');

describe('tagController', () => {
  describe('createTag', () => {
    it('should create tag and return 201', async () => {
      const mockTag = { id: 1, name: 'Beach', userId: 1 };
      (tagService.createTag as jest.Mock).mockResolvedValue(mockTag);
      const { req, res, next } = createAuthenticatedControllerArgs(
        { id: 1, email: 'test@example.com' },
        { body: { name: 'Beach', color: '#FF0000' } }
      );

      await tagController.createTag(req, res, next);

      expect(tagService.createTag).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Beach' }));
      expectSuccessResponse(res, 201, mockTag);
    });
  });
});
```

### Files to create (ordered by priority)

| # | Test File | Controller | Methods to test | Est. tests |
|---|-----------|-----------|-----------------|------------|
| 1 | `auth.controller.test.ts` | auth | register, login, refreshToken, logout, getCurrentUser, changePassword, updateProfile | ~20 |
| 2 | `trip.controller.test.ts` | trip | createTrip, getTrips, getTripById, updateTrip, deleteTrip, updateCoverPhoto, duplicateTrip, updateStatus, healthCheck | ~25 |
| 3 | `location.controller.test.ts` | location | create, getByTrip, getById, update, delete, bulkDelete, bulkUpdate, getVisited | ~20 |
| 4 | `photo.controller.test.ts` | photo | upload, getByTrip, getById, update, delete, bulkDelete, setAlbumCover | ~20 |
| 5 | `activity.controller.test.ts` | activity | create, getByTrip, getById, update, delete | ~15 |
| 6 | `transportation.controller.test.ts` | transportation | create, getByTrip, getById, update, delete, bulkDelete, bulkUpdate | ~15 |
| 7 | `lodging.controller.test.ts` | lodging | create, getByTrip, getById, update, delete, bulkDelete, bulkUpdate | ~15 |
| 8 | `tag.controller.test.ts` | tag | createTag, getTagsByUser, getTagById, updateTag, deleteTag, linkTagToTrip, unlinkTagFromTrip, getTagsByTrip | ~18 |
| 9 | `companion.controller.test.ts` | companion | create, getAll, getById, update, delete | ~12 |
| 10 | `entityLink.controller.test.ts` | entityLink | create, getByTrip, delete, getLinked | ~10 |
| 11 | `journalEntry.controller.test.ts` | journalEntry | create, getByTrip, getById, update, delete | ~12 |
| 12 | `photoAlbum.controller.test.ts` | photoAlbum | create, getByTrip, getById, update, delete, addPhotos, removePhotos | ~15 |
| 13 | `user.controller.test.ts` | user | getProfile, updateSettings, deleteAccount | ~8 |
| 14 | `backup.controller.test.ts` | backup | createBackup, restoreBackup, getBackups | ~8 |
| 15 | `search.controller.test.ts` | search | search, globalSearch | ~6 |
| 16 | `checklist.controller.test.ts` | checklist | CRUD for checklists + items | ~12 |
| 17 | `collaboration.controller.test.ts` | collaboration | invite, accept, getCollaborators, removeCollaborator, updatePermission | ~12 |
| 18 | `weather.controller.test.ts` | weather | getWeather, getForecast | ~6 |
| 19 | `immich.controller.test.ts` | immich | getAssets, getAlbums, importPhoto, validateConnection | ~8 |
| 20 | `flightTracking.controller.test.ts` | flightTracking | search, getStatus, track | ~6 |

**Remaining 5** (lower priority - simple CRUD or rarely used):
- `languagePhrase.controller.test.ts` (~6)
- `packingSuggestion.controller.test.ts` (~6)
- `travelDocument.controller.test.ts` (~8)
- `userInvitation.controller.test.ts` (~8)
- `tripSeries.controller.test.ts` (~8)

**Total estimated**: ~300 controller tests across 25 files.

### `createCrudController` shortcut

Many controllers (activity, lodging, transportation, location, etc.) were refactored to use the `createCrudController` factory from `crudHelpers.ts`. For these, a single shared test can verify the factory works correctly, then each controller only needs tests for non-standard endpoints.

**Recommended**: Create a `crudHelpers.controller.test.ts` that tests the factory pattern once, reducing per-controller test count by ~50% for factory-based controllers.

---

## Phase 2: Backend Services (Priority: HIGH)

**Goal**: Cover the 25 untested services.

### Strategy

Services follow two patterns:
- **Simple CRUD services** (tag, companion, checklist, languagePhrase, packingSuggestion, travelDocument): Mock Prisma, verify queries/mutations, verify error cases
- **External API services** (weather, immich, aviationstack, routing): Mock HTTP calls (axios/fetch), verify request construction, verify response parsing, verify error handling

The existing test infrastructure has comprehensive mocks for both patterns:
- `mockPrismaClient` with `resetPrismaMocks()` for CRUD
- `mockWeatherService`, `mockImmichService`, `mockFlightService` for external APIs

### Files to create (ordered by priority)

| # | Test File | Service | Pattern | Est. tests |
|---|-----------|---------|---------|------------|
| 1 | `user.service.test.ts` | user | CRUD + password | ~15 |
| 2 | `tag.service.test.ts` | tag | CRUD + trip linking | ~15 |
| 3 | `companion.service.test.ts` | companion | CRUD + "Myself" auto-creation | ~12 |
| 4 | `checklist.service.test.ts` | checklist | CRUD + items | ~15 |
| 5 | `collaboration.service.test.ts` | collaboration | invite/accept/permissions | ~15 |
| 6 | `search.service.test.ts` | search | multi-model search | ~10 |
| 7 | `tokenBlacklist.service.test.ts` | tokenBlacklist | add/check/cleanup + file persistence | ~10 |
| 8 | `weather.service.test.ts` | weather | External API (OpenWeatherMap) | ~8 |
| 9 | `immich.service.test.ts` | immich | External API (Immich) | ~10 |
| 10 | `aviationstack.service.test.ts` | aviationstack | External API (flight data) | ~8 |
| 11 | `routing.service.test.ts` | routing | External API (OpenRouteService) + Haversine fallback | ~8 |
| 12 | `backup.service.test.ts` | backup | JSON export, file handling | ~8 |
| 13 | `restore.service.test.ts` | restore | JSON import, validation, transactions | ~10 |
| 14 | `tripValidator.service.test.ts` | tripValidator | health check scoring | ~8 |
| 15 | `travelDocument.service.test.ts` | travelDocument | CRUD | ~8 |
| 16 | `languagePhrase.service.test.ts` | languagePhrase | CRUD | ~6 |
| 17 | `packingSuggestion.service.test.ts` | packingSuggestion | CRUD | ~6 |
| 18 | `userInvitation.service.test.ts` | userInvitation | invite flow | ~8 |
| 19 | `tripSeries.service.test.ts` | tripSeries | CRUD + ordering | ~8 |
| 20 | `albumSuggestion.service.test.ts` | albumSuggestion | AI/rule-based suggestions | ~6 |
| 21 | `travelTime.service.test.ts` | travelTime | time calculations | ~6 |
| 22 | `tripLanguage.service.test.ts` | tripLanguage | language lookups | ~4 |
| 23 | `visaRequirement.service.test.ts` | visaRequirement | visa lookups | ~4 |
| 24 | `email.service.test.ts` | email | Email sending (mock nodemailer) | ~4 |

**Total estimated**: ~210 service tests across 24 files (+ the 10 already done).

---

## Phase 3: Backend Middleware + Utils (Priority: MEDIUM)

**Goal**: Cover remaining middleware and utility files.

### Middleware

| Test File | What to test | Est. tests |
|-----------|-------------|------------|
| `errorHandler.test.ts` | AppError handling, unknown error handling, Zod validation error formatting, Prisma error mapping, production vs dev error detail | ~12 |
| `rateLimit.test.ts` | Rate limit headers, 429 response, window reset | ~6 |

### Utils (untested files)

| Test File | What to test | Est. tests |
|-----------|-------------|------------|
| `asyncHandler.test.ts` | Wraps async errors into next() | ~4 |
| `parseId.test.ts` | Valid/invalid ID parsing, custom field names | ~6 |
| `controllerHelpers.test.ts` | requireUserId with/without user | ~4 |
| `crudHelpers.test.ts` | createCrudController factory, deleteEntity, bulkDeleteEntities, bulkUpdateEntities | ~20 |
| `debugLogger.test.ts` | Log formatting, log levels | ~4 |
| `pagination.test.ts` | Pagination param parsing | ~4 |

**Total estimated**: ~60 tests across 8 files.

---

## Phase 4: Backend Route Integration Tests (Priority: MEDIUM)

**Goal**: Verify routes are wired correctly with authentication and reach the right controller methods.

### Strategy

Route tests don't need to test full business logic (that's the service/controller layer). They verify:
- HTTP method + path reaches the correct controller
- Authentication middleware is applied to protected routes
- Public routes are accessible without auth
- Route parameters are extracted correctly

### Recommended approach: `supertest`

```bash
npm install --save-dev supertest @types/supertest
```

```typescript
// backend/src/routes/__tests__/trip.routes.test.ts
import request from 'supertest';
import express from 'express';
import { tripRoutes } from '../trip.routes';

// Mock all controllers
jest.mock('../../controllers/trip.controller');
jest.mock('../../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/trips', tripRoutes);

describe('Trip Routes', () => {
  it('GET /api/trips should call getTrips', async () => {
    await request(app).get('/api/trips').set('Authorization', 'Bearer token');
    expect(tripController.getTrips).toHaveBeenCalled();
  });

  it('POST /api/trips should call createTrip', async () => {
    await request(app).post('/api/trips').send({ title: 'Test' });
    expect(tripController.createTrip).toHaveBeenCalled();
  });
});
```

### Files to create

Rather than 25 individual route test files, group by domain:

| # | Test File | Routes covered | Est. tests |
|---|-----------|---------------|------------|
| 1 | `auth.routes.test.ts` | auth (register, login, refresh, logout) | ~8 |
| 2 | `trip.routes.test.ts` | trips + trip sub-resources | ~12 |
| 3 | `entity.routes.test.ts` | locations, activities, transport, lodging, journal entries | ~15 |
| 4 | `photo.routes.test.ts` | photos + albums | ~8 |
| 5 | `collaboration.routes.test.ts` | collaboration + invitations | ~8 |
| 6 | `utility.routes.test.ts` | tags, companions, checklists, search, weather, backup | ~12 |

**Total estimated**: ~63 route tests across 6 files.

### Alternative: Skip route tests

Route files are declarative (just `router.get('/path', controller.method)`) and have minimal logic. If effort is limited, **route tests can be deferred** in favor of more controller and service tests, which provide higher value per test.

---

## Phase 5: Frontend Services (Priority: HIGH)

**Goal**: Cover the 33 untested frontend service files.

### Strategy

Frontend services are thin axios wrappers. Tests verify:
- Correct HTTP method and URL
- Request body/params are passed correctly
- Response data is extracted and returned
- Error handling works

### Test pattern

```typescript
// frontend/src/services/__tests__/trip.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tripService } from '../trip.service';
import api from '../../lib/axios';

vi.mock('../../lib/axios');

describe('tripService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getTrips should GET /trips with query params', async () => {
    const mockData = { trips: [], total: 0 };
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: mockData } });

    const result = await tripService.getTrips({ page: 1, limit: 10 });

    expect(api.get).toHaveBeenCalledWith('/trips', { params: { page: 1, limit: 10 } });
    expect(result).toEqual(mockData);
  });
});
```

### Files to create (ordered by priority)

| # | Test File | Service | Est. tests |
|---|-----------|---------|------------|
| 1 | `auth.service.test.ts` | auth | ~10 |
| 2 | `trip.service.test.ts` | trip | ~12 |
| 3 | `location.service.test.ts` | location | ~10 |
| 4 | `photo.service.test.ts` | photo | ~10 |
| 5 | `activity.service.test.ts` | activity | ~8 |
| 6 | `transportation.service.test.ts` | transportation | ~8 |
| 7 | `lodging.service.test.ts` | lodging | ~8 |
| 8 | `search.service.test.ts` | search | ~6 |
| 9 | `collaboration.service.test.ts` | collaboration | ~6 |
| 10 | `backup.service.test.ts` | backup | ~6 |
| 11-33 | Remaining 23 services | Simple CRUD wrappers | ~4 each (~92) |

**Total estimated**: ~176 frontend service tests.

---

## Phase 6: Frontend Hooks (Priority: MEDIUM)

**Goal**: Cover the most-used hooks.

### Strategy

Custom hooks are tested with `@testing-library/react` `renderHook`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useManagerCRUD } from '../useManagerCRUD';
```

### Priority hooks to test

| # | Hook | Why priority | Est. tests |
|---|------|-------------|------------|
| 1 | `useManagerCRUD.ts` | Used by all manager components | ~15 |
| 2 | `useFormFields.ts` | Used in every form | ~10 |
| 3 | `usePagination.ts` / `usePagedPagination.ts` | Used in all list views | ~8 |
| 4 | `useEntityLinking.ts` | Complex state management | ~10 |
| 5 | `useBulkSelection.ts` / `useBulkOperations.ts` | Complex state management | ~8 |
| 6 | `useAutoSaveDraft.ts` / `useDraftRestore.ts` | localStorage + debouncing | ~8 |
| 7 | `useOfflineSearch.ts` | IndexedDB integration | ~6 |
| 8 | `useNetworkStatus.ts` | Event listener management | ~4 |

**Total estimated**: ~69 hook tests across 8-10 files.

Lower priority hooks (simple utilities): `useConfetti`, `useDropdownPosition`, `useScrollToHighlight`, `useSwipeGesture`, `useIOSDetection`, `useStorageEstimate` — these can be deferred.

---

## Phase 7: Frontend Components + Pages (Priority: LOW initially)

**Goal**: Cover critical UI components.

### Strategy

Component tests verify rendering and user interactions. Focus on:
- Components with business logic (managers, forms)
- Components with conditional rendering
- Components handling error/loading states

### Priority components

| # | Component | Why priority | Est. tests |
|---|-----------|-------------|------------|
| 1 | `TransportationManager.tsx` | Complex CRUD + forms | ~15 |
| 2 | `LodgingManager.tsx` | Complex CRUD + forms | ~15 |
| 3 | `JournalManager.tsx` | Rich text + CRUD | ~12 |
| 4 | `Timeline.tsx` | Complex rendering logic | ~10 |
| 5 | `GlobalSearch.tsx` | Search + debounce + navigation | ~8 |
| 6 | `DailyView.tsx` | Multi-entity aggregation | ~10 |

### Priority pages

| # | Page | Why priority | Est. tests |
|---|------|-------------|------------|
| 1 | `LoginPage.tsx` | Auth flow | ~8 |
| 2 | `RegisterPage.tsx` | Auth flow + validation | ~8 |
| 3 | `TripDetailPage.tsx` | Most complex page | ~10 |
| 4 | `DashboardPage.tsx` | Widget rendering | ~6 |
| 5 | `SettingsPage.tsx` | User preferences | ~6 |

**Total estimated**: ~108 component/page tests.

---

## Summary: Effort vs Impact

| Phase | Area | New Tests | Impact on Coverage | Effort |
|-------|------|-----------|-------------------|--------|
| **0** | Frontend coverage setup | 0 | Enables measurement | 10 min |
| **1** | Backend controllers | ~300 | Controllers: 0% -> ~60% | Large |
| **2** | Backend services | ~210 | Services: 26% -> ~65% | Large |
| **3** | Backend middleware/utils | ~60 | Utils: 62% -> ~80% | Small |
| **4** | Backend routes | ~63 | Routes: 0% -> ~50% | Medium |
| **5** | Frontend services | ~176 | Enables frontend coverage | Medium |
| **6** | Frontend hooks | ~69 | Critical hook coverage | Medium |
| **7** | Frontend components | ~108 | Visual/interaction coverage | Large |

### Recommended execution order

For maximum value per effort:

1. **Phase 0** (10 min) - Enable frontend measurement
2. **Phase 1, items 1-8** (core controllers) - Highest impact
3. **Phase 2, items 1-7** (core services) - Fill critical gaps
4. **Phase 3** (middleware/utils) - Quick wins
5. **Phase 5, items 1-10** (frontend services) - Establish frontend baseline
6. **Phase 6, items 1-4** (critical hooks) - Frontend logic coverage
7. Remaining Phase 1, 2, 4, 6, 7 items - Long tail

### Target coverage after all phases

| Layer | Current | Target |
|-------|---------|--------|
| Backend overall | 17.56% stmts | ~55-65% stmts |
| Backend services | 26.23% | ~65-75% |
| Backend controllers | 0% | ~60-70% |
| Backend routes | 0% | ~50% |
| Backend middleware | 41.97% | ~80% |
| Backend utils | 62.10% | ~80% |
| Frontend overall | ~2% (estimated) | ~30-40% |

### Notes

- **Node.js v25 compatibility**: Backend coverage must use `--coverageProvider=v8` (Istanbul breaks on Node v25)
- **Existing test helpers are comprehensive**: The `backend/src/__tests__/` directory has mocks, helpers, and fixtures ready to use. Most controller tests can be written quickly by leveraging `createAuthenticatedControllerArgs` and `expectSuccessResponse`.
- **`createCrudController` factory**: Controllers using this factory pattern share identical behavior. A single factory test + per-controller custom endpoint tests is the most efficient approach.
- **Frontend test infrastructure is solid**: `src/test/` has fixtures, render helpers, API mocks, and service mocks ready to use.
- **Parallelization**: Phases 1-3 (backend) and Phases 5-7 (frontend) can be worked on in parallel.
