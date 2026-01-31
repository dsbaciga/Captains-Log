# UI Improvements Tracker

This document tracks progress on planned UI/UX improvements for Travel Life.

**Created:** 2026-01-18
**Last Updated:** 2026-01-18

---

## Status Legend

- [ ] Not started
- [x] Completed
- 🔄 In progress
- ⏸️ On hold

---

## User Flow Improvements

### Dashboard & Navigation

| Status | Feature              | Description                                                                                    | Priority |
| ------ | -------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| [x]    | Smart empty states   | Guide new users with multi-step onboarding and actionable prompts instead of blank screens     | High     |
| [x]    | Kanban view of trips | Visual pipeline showing trips by status (Dream → Planning → Planned → In Progress → Completed) | Medium   |
| [x]    | Floating context bar | Keep key trip info (dates, destination, countdown) visible when scrolling                      | Medium   |

### Trip Detail Experience

| Status | Feature                  | Description                                                                        | Priority |
| ------ | ------------------------ | ---------------------------------------------------------------------------------- | -------- |
| [x]    | Grouping related tabs    | Consolidate 9+ tabs into logical groups: Overview, Plan, Memories, People & Places | High     |
| [x]    | Cross-entity quick links | Show mini-gallery of linked photos and activities when viewing a location          | Medium   |

### Photo Management

| Status | Feature                    | Description                                                                 | Priority |
| ------ | -------------------------- | --------------------------------------------------------------------------- | -------- |
| [x]    | Batch operation toolbar    | Floating toolbar for bulk actions when multiple photos selected             | High     |
| [ ]    | Smart album suggestions    | Suggest albums based on date clustering and location proximity after upload | Medium   |
| [x]    | Map view for photos        | Map tab showing geotagged photos as markers with click-to-view              | Medium   |
| [x]    | Photo timeline integration | Inline photo thumbnails in timeline with "View all X photos" expansion      | Medium   |

### Data Visualization

| Status | Feature                    | Description                                                    | Priority |
| ------ | -------------------------- | -------------------------------------------------------------- | -------- |
| [ ]    | Relationship visualization | Graph/connection map showing how entities relate to each other | Low      |

---

## Visual Appeal Improvements

### Typography & Hierarchy

| Status | Feature                   | Description                                                           | Priority |
| ------ | ------------------------- | --------------------------------------------------------------------- | -------- |
| [x]    | Larger bolder trip titles | Oversized serif display type for trip names on detail pages           | High     |
| [x]    | Date formatting polish    | Natural language dates ("March 15-22, 2024", "In 2 weeks") throughout | High     |
| [ ]    | Location name hierarchy   | Place name large with city/country smaller below                      | Medium   |

### Theme & Colors

| Status | Feature              | Description                                                                 | Priority |
| ------ | -------------------- | --------------------------------------------------------------------------- | -------- |
| [x]    | Dark mode refinement | More prominent gold accents, subtle gradients, glowing interactive elements | Medium   |

### Cards & Layout

| Status | Feature                     | Description                                                           | Priority |
| ------ | --------------------------- | --------------------------------------------------------------------- | -------- |
| [x]    | Trip card redesign          | Larger cover photo (60%), status ribbon, gradient overlay, stat icons | High     |
| [ ]    | Compact list view for trips | Dense table view with thumbnails, doubled page size (40 trips)        | Medium   |

### Maps

| Status | Feature             | Description                                                                         | Priority |
| ------ | ------------------- | ----------------------------------------------------------------------------------- | -------- |
| [ ]    | Custom map styling  | Theme-aware map tiles (warm vintage light / dark navy) with user toggle in settings | Medium   |
| [x]    | Location clustering | Cluster nearby markers with count badge that expands on click                       | Medium   |

### Animations & Micro-interactions

| Status | Feature                      | Description                                                                 | Priority |
| ------ | ---------------------------- | --------------------------------------------------------------------------- | -------- |
| [x]    | Celebratory animations       | Confetti/animations for completing activities, trip completion, first photo | Medium   |
| [ ]    | Status transition animations | Visual transitions when changing trip status                                | Low      |
| [x]    | Card hover effects           | Lift, glow, and subtle photo zoom on trip card hover                        | Medium   |
| [ ]    | Themed loading states        | Spinning compass, flying airplane based on context                          | Low      |

---

## Implementation Notes

### Smart Empty States

