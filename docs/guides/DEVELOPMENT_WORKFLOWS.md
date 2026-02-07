# Development Workflows

This guide covers all feature-specific development workflows for the Travel Life application. For general project setup, commands, and architecture overview, see [CLAUDE.md](../../CLAUDE.md).

## Adding a New Feature

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

## Working with UI Components

**IMPORTANT: Always consult the Style Guide when creating or modifying UI components.**

Before writing any frontend UI code, read [docs/architecture/STYLE_GUIDE.md](../architecture/STYLE_GUIDE.md) to ensure consistency with the design system.

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

See the full [STYLE_GUIDE.md](../architecture/STYLE_GUIDE.md) for complete documentation including code examples.

## Database Changes

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

## Working with Authentication

**Protected Backend Routes**:

1. Import middleware: `import { authenticate } from '../middleware/auth';`
2. Apply to routes: `router.get('/protected', authenticate, controller.method);`
3. Access user in controller: `req.user.userId`

**Frontend Authentication**:

- Auth state managed by `useAuthStore` (Zustand)
- Token refresh handled automatically by axios interceptors
- Protected routes should check `isAuthenticated` state

## Working with Entity Linking

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

See [docs/development/IMPLEMENTATION_STATUS.md](../development/IMPLEMENTATION_STATUS.md) for complete documentation.

## Working with Timeline and Printable Itinerary

**Timeline Features**:

The Timeline component displays all trip events chronologically with dual timezone support (trip timezone + home timezone).

**Printable Itinerary (Added v4.0.1)**:

- Export button in Timeline component generates print-ready itinerary document
- Uses `PrintableItinerary` component (`frontend/src/components/timeline/PrintableItinerary.tsx`)
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

## Working with Album Pagination

**Paged Pagination (Added v4.0.1)**:

Album views use true paged pagination instead of infinite scroll to prevent memory issues with large albums.

**Key Components**:

- `usePagedPagination` hook (`frontend/src/hooks/usePagedPagination.ts`) - Replaces items on page change (not accumulative)
- `Pagination` component (`frontend/src/components/Pagination.tsx`) - Page number navigation UI

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

## Working with Checklists

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

## Working with Trip Health Check

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

## Working with Backup & Restore

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

## Working with Trip Collaboration

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

## Working with Global Search

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

## Working with Batch Operations

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

## Working with Auto-Save Drafts

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
