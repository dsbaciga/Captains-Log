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

### Clicking a linked item should navigate to that item

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Clicking on linked entities in LinkPanel did nothing
- **Fix**: Added navigation handler using `useNavigate()` that closes the panel and navigates to the appropriate tab on the trip detail page with a hash containing entity type and ID for future scroll/highlight support

### Linking photos list doesn't paginate

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Photo selection modal loaded all photos at once, causing performance issues with large collections
- **Fix**: Added pagination to `useEntityFetcher.ts` and `GeneralEntityPickerModal.tsx` with 24 photos per page and a "Load More" button showing remaining count

### Inconsistent Edit and Delete buttons across entity managers

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Edit/Delete button styling varied across manager components (JournalManager used button classes while others used text links)
- **Fix**: Updated JournalManager to use consistent text-based link styling (blue Edit, red Delete) matching TransportationManager, LodgingManager, and ActivityManager

### Locations needs its own manager component

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Location management was embedded directly in TripDetailPage instead of having a dedicated manager component
- **Fix**: Created new `LocationManager.tsx` component following established patterns (useManagerCRUD, useFormFields, useConfirmDialog) and updated TripDetailPage to use it, reducing that file by ~400 lines

### Albums should use linking strategy and modal

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Album cards in AlbumsPage were missing LinkButton for EntityLink integration
- **Fix**: Added `useTripLinkSummary` hook and `LinkButton` component to album cards in AlbumsPage.tsx, matching the pattern used in ActivityManager

### Move Print button to right side

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: Print button was positioned on the left side of the Timeline header
- **Fix**: Changed action buttons container in Timeline.tsx to use `justify-between`, positioning Weather Refresh on left and Print on right

### Timeline timezone layout should be spaced further apart (trip left, home right)

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: In dual timezone mode, both times appeared on the left with insufficient separation
- **Fix**: Updated TimelineDaySection.tsx and TimelineEventCard.tsx to use `justify-between` layout with trip time on LEFT (blue dot indicator) and home time on RIGHT (gray dot indicator) with clear visual separation

### No button to add unscheduled entities (needs type picker)

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: The Unscheduled page had no unified way to add new items - users had to navigate to each tab separately
- **Fix**: Added a unified "Add Item" button to UnscheduledItems.tsx that opens a modal chooser allowing users to select the entity type (Activity, Transportation, or Lodging). Also added full create functionality with appropriate forms and service calls.

### Car transportation shows distance twice instead of 3 stats

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: In TransportationStats, the stats grid for non-flight transportation showed Distance twice - once in the grid and again in the detail cards below
- **Fix**: Changed the fourth stat in the grid from "Distance (km)" to "Travel Time" in TransportationStats.tsx. Distance is now shown only in the detail card below, consistent with the flight statistics pattern.

### Car route not showing on minimap (shows flight path instead)

- **Reported**: 2026-01-16
- **Fixed**: 2026-01-17
- **Priority**: Low
- **Component**: Frontend
- **Issue**: When no route geometry was available from OpenRouteService, car/bike/walking transportation showed a curved "flight arc" path instead of a straight line
- **Fix**: Updated FlightRouteMap.tsx to use different fallback behavior based on transportation type:
  - Flights: Continue to use curved arc path (represents flight trajectory)
  - Ground transportation (car, bike, walk, etc.): Use straight line when no geometry (indicates no actual route data available)
  - Both types use dashed lines when showing fallback/estimated routes

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
