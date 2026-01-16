# Bugs to Fix

This file tracks known bugs and issues in the Travel Life application.

## Open Bugs

### High Priority

_No high priority bugs currently tracked._

### Medium Priority

_No medium priority bugs currently tracked._

### Low Priority

#### Add/Edit modals for entities are too busy, need better UI/UX

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Open any Add or Edit modal (transportation, lodging, activity, etc.)
  2. Observe the layout and density of form fields
  3. Expected: Clean, organized form with good visual hierarchy
  4. Actual: Modals feel cluttered and overwhelming
- **Notes**: Consider grouping related fields, using tabs/accordions, improving spacing, or progressive disclosure to show advanced options only when needed

#### Timeline item icons (photos, locations, links) are misaligned

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to Timeline view
  2. View an item with multiple icons (photos count, location pin, link icon)
  3. Expected: Icons should be vertically aligned
  4. Actual: Icons appear at different vertical positions
- **Notes**: The photo count, location marker, and link icons in the timeline item footer need consistent alignment

#### Last day of trip missing weather on timeline

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to Timeline view for a completed trip
  2. Scroll to the last day of the trip
  3. Expected: Weather should be displayed for the last day like other days
  4. Actual: Weather is missing on the final day
- **Notes**: Likely an off-by-one error in date range calculation or weather data fetching

#### Trip times do not align under timezone headers on timeline

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to Timeline view for a trip with dual timezone display
  2. Observe the time display under the timezone headers (e.g., CST/CDT and EST/EDT)
  3. Expected: Times should be aligned directly under their respective timezone headers
  4. Actual: Times are misaligned with the headers above them
- **Notes**: CSS alignment issue in the dual timezone time display

#### Photo selection buttons are busy and confusing

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to photo selection interface (e.g., when selecting photos for an album or linking)
  2. Observe the button layout and options
  3. Expected: Clear, organized button layout with intuitive grouping
  4. Actual: Buttons appear cluttered and confusing to use
- **Notes**: Consider grouping related actions, using icons with tooltips, or reorganizing the button hierarchy

#### Remove Cover Photo has no confirmation dialog

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to a trip or album with a cover photo set
  2. Click "Remove Cover Photo"
  3. Expected: A confirmation dialog should appear asking "Are you sure?"
  4. Actual: Cover photo is removed immediately without confirmation
- **Notes**: Destructive actions should have confirmation to prevent accidental clicks

#### Photo thumbnails broken on hover in timeline

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to Timeline view for a trip with photos
  2. Hover over a timeline item that has photos
  3. Expected: Photo thumbnails should appear on hover
  4. Actual: Thumbnails are broken or not displaying correctly
- **Notes**: Thumbnail hover functionality may be missing or the image paths may be incorrect

## Fixed Bugs

### Unscheduled page only supports activities, not transportation or lodging

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Unscheduled page only showed activities; transportation and lodging without dates were not visible or manageable
- **Fix**: Major refactor of UnscheduledActivities component → renamed to UnscheduledItems
  - Created new `UnscheduledItems.tsx` component with tabbed interface
  - Added support for Activities, Transportation, and Lodging tabs
  - Each tab fetches and displays unscheduled items of that type
  - Added "Add" buttons for all three entity types
  - Updated TripDetailPage.tsx to use new UnscheduledItems component

### Timeline print creates blank document

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Print preview showed blank document when printing timeline
- **Fix**: Updated print CSS media queries in Timeline.tsx to properly display content when printing
  - Fixed display properties for print media
  - Ensured timeline events and sections are visible in print mode
  - Maintained proper layout and formatting for printed output

### Car stats and flight stats have inconsistent stat categories

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Car and other transportation stats only showed total trips and distance, missing upcoming/completed breakdown that flight stats had
- **Fix**: Updated TransportationStats.tsx to provide consistent stats across all transportation types
  - Extended TypeStats interface to include `upcoming` and `completed` fields for all types
  - Added tracking logic to count upcoming vs completed for all transportation types
  - Updated display to show Upcoming and Completed badges for cars, trains, buses, etc.
  - Unified layout with 2-4 column grid matching flight stats structure
  - Now all transportation types show: Total Trips, Upcoming, Completed, Distance (if available)

### Journal entry link selection uses different mechanism than other entities

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Journal entries used old assignment-based linking instead of unified EntityLink system
- **Fix**: Migrated JournalManager.tsx to use unified EntityLink system
  - Replaced old assignment UI with LinkButton and LinkPanel components
  - Journal entries now use same linking mechanism as all other entities
  - Removed legacy assignment-based code
  - Fully integrated with EntityLink backend system

### Car routes not displayed on transportation minimap

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Backend
- **Issue**: No route geometry was displayed for car, bicycle, and walk transportation types on minimaps. The backend only attempted to fetch route geometry if `distanceSource === 'route'`, which excluded cases where OpenRouteService was unavailable during initial calculation or became available later.
- **Fix**: Modified `enhanceTransportations()` method in `backend/src/services/transportation.service.ts` (line 185-216) to always attempt route geometry fetching for road-based transportation types (car, bicycle, walk), regardless of `distanceSource` value. The routing service handles caching and graceful fallbacks, so this change allows existing transportation to show routes if OpenRouteService becomes available.

### Cannot add activity from Unscheduled page

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: No option or button to add an activity from the Unscheduled page, only edit functionality existed
- **Fix**: Added "+ Add Activity" button and create mode support to UnscheduledActivities.tsx
  - Added `showForm` state to control form visibility
  - Added `handleAdd()` function to open the form for creating new activities
  - Modified `handleSubmit()` to support both create and update modes
  - Updated form title and button labels to reflect create vs edit mode
  - Activities created without dates/times automatically appear in the unscheduled view

### Timeline expanded mode doesn't expand minimaps

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Minimaps remained collapsed regardless of timeline view mode
- **Fix**: Added `defaultExpanded={viewMode === 'standard'}` prop to DayMiniMap component in TimelineDaySection.tsx (line 204)

### Child location album boxes invisible due to matching background color

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Album boxes on child location cards had same background as parent card
- **Fix**: Updated AssociatedAlbums.tsx to use `bg-white dark:bg-gray-800` with border `border-gray-200 dark:border-gray-600` for visual distinction (line 33)

### Photo linking shows only photo numbers, not thumbnails

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Photo selection showed only numbers/IDs instead of visual thumbnails
- **Fix**:
  - Added `thumbnailPath` field to EntityItem type in useEntityFetcher.ts
  - Updated LinkPanel.tsx to display photo thumbnails (lines 271-280)
  - Updated GeneralEntityPickerModal.tsx to show thumbnails when selecting photos (lines 178-188)

### Add Location form is not in a modal

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-16
- **Priority**: Medium
- **Component**: Frontend
- **Issue**: Location form displayed inline instead of in modal dialog like other entities
- **Fix**: Wrapped location form in FormModal component in TripDetailPage.tsx with proper footer buttons (lines 1252-1349)

---

## Bug Template

When adding a new bug, use this template:

```markdown
### [Brief Description]

- **Reported**: YYYY-MM-DD
- **Status**: Open | In Progress | Fixed
- **Priority**: High | Medium | Low
- **Component**: Frontend | Backend | Database | Infrastructure
- **Steps to Reproduce**:
  1. Step one
  2. Step two
  3. Expected vs actual behavior
- **Notes**: Any additional context
```