**Locations updated:**

- [x] Dashboard (UpcomingTripsWidget)
- [x] Trip photos tab (PhotoGallery)
- [x] Trip activities tab (ActivityManager)
- [x] Trip journal tab (JournalManager)
- [x] Trip locations tab (LocationManager)
- [x] Trip transportation tab (TransportationManager)
- [x] Trip lodging tab (LodgingManager)
- [x] Albums page (GlobalAlbumsPage)
- [x] Companions page (CompanionsPage)
- [x] Trips page (TripsPage)

**Design implemented:**

- SVG illustrations from EmptyIllustrations component
- Actionable primary button with clear CTA
- Inspiring messages and helpful tips
- Consistent styling across all managers

---

### Tab Grouping Implementation

**New structure (5 groups):**

1. **Overview** - Timeline + TripStats summary component
2. **Plan** - Activities, Transport, Lodging, Unscheduled (with sub-tabs)
3. **Memories** - Photos, Journal (with sub-tabs)
4. **Places** - Locations with map
5. **People** - Companions

**Components created:**

- `TabGroup.tsx` - Reusable grouped tab navigation
- `TripStats.tsx` - Quick stats summary with clickable cards

---

### Date Formatting Implementation

**Utilities added to `dateFormat.ts`:**

| Function                                  | Purpose                  | Example Output           |
| ----------------------------------------- | ------------------------ | ------------------------ |
| `formatTripDates(start, end)`             | Natural date range       | "Mar 15-22, 2024"        |
| `getRelativeDateDescription(date)`        | Extended relative time   | "In 2 weeks"             |
| `formatTripDatesWithRelative(start, end)` | Combined display         | "In 2 weeks (Mar 15-22)" |
| `getTripDateStatus(start, end)`           | Human-readable status    | "Starts tomorrow"        |
| `formatSingleDate(date)`                  | Single date with weekday | "Saturday, Mar 15"       |
| `getTripDurationDays(start, end)`         | Duration in days         | 8                        |
| `formatTripDuration(start, end)`          | Readable duration        | "8 days"                 |

---

### Trip Card Redesign Implementation

**New `TripCard.tsx` component features:**

- Cover photo area: ~60% height with gradient overlay
- Status ribbon badge: Color-coded by status (purple=Dream, blue=Planning, etc.)
- Content area: Serif title, description, natural date format
- Stats row: Location, photo, and transportation counts with icons
- Hover effects: Lift (-translate-y-1), photo zoom (scale-110)
- Responsive: Works in 1/2/3 column grids

**Backend changes:**

- Added `_count` to trip list query for entity counts

---

## Progress Log

### 2026-01-18

- Created UI improvements tracking document
- Prioritized features into High/Medium/Low
- Added implementation notes for key features

### 2026-01-18 (Implementation)

**Completed 6 High Priority Features:**

1. Smart empty states - All managers updated with EmptyIllustrations
2. Tab grouping - New TabGroup and TripStats components
3. Batch photo toolbar - New BatchPhotoToolbar with floating UI
4. Larger trip titles - CSS classes with Crimson Pro serif font
5. Date formatting - Extended utilities with natural language support
6. Trip card redesign - New TripCard with cover photos and stats

**Code Review Fixes Applied:**

- Replaced alert() with toast() in PhotoGallery
- Fixed unused variables and props
- Added missing useEffect dependencies
- Improved TypeScript types in backend

### 2026-01-18 (Dark Mode Refinement)

**Dark Mode Enhancements Completed:**

1. **More Prominent Gold Accents**
   - Border opacity increased from 10% to 20%
   - Consistent gold color usage across all components (replaced sky with gold)
   - Enhanced hover states with gold/40 for clearer feedback

2. **Subtle Gradient Backgrounds**
   - Body: Top-to-bottom gradient (navy-900 → navy-800)
   - Cards: Diagonal gradient for depth
   - Fixed background attachment for smooth scrolling

3. **Glow Effects on Interactive Elements**
   - Buttons: `box-shadow: 0 0 20px rgba(251,191,36,0.25)` on hover
   - Inputs: Subtle glow on focus
   - Cards: Ambient glow on hover
   - FAB: Enhanced glow effect

4. **Consistency Fixes**
   - Modal backgrounds: gray-800 → navy-800
   - Modal borders: gold/20 for cohesion
   - Added `sky` color to Tailwind config

