# Type Safety Plan: Eliminating `any` Types in Backend

## Overview

### Current State

After analyzing the backend codebase, there are **126 explicit `any` usages** across **20 files**. This count includes:
- `: any` type annotations (most common)
- `as any` type assertions
- `<any>` generic type parameters

### Goal

Achieve **zero explicit `any`** types in production code (excluding test files).

### Benefits

1. **Compile-time bug detection** - TypeScript catches type mismatches before runtime
2. **Better IDE support** - IntelliSense, auto-completion, and refactoring tools work correctly
3. **Self-documenting code** - Types serve as inline documentation
4. **Safer refactoring** - Compiler catches breaking changes across the codebase
5. **Reduced runtime errors** - Many bugs are caught during development

## Inventory

### Summary by File

| File | Count | Pattern Types |
|------|-------|---------------|
| `services/checklist.service.ts` | 26 | Prisma results, callbacks, metadata |
| `services/tripValidator.service.ts` | 23 | Trip object typing, activity arrays |
| `services/immich.service.ts` | 13 | Error handling, external API, streams |
| `controllers/immich.controller.ts` | 11 | Error handling, options objects |
| `services/backup.service.ts` | 9 | Prisma results mapping |
| `services/photoAlbum.service.ts` | 6 | Decimal conversion, album mapping |
| `controllers/photoAlbum.controller.ts` | 6 | Photo transformation |
| `config/prismaExtensions.ts` | 5 | Prisma extension callbacks |
| `services/weather.service.ts` | 4 | External API, error handling |
| `services/search.service.ts` | 4 | Prisma results, entity mapping |
| `services/routing.service.ts` | 4 | Route steps, cache entry |
| `controllers/photo.controller.ts` | 3 | Photo transformation |
| `services/transportation.service.ts` | 3 | Frontend mapping, array typing |
| `utils/serviceHelpers.ts` | 2 | Dynamic model access, result building |
| `services/restore.service.ts` | 2 | Transaction, return type |
| `services/travelTime.service.ts` | 1 | Activity array parameter |
| `services/tag.service.ts` | 1 | Trip tags mapping |
| `services/companion.service.ts` | 1 | Trip companions mapping |
| `middleware/errorHandler.ts` | 6 | Prisma error properties |
| `config/database.ts` | 1 | Query logging event |
| `types/checklist.types.ts` | 1 | Metadata field |
| `config/swagger.ts` | 2 | Swagger middleware typing |
| `utils/asyncHandler.ts` | 1 | Promise return type |

### Detailed Analysis by File

#### High Priority (Security/High-Traffic Services)

**`services/tripValidator.service.ts` (23 usages)**
```typescript
// Current
private checkMissingLodging(trip: any): ValidationIssue[]
trip.lodging.forEach((lodging: any) => ...)
trip.activities.filter((a: any) => a.startTime)

// Solution: Use Prisma generated types with includes
import { Trip, Activity, Lodging, Transportation, Location, JournalEntry } from '@prisma/client';

type TripWithRelations = Trip & {
  activities: Activity[];
  lodging: Lodging[];
  transportation: Transportation[];
  locations: Location[];
  journalEntries: JournalEntry[];
};
```

**`services/immich.service.ts` (13 usages)**
```typescript
// Current patterns
} catch (error: any) {
const searchQuery: any = {};
Promise<{ stream: any; contentType: string }>

// Solutions
} catch (error: unknown) {
  if (error instanceof AxiosError) { ... }
}

interface ImmichSearchQuery {
  isFavorite?: boolean;
  isArchived?: boolean;
}

import { Readable } from 'stream';
Promise<{ stream: Readable; contentType: string }>
```

**`controllers/immich.controller.ts` (11 usages)**
```typescript
// Current
} catch (error: any) {
const options: any = {};

// Solutions
} catch (error: unknown) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : 'Unknown error';
}

interface ImmichAssetOptions {
  skip?: number;
  take?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
}
```

#### Medium Priority (Data Services)

**`services/checklist.service.ts` (26 usages)**
```typescript
// Current
checklists.map((checklist: any) => ...)
checklist.items.filter((item: any) => item.isChecked)
const createData: any = { ... }
itemData: { ...; metadata?: any }

// Solutions: Use Prisma types
import { Checklist, ChecklistItem, Prisma } from '@prisma/client';

type ChecklistWithItems = Prisma.ChecklistGetPayload<{
  include: { items: true }
}>;

// For metadata, define a proper interface
interface ChecklistItemMetadata {
  code?: string;
  name?: string;
  [key: string]: unknown;  // Allow additional properties
}
```

