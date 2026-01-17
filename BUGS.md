# Bugs to Fix

This file tracks known bugs and issues in the Travel Life application.

## Open Bugs

### High Priority

_No high priority bugs currently tracked._

### Medium Priority

_No medium priority bugs currently tracked._

### Low Priority

_No low priority bugs currently tracked._

## Fixed Bugs

### Add/Edit modals for entities are too busy, need better UI/UX

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Add/Edit modals for transportation, lodging, and activities felt cluttered and overwhelming with too many form fields displayed at once
- **Fix**: Created new `FormSection.tsx` component with collapsible sections for progressive disclosure. Updated TransportationManager, LodgingManager, and ActivityManager to organize fields into logical groups (Type, Route, Schedule, etc.) with advanced/optional fields hidden behind "Show More Options" toggle.

### Timeline item icons (photos, locations, links) are misaligned

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Photo count, location marker, and link icons in timeline item footers had inconsistent vertical alignment
- **Fix**: Updated `EventLinkBar.tsx` and `TimelineEventCard.tsx` to use consistent `h-6` height, `items-center justify-center`, and `leading-none` on all badges. Wrapped emojis in fixed-dimension containers for proper centering.

### Trip times do not align under timezone headers on timeline

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Times were misaligned with their respective timezone headers in dual timezone display
- **Fix**: Updated `TimelineDaySection.tsx` and `TimelineEventCard.tsx` with matching column widths (`w-11` spacer for icon, `w-32` for each time column) to ensure times align directly under their corresponding timezone headers.

### Photo selection buttons are busy and confusing

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Photo selection interface had cluttered button layout that was confusing to use
- **Fix**: Redesigned `PhotoGallery.tsx` and `AddPhotosToAlbumModal.tsx` with clear visual grouping (selection status badge, selection controls group, actions group), consistent SVG icons with tooltips, clear visual hierarchy (primary/secondary/danger actions), and proper dark mode support.

### Remove Cover Photo has no confirmation dialog

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Cover photo was removed immediately without any confirmation when clicking "Remove Cover Photo"
- **Fix**: Updated `TripDetailPage.tsx` to use the existing `useConfirmDialog` hook before removing cover photo, showing a warning dialog with "Remove Cover Photo" title and confirmation message.

### Photo thumbnails broken on hover in timeline

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Photo thumbnails were broken or not displaying correctly when hovering over timeline items
- **Fix**: Updated `PhotoPreviewPopover.tsx` to use `getFullAssetUrl()` helper for correct URL construction. Added support for Immich photos by fetching with auth headers and caching blob URLs. Added error handling to hide broken images gracefully.

### Last day of trip missing weather on timeline

- **Reported**: 2026-01-15
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Weather data was not displayed on the final day of a trip in the Timeline view due to a timezone mismatch in date key formatting
- **Fix**: Updated `generateAllTripDates()` function in Timeline.tsx to use `tripTimezone` when formatting dates. The `Intl.DateTimeFormat` formatter was missing the `timeZone` option, causing date keys to use the browser's local timezone instead of the trip timezone. This mismatch meant weather data (keyed using trip timezone) couldn't be looked up correctly when the user's local timezone differed from the trip timezone.

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
