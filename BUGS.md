# Bugs to Fix

This file tracks known bugs and issues in the Travel Life application.

## Open Bugs

### High Priority

_No high priority bugs currently tracked._

### Medium Priority

#### Timeline expanded mode doesn't expand minimaps

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to a trip's Timeline view
  2. Toggle expanded mode
  3. Expected: Minimaps should expand along with other content
  4. Actual: Minimaps remain at their collapsed size
- **Notes**: The expanded mode toggle should affect minimap sizing

#### Child location album boxes invisible due to matching background color

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to the Locations page
  2. View a child location that has associated albums
  3. Expected: Album boxes should be visually distinct from the card background
  4. Actual: Album boxes have the same background color as the card, making them invisible
- **Notes**: Need to add contrasting background color or border to album boxes on child location cards

#### Photo linking shows only photo numbers, not thumbnails

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Open the entity linking panel for any entity
  2. Attempt to link photos
  3. Expected: Photo thumbnails should be displayed to identify photos
  4. Actual: Only photo numbers are shown, making it impossible to identify which photo is which
- **Notes**: LinkPanel or photo selector needs to display thumbnails for usability

#### Add Location form is not in a modal

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to the Locations page
  2. Click "Add Location"
  3. Expected: A modal dialog should appear for adding a new location
  4. Actual: Form is displayed inline or navigates away from the page
- **Notes**: Should be consistent with other entity forms that use modals

#### Cannot add activity from Unscheduled page

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to the Unscheduled page
  2. Attempt to add a new activity
  3. Expected: Should be able to add an activity from this page
  4. Actual: No option or button to add an activity, or the functionality is broken
- **Notes**: Users should be able to create unscheduled activities directly from this view

#### Unscheduled page only supports activities, not transportation or lodging

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to the Unscheduled page
  2. Observe only activities are displayed/supported
  3. Expected: Should show and support unscheduled transportation and lodging as well
  4. Actual: Only activities are available on the Unscheduled page
- **Notes**: Transportation and lodging can also be unscheduled (no date set) and should be manageable from this view

#### Car routes not displayed on transportation minimap

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Create a transportation entry with type "car"
  2. View the transportation minimap
  3. Expected: Route line should be displayed between origin and destination
  4. Actual: No route is shown for car transportation
- **Notes**: May need OpenRouteService integration or fallback to straight line. See ROUTING_SETUP.md for configuration.

#### Timeline print creates blank document

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Navigate to Timeline view
  2. Click the print button or use browser print (Ctrl+P)
  3. Expected: Printable version of the timeline should be generated
  4. Actual: Print preview shows a blank document
- **Notes**: Print styles may be missing or content may be hidden in print media query

#### Car stats and flight stats have inconsistent stat categories

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. View flight stats for a trip
  2. Note the available stat categories (e.g., upcoming, completed, total distance)
  3. View car stats for the same trip
  4. Expected: Car stats should show equivalent categories (upcoming, completed, etc.)
  5. Actual: Car stats is missing categories that flight stats has
- **Notes**: Both transportation type stats should be consistent and show upcoming/completed breakdowns

#### Journal entry link selection uses different mechanism than other entities

- **Reported**: 2026-01-15
- **Status**: Open
- **Priority**: Medium
- **Component**: Frontend
- **Steps to Reproduce**:
  1. Open the entity linking panel for a journal entry
  2. Compare the link selection UI to other entities (photos, activities, etc.)
  3. Expected: Journal entries should use the same LinkPanel/link selection mechanism as all other entities
  4. Actual: Journal entry linking uses a different, inconsistent mechanism
- **Notes**: Should use the unified EntityLink system and LinkPanel component for consistency

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

## Fixed Bugs

_No bugs have been fixed yet._

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