**`services/backup.service.ts` (9 usages)**
```typescript
// Current
trips.map((trip: any) => ...)
trip.transportation.map((t: any) => ...)

// Solution: Define complete backup types
type TripForBackup = Prisma.TripGetPayload<{
  include: {
    locations: { include: { category: true; children: true } };
    transportation: true;
    lodging: true;
    activities: true;
    journalEntries: true;
    // ... other includes
  }
}>;
```

**`services/photoAlbum.service.ts` (6 usages)**
```typescript
// Current
function convertPhotoDecimals<T extends { latitude?: any; longitude?: any }>(photo: T)
albums.map((album: any) => ...)

// Solutions
import { Decimal } from '@prisma/client/runtime/library';

interface PhotoWithDecimals {
  latitude?: Decimal | null;
  longitude?: Decimal | null;
}

function convertPhotoDecimals<T extends PhotoWithDecimals>(photo: T): T & {
  latitude?: number | null;
  longitude?: number | null;
}
```

**`services/search.service.ts` (4 usages)**
```typescript
// Current
trips.forEach((trip: any) => ...)
locations.forEach((loc: any) => ...)

// Solution: Prisma will infer types from findMany
// Just remove the explicit : any annotations
const trips = await prisma.trip.findMany({ ... });
trips.forEach((trip) => {  // Type is inferred
  results.push({ ... });
});
```

#### Lower Priority (Utilities/Config)

**`utils/serviceHelpers.ts` (2 usages)**
```typescript
// Current
const model = prisma[config.model] as any;
const result: any = {};

// Solutions
import { PrismaClient } from '@prisma/client';

type PrismaModelName = keyof Omit<PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// For dynamic model access, this is genuinely difficult to type
// Consider keeping as any with a comment explaining why
```

**`middleware/errorHandler.ts` (6 usages)**
```typescript
// Current
code: (err as any).code,
const prismaError = err as any;

// Solution: Define Prisma error interface
import { Prisma } from '@prisma/client';

interface PrismaError extends Error {
  code?: string;
  meta?: { target?: string[] };
}

function isPrismaError(err: unknown): err is PrismaError {
  return err instanceof Prisma.PrismaClientKnownRequestError ||
         err instanceof Prisma.PrismaClientUnknownRequestError;
}
```

**`config/prismaExtensions.ts` (5 usages)**
```typescript
// Current
Prisma.defineExtension((client: any) => ...)
async create({ args, query }: any) { ... }

// Solution: Use Prisma extension types
import { Prisma } from '@prisma/client';

Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      location: {
        async create({ args, query }) {
          // args and query are properly typed
        }
      }
    }
  });
});
```

## Priority Order

### Phase 1: High-Impact Services (Week 1)

1. **`tripValidator.service.ts`** - 23 fixes
   - Create `TripWithRelations` type using Prisma's `GetPayload`
   - Type all private method parameters
   - Estimated effort: 2-3 hours

2. **`immich.service.ts`** - 13 fixes
   - Replace `error: any` with `error: unknown` + type guards
   - Type search query objects
   - Type stream return values
   - Estimated effort: 1-2 hours

3. **`immich.controller.ts`** - 11 fixes
   - Same error handling pattern as service
   - Type options object
   - Estimated effort: 1 hour

### Phase 2: Data Services (Week 2)

4. **`checklist.service.ts`** - 26 fixes
   - Use Prisma generated types with includes
   - Type metadata properly (use `Prisma.JsonValue` or custom interface)
   - Estimated effort: 3-4 hours

5. **`backup.service.ts`** - 9 fixes
   - Create backup-specific types using Prisma's `GetPayload`
   - Estimated effort: 2 hours

6. **`photoAlbum.service.ts`** - 6 fixes
   - Type decimal conversion functions
   - Use Prisma types for album queries
   - Estimated effort: 1-2 hours

### Phase 3: Controllers & Utilities (Week 3)

7. **`photoAlbum.controller.ts`** - 6 fixes
8. **`photo.controller.ts`** - 3 fixes
9. **`search.service.ts`** - 4 fixes
10. **`transportation.service.ts`** - 3 fixes
11. **`routing.service.ts`** - 4 fixes
    - Estimated effort: 3-4 hours total