**Files Updated:**

- `tailwind.config.js` - Glow shadow utilities
- `index.css` - Enhanced component styles
- `Modal.tsx`, `FormModal.tsx` - Navy backgrounds
- `Navbar.tsx`, `TabGroup.tsx`, `TripCard.tsx` - Gold accents

---

---

## Planned Feature: Compact List View for Trips

### Overview

Add a dense table/list view option for trips alongside the existing card grid and kanban views. This view prioritizes information density and quick scanning over visual appeal.

### Current State

- **View modes**: Grid (default), Kanban
- **Page size**: 20 trips per page
- **Grid layout**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **View toggle**: Two buttons in TripsPage header

### Proposed Design

**List View Layout:**

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [Cover] │ Trip Name          │ Dates           │ Status  │ Loc │ Photos │ Actions │
│ 48x36   │ Description...     │ Duration        │ Badge   │  #  │   #    │ ⋮ menu  │
├─────────┼────────────────────┼─────────────────┼─────────┼─────┼────────┼─────────┤
│ [img]   │ **Japan 2024**     │ Mar 15-22, 2024 │ [Done]  │ 12  │  156   │    ⋮    │
│         │ Two weeks exploring│ 8 days          │         │     │        │         │
├─────────┼────────────────────┼─────────────────┼─────────┼─────┼────────┼─────────┤
│ [img]   │ **Iceland Road...**│ Jun 1-10, 2024  │ [Plan]  │  8  │   42   │    ⋮    │
│         │ Ring road adventure│ 10 days         │         │     │        │         │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Mobile Responsive:**

On mobile (`< md`), show simplified rows:

```text
┌─────────────────────────────────────────┐
│ [img] │ **Trip Name**     │ [Status] │ ⋮│
│ 40x40 │ Mar 15-22 • 8 days│          │  │
└─────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: View Mode State & Toggle

1. **Update view mode state** in TripsPage.tsx:
   ```typescript
   type ViewMode = 'grid' | 'kanban' | 'list';
   const [viewMode, setViewMode] = useState<ViewMode>('grid');
   ```

2. **Add list view icon** to view toggle buttons:
   - Grid icon (existing)
   - Kanban icon (existing)
   - List icon (horizontal lines) - new

3. **Persist view preference** to localStorage via `scrollStore` or new setting

#### Phase 2: TripListView Component

Create `frontend/src/components/TripListView.tsx`:

**Props:**

```typescript
interface TripListViewProps {
  trips: Trip[];
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: string) => void;
  onStatusChange: (tripId: string, status: TripStatus) => void;
}
```

**Features:**

- Sortable columns (click header to sort)
- Small cover photo thumbnails (48x36px with object-cover)
- Status badge (color-coded, same as cards)
- Hover row highlight
- Action menu (edit, delete, change status)
- Click row to navigate to trip detail

**Styling (following Style Guide):**

```css
/* Table header */
.trip-list-header {
  @apply bg-parchment dark:bg-navy-800 border-b border-primary-100 dark:border-gold/20;
  @apply text-sm font-medium text-slate dark:text-warm-gray;
}

/* Table row */
.trip-list-row {
  @apply bg-white dark:bg-navy-800/50 border-b border-warm-gray/20 dark:border-gold/10;
  @apply hover:bg-primary-50 dark:hover:bg-navy-700/50 transition-colors;
  @apply cursor-pointer;
}

/* Thumbnail */
.trip-list-thumbnail {
  @apply w-12 h-9 rounded object-cover;
  @apply ring-1 ring-primary-100 dark:ring-gold/20;
}
```

#### Phase 3: Pagination Adjustment

1. **Conditionally set page size** based on view mode:

   ```typescript
   const pageSize = viewMode === 'list' ? 40 : 20;
   ```

2. **Update query** when view mode changes to refetch with new limit

3. **Reset to page 1** when switching view modes

#### Phase 4: Column Sorting

1. **Sortable columns**: Name, Dates, Status, Location Count, Photo Count
2. **Sort state**: `{ column: string, direction: 'asc' | 'desc' }`
3. **Visual indicator**: Arrow icon in sorted column header
4. **Integration**: Pass sort params to API or sort client-side

### List View Files to Create/Modify

| File                                       | Action | Description                                        |
| ------------------------------------------ | ------ | -------------------------------------------------- |
| `frontend/src/components/TripListView.tsx` | Create | New list view component                            |
| `frontend/src/pages/TripsPage.tsx`         | Modify | Add list view mode, toggle, pagination adjustment  |
| `frontend/src/index.css`                   | Modify | Add list view styles                               |
| `frontend/src/components/icons/index.tsx`  | Modify | Add ListIcon if not present                        |

### List View Accessibility Considerations

- Table uses proper `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements
- Sortable columns use `aria-sort` attribute
- Row click has keyboard support (Enter/Space)
- Action menu accessible via keyboard

