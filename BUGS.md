# Bugs to Fix

This file tracks known bugs and issues in the Travel Life application.

## Open Bugs

### High Priority

_No high priority bugs currently tracked._

### Medium Priority

_No medium priority bugs currently tracked._

### Low Priority

_No low priority bugs currently tracked._

#### No button to add unscheduled entities (needs type picker)

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to Unscheduled page
  2. Expected: Should have a unified "Add" button that allows picking entity type
  3. Actual: Each tab has its own Add button, but no unified entry point
- **Notes**: Consider adding a primary action button that lets users pick the entity type to add

#### Car transportation shows distance twice instead of 3 stats

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. View Transportation stats for cars
  2. Expected: Should show 3 different stats at the top
  3. Actual: Distance appears twice
- **Notes**: Consolidate stats display to show 3 unique metrics instead of duplicating distance

#### Updating transportation hides all transportation entities until refresh

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Edit and save a transportation entity
  2. Expected: Transportation list should update and remain visible
  3. Actual: All transportation items disappear until page refresh
- **Notes**: Likely a state management or query invalidation issue

#### Car route not showing on minimap (shows flight path instead)

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. View a car transportation item with route on minimap
  2. Expected: Should show road route
  3. Actual: Shows straight line (flight path) instead of road route
- **Notes**: Backend may be providing route geometry, but frontend minimap not rendering it correctly for cars

#### Clicking a linked item should navigate to that item

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Open LinkPanel showing linked entities
  2. Click on a linked entity
  3. Expected: Should navigate to/highlight/scroll to that entity
  4. Actual: Nothing happens
- **Notes**: Improve UX by making linked items clickable and navigating to the referenced entity

#### Linking photos list doesn't paginate

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Open photo linking modal for a trip with many photos
  2. Expected: Should have pagination or infinite scroll
  3. Actual: All photos load at once, causing performance issues
- **Notes**: Add pagination to photo selection in GeneralEntityPickerModal

#### Inconsistent Edit and Delete buttons across entity managers

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Review Edit/Delete button placement across different entity managers
  2. Expected: Consistent button styling, placement, and behavior
  3. Actual: Buttons appear in different locations or with different styles
- **Notes**: Standardize button placement and styling across all entity manager components

#### Locations needs its own manager component

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Review location management UI
  2. Expected: Should have dedicated LocationManager like other entities
  3. Actual: Location management is embedded in TripDetailPage
- **Notes**: Extract location management into dedicated LocationManager component for consistency and maintainability

#### Albums should use linking strategy and modal

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Try to link albums to other entities
  2. Expected: Should use unified EntityLink system with LinkButton/LinkPanel
  3. Actual: Albums may still use old linking approach
- **Notes**: Migrate albums to use EntityLink system for consistency with other entities

#### Move Print button to right side

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. View Timeline with Print button
  2. Expected: Print button should be positioned on right side of header
  3. Actual: Print button may be on left or in inconsistent position
- **Notes**: UI/UX improvement for better visual hierarchy

#### Timeline timezone layout should be spaced further apart (trip left, home right)

- **Reported**: 2026-01-16
- **Status**: Open
- **Priority**: Low
- **Component**: Frontend
- **Steps to Reproduce**:
  1. View Timeline with dual timezone display enabled
  2. Observe timezone headers and time positions
  3. Expected: Trip timezone should be on LEFT side of cards, home timezone on RIGHT side, with headers aligned accordingly and clear separation between them
  4. Actual: Both times are currently on the left side with insufficient separation
- **Notes**: User prefers trip time (primary context) on left, home time (secondary reference) on right for more intuitive reading. Need better visual separation between the two timezone columns

## Fixed Bugs

### User default timezone not showing end time on timeline

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: In dual timezone display mode, the user's home timezone column was not showing end times consistently, and the timezone abbreviation was embedded within the time span instead of being separate
- **Fix**: Updated `renderHomeTime()` function in `TimelineEventCard.tsx` to properly display end times with separate styling for the time and timezone abbreviation. The function now returns start time, end time (if present), and timezone abbreviation in separate elements for proper formatting.

### User default timezone not showing on check-in/check-out times

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Lodging check-in and check-out times in the user's home timezone column lacked the "Check-in:" and "Check-out:" labels that were shown in the trip timezone column
- **Fix**: Updated `renderHomeTime()` in `TimelineEventCard.tsx` to include "Check-in:" and "Check-out:" labels for lodging time display, matching the format used in `renderTripTime()` for consistency.

### Remove options for old linking methods

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: TimelineEditModal still had legacy multi-select dropdowns for linking journal entries to activities, lodging, and transportation using old assignment-based approach instead of unified EntityLink system
- **Fix**: Removed legacy linking UI from TimelineEditModal:
  - Removed `locationIds`, `activityIds`, `lodgingIds`, `transportationIds` from journal form state
  - Removed multi-select dropdown fields for linking
  - Updated `submitJournal()` to only send title, content, and date
  - Added helpful tip directing users to use the Link button (🔗) on the timeline after saving
  - Deleted 5 backup files (*.backup) that were no longer needed

### Flights should only show airport names, not full addresses, on timeline

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Flight items on the timeline showed full addresses (e.g., "LAX (123 Airport Blvd, Los Angeles, CA)") which made the display cluttered
- **Fix**: Modified the `getLocationDisplay()` function in `Timeline.tsx` to accept a transport type parameter. For flights (`transportType === 'flight'`), the function now returns only the location name without the address. Other transportation types (car, train, bus) continue to show the address for context.

### Clicking Link with no existing links should skip to Add Link modal

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: When clicking the Link button on an entity with no existing links, users had to see an empty list first before clicking "Add Link"
- **Fix**: Added a `useEffect` in `LinkPanel.tsx` that automatically opens the Add Link modal (`setShowAddLinkModal(true)`) when the link data finishes loading and there are no existing links (`linksData.summary.totalLinks === 0`).

### Linked entities on timeline should show names in tooltip on hover

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Hovering over linked entity badges (📍 2, 🏨 1, etc.) in the timeline showed no information about what was actually linked
- **Fix**: Created new `EntityLinkTooltip.tsx` component that:
  - Uses lazy loading to fetch link details only when hovered (300ms delay)
  - Shows a styled tooltip with the names of linked entities
  - Limits display to 5 items with a "+X more" indicator
  - Caches results for 1 minute to avoid repeated requests
  - Updated `EventLinkBar.tsx` to wrap non-photo entity badges with this tooltip component

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