### Phase 4: Infrastructure & Config (Week 4)

12. **`middleware/errorHandler.ts`** - 6 fixes
13. **`config/prismaExtensions.ts`** - 5 fixes
14. **`config/database.ts`** - 1 fix
15. **`config/swagger.ts`** - 2 fixes
16. **`utils/serviceHelpers.ts`** - 2 fixes
17. **Remaining services** - tag, companion, travelTime, restore
    - Estimated effort: 2-3 hours total

## Common Patterns & Solutions

### Pattern 1: Prisma Query Results

**Problem:**
```typescript
const result: any = await prisma.trip.findMany({ include: { locations: true } });
result.map((trip: any) => trip.locations.map((loc: any) => ...))
```

**Solution:**
```typescript
import { Prisma } from '@prisma/client';

type TripWithLocations = Prisma.TripGetPayload<{
  include: { locations: true }
}>;

const result = await prisma.trip.findMany({ include: { locations: true } });
// result is automatically typed as TripWithLocations[]
result.map((trip) => trip.locations.map((loc) => ...))
```

### Pattern 2: Error Handling

**Problem:**
```typescript
} catch (error: any) {
  console.error(error.message);
  throw new AppError(error.message, error.statusCode || 500);
}
```

**Solution:**
```typescript
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  console.error(message);
  throw new AppError(message, statusCode);
}

// For axios errors specifically:
import { AxiosError } from 'axios';

} catch (error: unknown) {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status || 500;
    throw new AppError(error.message, statusCode);
  }
  throw error;
}
```

### Pattern 3: Dynamic Objects

**Problem:**
```typescript
const options: any = {};
if (someCondition) options.foo = value;
```

**Solution:**
```typescript
interface Options {
  foo?: string;
  bar?: number;
}
const options: Options = {};
if (someCondition) options.foo = value;

// Or for truly dynamic:
const options: Record<string, unknown> = {};
```

### Pattern 4: Callback Parameters

**Problem:**
```typescript
items.map((item: any) => item.name)
items.filter((item: any) => item.isActive)
```

**Solution:**
```typescript
// Let TypeScript infer from the array type
items.map((item) => item.name)  // Type inferred from items array

// Or explicitly type the array
const items: Item[] = await getItems();
items.map((item) => item.name)  // item: Item
```

### Pattern 5: External API Responses

**Problem:**
```typescript
const response = await axios.get(url);
const data: any = response.data;
```

**Solution:**
```typescript
// Define interface for expected response
interface ExternalApiResponse {
  items: Array<{
    id: string;
    name: string;
  }>;
  total: number;
}

const response = await axios.get<ExternalApiResponse>(url);
const data = response.data;  // Properly typed
```

### Pattern 6: JSON/Metadata Fields

**Problem:**
```typescript
metadata: any;
const code = (item.metadata as any).code;
```

**Solution:**
```typescript
import { Prisma } from '@prisma/client';

// Option 1: Use Prisma's JSON type
metadata: Prisma.JsonValue;

// Option 2: Define specific interface with type guard
interface ItemMetadata {
  code?: string;
  name?: string;
}

function isItemMetadata(value: unknown): value is ItemMetadata {
  return typeof value === 'object' && value !== null;
}

if (isItemMetadata(item.metadata)) {
  const code = item.metadata.code;
}
```

### Pattern 7: Generic Decimal Conversion

**Problem:**
```typescript
function convertDecimals<T extends { latitude?: any }>(obj: T): T
```

**Solution:**
```typescript
import { Decimal } from '@prisma/client/runtime/library';

interface WithOptionalCoordinates {
  latitude?: Decimal | number | null;
  longitude?: Decimal | number | null;
}

function convertDecimals<T extends WithOptionalCoordinates>(obj: T): T {
  return {
    ...obj,
    latitude: obj.latitude ? Number(obj.latitude) : null,
    longitude: obj.longitude ? Number(obj.longitude) : null,
  };
}
```

## Implementation Approach

### File-by-File Checklist

For each file:

- [ ] Read the file and identify all `any` usages
- [ ] Determine the appropriate type for each usage
- [ ] Create any necessary type definitions (interfaces, type aliases)
- [ ] Replace `any` with proper types
- [ ] Run `npm run build` to verify no compilation errors
- [ ] Run `npm test` to ensure functionality unchanged
- [ ] Commit changes for that file