### List View Testing Checklist

- [ ] View toggle switches between all three modes
- [ ] List view displays all trip data correctly
- [ ] Thumbnails load and display properly
- [ ] Status badges match card view colors
- [ ] Sorting works for all sortable columns
- [ ] Pagination shows 40 items in list view
- [ ] Row click navigates to trip detail
- [ ] Action menu works (edit, delete, status change)
- [ ] Mobile responsive layout works
- [ ] Dark mode styling correct
- [ ] Keyboard navigation functional

---

## Planned Feature: Custom Map Styling

### Map Styling Overview

Add theme-aware map tiles that match the application's visual aesthetic. Light mode uses warm, vintage-style tiles; dark mode uses navy/dark tiles. Users can toggle this feature off in settings to use standard OpenStreetMap tiles.

### Map Current State

- **Tile provider**: OpenStreetMap only (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Dark mode**: Maps do NOT change in dark mode (always light)
- **Map components**: TripLocationsMap, PlacesVisitedMap, TripMap, FlightRouteMap
- **No user preference**: No setting to control map appearance

### Map Proposed Design

**Tile Providers:**

| Mode             | Style       | Provider                                              | Description                       |
| ---------------- | ----------- | ----------------------------------------------------- | --------------------------------- |
| Light (Custom)   | Warm/Vintage| Stadia Stamen Watercolor OR Carto Positron            | Warm sepia tones, artistic feel   |
| Light (Alt)      | Clean Warm  | Stadia Alidade Smooth                                 | Clean with warm undertones        |
| Dark (Custom)    | Navy/Dark   | Carto Dark Matter OR Stadia Alidade Smooth Dark       | Dark navy matching app theme      |
| Standard         | Default OSM | OpenStreetMap                                         | Classic OSM tiles (user fallback) |

**Recommended Primary Choices:**

1. **Light Mode**: `Stadia Alidade Smooth` - Clean, warm, professional
   - URL: `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png`

2. **Dark Mode**: `Stadia Alidade Smooth Dark` - Dark, matches navy theme
   - URL: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png`

3. **Fallback**: Standard OSM tiles (free, no API key)

**Note**: Stadia Maps offers free tier (200,000 tiles/month) suitable for personal use.

### User Setting

Add toggle in Settings page under Appearance section:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Appearance                                                      │
├─────────────────────────────────────────────────────────────────┤
│ Theme                    [Light ▾]                              │
│                                                                 │
│ Custom Map Style         [Toggle: ON/OFF]                       │
│ Use themed map tiles that match the app's look.                 │
│ Turn off to use standard OpenStreetMap tiles.                   │
└─────────────────────────────────────────────────────────────────┘
```

### Map Implementation Plan

#### Phase 1: Map Tile Configuration

1. **Create map config utility** `frontend/src/utils/mapConfig.ts`:

   ```typescript
   export interface MapTileConfig {
     url: string;
     attribution: string;
     maxZoom: number;
   }

   export const MAP_TILES = {
     standard: {
       url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
       attribution: '© OpenStreetMap contributors',
       maxZoom: 19,
     },
     light: {
       url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
       attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap',
       maxZoom: 20,
     },
     dark: {
       url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
       attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap',
       maxZoom: 20,
     },
   } as const;

   export function getMapTileConfig(
     isDarkMode: boolean,
     useCustomStyle: boolean
   ): MapTileConfig {
     if (!useCustomStyle) return MAP_TILES.standard;
     return isDarkMode ? MAP_TILES.dark : MAP_TILES.light;
   }
   ```

#### Phase 2: User Setting

1. **Add setting to User model** (backend):

   ```prisma
   model User {
     // ... existing fields
     useCustomMapStyle Boolean @default(true)
   }
   ```

2. **Create migration**: `npx prisma migrate dev --name add_custom_map_style_setting`

3. **Update settings API** to include new field

4. **Add toggle in Settings page** (frontend):
   - Section: Appearance (alongside Theme toggle)
   - Label: "Custom Map Style"
   - Description: "Use themed map tiles that match the app's look"
   - Default: ON (enabled)

#### Phase 3: Update Map Components

Create a **reusable hook** `frontend/src/hooks/useMapTiles.ts`:

```typescript
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { getMapTileConfig } from '@/utils/mapConfig';

export function useMapTiles() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const user = useAuthStore((s) => s.user);
  const useCustomStyle = user?.useCustomMapStyle ?? true;

  return getMapTileConfig(isDarkMode, useCustomStyle);
}
```

**Update each map component** to use the hook:

```typescript
// Before
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='&copy; OpenStreetMap contributors'
/>

// After
const tileConfig = useMapTiles();

<TileLayer
  url={tileConfig.url}
  attribution={tileConfig.attribution}
  maxZoom={tileConfig.maxZoom}
/>
```

#### Phase 4: Dynamic Tile Switching

Handle theme changes without full page reload:

1. **Use `key` prop** on TileLayer to force re-render on config change:

   ```typescript
   <TileLayer
     key={`${tileConfig.url}-${isDarkMode}`}
     url={tileConfig.url}
     // ...
   />
   ```

2. **Or use Leaflet's `setUrl` method** for smoother transition (advanced)

### Map Files to Create/Modify

| File                                            | Action | Description                         |
| ----------------------------------------------- | ------ | ----------------------------------- |
| `frontend/src/utils/mapConfig.ts`               | Create | Tile configuration and helper       |
| `frontend/src/hooks/useMapTiles.ts`             | Create | Hook for getting current tile config|
| `backend/prisma/schema.prisma`                  | Modify | Add useCustomMapStyle field         |
| `backend/src/types/user.types.ts`               | Modify | Add field to types                  |
| `backend/src/services/user.service.ts`          | Modify | Handle new setting                  |
| `frontend/src/pages/SettingsPage.tsx`           | Modify | Add toggle UI                       |
| `frontend/src/components/TripLocationsMap.tsx`  | Modify | Use useMapTiles hook                |
| `frontend/src/components/PlacesVisitedMap.tsx`  | Modify | Use useMapTiles hook                |
| `frontend/src/components/TripMap.tsx`           | Modify | Use useMapTiles hook                |
| `frontend/src/components/FlightRouteMap.tsx`    | Modify | Use useMapTiles hook                |

### Tile Provider Comparison

| Provider      | Free Tier | API Key  | Quality   | Dark Mode |
| ------------- | --------- | -------- | --------- | --------- |
| OpenStreetMap | Unlimited | No       | Good      | No        |
| Stadia Maps   | 200k/mo   | Optional | Excellent | Yes       |
| Carto         | 75k/mo    | Yes      | Very Good | Yes       |
| Mapbox        | 50k/mo    | Yes      | Excellent | Yes       |

**Recommendation**: Stadia Maps - generous free tier, no API key required for basic use, excellent quality, theme variants.

### Visual Preview

**Light Mode (Alidade Smooth):**

- Soft beige/cream land colors
- Subtle blue water
- Clean typography
- Matches warm parchment app background

**Dark Mode (Alidade Smooth Dark):**

- Dark navy/charcoal land
- Darker blue water
- Light text labels
- Matches app's navy-900 background

### Fallback Behavior

1. If user disables custom style → Use standard OSM tiles
2. If tile provider fails to load → Automatically fall back to OSM
3. If user setting not loaded yet → Default to custom style ON

### Map Testing Checklist

- [ ] Light mode shows warm-toned tiles
- [ ] Dark mode shows dark navy tiles
- [ ] Theme toggle updates map tiles dynamically
- [ ] Settings toggle persists to database
- [ ] Disabling custom style shows standard OSM
- [ ] All map components use the hook
- [ ] Attribution displays correctly for each provider
- [ ] Tiles load within reasonable time
- [ ] Fallback works if provider unavailable
- [ ] No console errors or tile loading failures

---

## Related Documents

- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Overall project status
- [FEATURE_BACKLOG.md](FEATURE_BACKLOG.md) - Full feature backlog
- [FRONTEND_ARCHITECTURE.md](../app_architecture/FRONTEND_ARCHITECTURE.md) - Frontend patterns