### Testing Requirements

After fixing each file:

1. **Compilation test**: `npm run build` must succeed
2. **Unit tests**: `npm test` must pass (if tests exist for that file)
3. **Manual smoke test**: Verify the affected endpoints still work

### Creating Shared Types

Create a new file for commonly used Prisma-derived types:

**`backend/src/types/prisma-helpers.ts`**
```typescript
import { Prisma } from '@prisma/client';

// Trip with all common relations
export type TripWithRelations = Prisma.TripGetPayload<{
  include: {
    activities: true;
    lodging: true;
    transportation: true;
    locations: true;
    journalEntries: true;
  }
}>;

// Checklist with items
export type ChecklistWithItems = Prisma.ChecklistGetPayload<{
  include: { items: true }
}>;

// Photo album with assignments
export type AlbumWithPhotos = Prisma.PhotoAlbumGetPayload<{
  include: { photoAssignments: { include: { photo: true } } }
}>;

// Error type guards
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isAxiosError(error: unknown): error is import('axios').AxiosError {
  return error !== null &&
         typeof error === 'object' &&
         'isAxiosError' in error;
}
```

## TypeScript Config Changes

The current `tsconfig.json` already has `"strict": true` which enables:
- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `alwaysStrict`

### Recommended Additional Options

Consider adding these for even stricter checking:

```json
{
  "compilerOptions": {
    // Already enabled
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Consider adding
    "noUncheckedIndexedAccess": true,  // Adds undefined to index access
    "exactOptionalPropertyTypes": true, // Distinguishes undefined vs missing
    "noPropertyAccessFromIndexSignature": true  // Forces bracket notation for index sigs
  }
}
```

**Note:** These stricter options may require additional fixes. Evaluate after removing all `any` types.

## Verification

### Grep Commands to Verify Progress

```bash
# Count remaining : any usages (excluding test files)
grep -r ": any" backend/src/ --include="*.ts" | grep -v "__tests__" | grep -v ".test.ts" | wc -l

# Count remaining as any usages
grep -r "as any" backend/src/ --include="*.ts" | grep -v "__tests__" | grep -v ".test.ts" | wc -l

# List files with any remaining any usages
grep -rl ": any\|as any" backend/src/ --include="*.ts" | grep -v "__tests__" | grep -v ".test.ts"

# Show specific lines for review
grep -rn ": any\|as any" backend/src/ --include="*.ts" | grep -v "__tests__" | grep -v ".test.ts"
```

### TSC Strict Mode Check

```bash
# Compile with strict mode (already enabled in tsconfig)
cd backend && npm run build

# For even stricter checking, temporarily add to tsconfig.json:
# "noImplicitAny": true (redundant with strict, but explicit)
```

### Final Verification Checklist

- [ ] `grep -r ": any" backend/src/ | grep -v __tests__ | wc -l` returns 0
- [ ] `grep -r "as any" backend/src/ | grep -v __tests__ | wc -l` returns 0
- [ ] `npm run build` succeeds without errors
- [ ] `npm test` passes all tests
- [ ] Manual testing of key endpoints works correctly

## Exceptions

Some `any` usages may be acceptable with proper documentation:

1. **Prisma extension callbacks** - The Prisma extension API typing is incomplete; document with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

2. **Dynamic model access in serviceHelpers.ts** - Accessing `prisma[modelName]` dynamically is difficult to type properly

3. **Third-party library workarounds** - Some libraries have incomplete type definitions

For any remaining `any`, add a comment explaining why:
```typescript
// Type assertion needed because Prisma extension API doesn't expose proper types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async create({ args, query }: any) {
```

## Timeline

| Phase | Files | Estimated Effort | Target Completion |
|-------|-------|------------------|-------------------|
| 1 | tripValidator, immich service/controller | 4-6 hours | Week 1 |
| 2 | checklist, backup, photoAlbum services | 6-8 hours | Week 2 |
| 3 | Controllers, search, transportation, routing | 3-4 hours | Week 3 |
| 4 | Infrastructure, config, remaining services | 2-3 hours | Week 4 |

**Total estimated effort: 15-21 hours**

## Success Metrics

1. **Primary**: Zero explicit `any` types in production code
2. **Secondary**: All tests pass after changes
3. **Tertiary**: No runtime regressions from type changes
4. **Bonus**: Stricter tsconfig options enabled without new errors
