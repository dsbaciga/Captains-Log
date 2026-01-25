# Trip Dashboard Design Plan

This document outlines the design and implementation plan for the Trip Dashboard - a new default landing page when users click into a trip.

## Overview

The Trip Dashboard will serve as the central hub for trip information, providing an at-a-glance view of trip status, upcoming events, statistics, and quick navigation. This replaces the current behavior where users land directly on the Timeline tab.

## Current State

Currently, when clicking into a trip:
- Users land on the **Timeline** tab by default
- "Trip at a Glance" stats are displayed above the Timeline
- Stats include: Places, Photos, Activities, Transport, Lodging, Journal, Companions, Duration, Unscheduled Items
- No dedicated dashboard or overview exists

## Proposed Dashboard Sections

### 1. Trip Hero Section (Top)

A visually appealing header section that sets the context for the trip.

**Contents:**
- Trip title (large, display font)
- Trip dates with countdown/day indicator
- Current status badge
- Cover photo as background (if set)

**Day/Countdown Display Logic:**
| Trip Status | Display |
|-------------|---------|
| Dream | "Dream Trip" |
| Planning | "X days until trip" (if start date set) |
| Planned | "X days until trip" |
| In Progress | "Day X of Y" with progress indicator |
| Completed | "Completed X days ago" or "X photos, Y memories" |
| Cancelled | "Cancelled" |

---

### 2. Recent Activity Card

Shows recent changes and additions to the trip, helping users track what's been updated.

**Contents:**
- List of 5-8 most recent activities on this trip
- Each item shows: action type, entity name, timestamp
- Clicking an item navigates to that entity

**Activity Types to Track:**

| Action | Icon | Example Display |
|--------|------|-----------------|
| Added | + | "Added activity: Eiffel Tower Visit" |
| Updated | ✏️ | "Updated lodging: Hotel & Resort" |
| Uploaded | 📷 | "Uploaded 12 photos" |
| Linked | 🔗 | "Linked 3 photos to Louvre Museum" |
| Journal | 📝 | "New journal entry: Day 1 Reflections" |
| Checklist | ☑️ | "Completed: Book flights" |

**Visual Design:**
- Compact list with subtle separators
- Relative timestamps ("2 hours ago", "Yesterday")
- Grouped by day if many items
- "View all activity" link at bottom (optional future feature)

**Data Source:**
- Use `updatedAt` timestamps from all entities
- Combine and sort by most recent
- Photo uploads grouped together to avoid flooding

---

### 3. Next Up Card (Priority Section)

Shows the next upcoming event based on current time and trip timeline.

**Logic:**
1. If trip hasn't started: Show first event (first activity, check-in, or departure)
2. If trip is in progress: Show next event from current time
3. If trip is completed: Show "Trip Complete" summary

**Card Contents:**
- Event type icon (plane, hotel, activity, etc.)
- Event name/title
- Date and time (with relative indicator: "In 2 hours", "Tomorrow at 9 AM")
- Location name with mini-map preview (if applicable)
- Quick action button (view details, navigate)

**Edge Cases:**
- No events scheduled: "No upcoming events - add your first activity!"
- All events passed: "Trip complete! View your memories"
- Multiple events at same time: Show as stacked cards

---

### 4. Trip Stats Grid

Moved from Timeline tab to Dashboard. Interactive cards that navigate to relevant tabs.

**Stats Cards (2x4 or 4x2 grid on desktop, 2x4 on mobile):**

| Stat | Icon | Color | Click Action |
|------|------|-------|--------------|
| Duration | Calendar | Gold | Scroll to dates |
| Places | MapPin | Blue | Go to Places tab |
| Activities | Check | Green | Go to Activities tab |
| Transport | Plane | Orange | Go to Transport tab |
| Lodging | Home | Rose | Go to Lodging tab |
| Photos | Camera | Purple | Go to Photos tab |
| Journal | Book | Indigo | Go to Journal tab |
| Companions | Users | Teal | Go to Companions tab |

**Enhancements over current stats:**
- Add sparklines/mini-charts where applicable
- Show "vs planned" comparisons for In Progress trips
- Highlight incomplete items with subtle indicators

---

### 5. Quick Actions Bar

Contextual actions based on trip status.

**Dream Status:**
```
[Start Planning] [Add Inspiration Photos] [Set Dates]
```

**Planning Status:**
```
[Add Activity] [Book Lodging] [Add Transport] [View Timeline]
```

**Planned Status:**
```
[Start Trip] [Print Itinerary] [Share Trip] [Final Checklist]
```

**In Progress Status:**
```
[Add Photo] [Write Journal] [View Timeline] [Quick Add]
```

**Completed Status:**
```
[View Photos] [Read Journal] [Print Itinerary] [Duplicate Trip]
```

---

### 6. Today's Itinerary (In Progress Only)

When the trip is in progress, show today's schedule prominently.

**Contents:**
- Date header: "Monday, January 27" with weather icon (if available)
- Timeline of today's events (compact view)
- Current location indicator
- Next event highlighted

**Design:**
- Vertical timeline with time markers
- Color-coded by event type
- Completed events shown with checkmark
- Current time indicator line

---

### 7. Trip Summary Cards (Completed Trips)

For completed trips, show memory highlights instead of planning widgets.

**Cards:**
- **Photo Highlights**: 4-6 featured photos or album covers
- **Journal Summary**: Latest journal entries with excerpts
- **Trip Statistics**: Total distance, countries visited, etc.
- **Memory Map**: Mini map with all visited locations

---

### 8. Checklists Widget

Quick view of checklist progress.

**Contents:**
- List of checklists with progress bars
- Expandable to show individual items
- Quick add/check functionality
- "X of Y complete" summary

---

### 9. Weather Widget (Optional)

If weather data is available for the trip destination.

**Pre-trip:**
- Forecast for trip dates (if within 14 days)
- Historical averages for destination

**During trip:**
- Current weather at trip location
- Today's forecast

---

## Layout Design

### Desktop Layout (>1024px)

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIP HERO SECTION                        │
│              Title | Dates | Status | Day Indicator         │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────┐  ┌──────────────────────────────────┐
│   RECENT ACTIVITY     │  │         NEXT UP CARD             │
│   + Added: Louvre     │  │  ✈️ Flight to Paris               │
│   📷 12 photos added  │  │  Tomorrow at 8:30 AM             │
│   ✏️ Updated hotel    │  │  JFK → CDG | United 1234         │
└───────────────────────┘  └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    QUICK ACTIONS BAR                        │
│  [Add Activity] [Book Lodging] [Add Transport] [Timeline]   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TRIP STATS GRID                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 7 Days  │ │8 Places │ │12 Activ │ │4 Flights│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │2 Hotels │ │45 Photos│ │3 Journal│ │2 Friends│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────┐  ┌──────────────────────────────────┐
│   CHECKLISTS          │  │         WEATHER / NOTES          │
│   ☑ Packing: 8/12     │  │   Partly Cloudy 72°F             │
│   ☐ Documents: 2/5    │  │   [Trip notes excerpt...]        │
└───────────────────────┘  └──────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌─────────────────────┐
│   TRIP HERO         │
│   (Compact)         │
└─────────────────────┘
┌─────────────────────┐
│   NEXT UP CARD      │
└─────────────────────┘
┌─────────────────────┐
│   RECENT ACTIVITY   │
│   (Compact List)    │
└─────────────────────┘
┌─────────────────────┐
│   QUICK ACTIONS     │
│   (Horizontal       │
│    Scroll)          │
└─────────────────────┘
┌─────────────────────┐
│   TRIP STATS        │
│   (2x4 Grid)        │
└─────────────────────┘
┌─────────────────────┐
│   CHECKLISTS        │
└─────────────────────┘
```

---

## Component Structure

```
TripDetailPage.tsx
└── Tab: Dashboard (NEW - index 0, default)
    └── TripDashboard.tsx (new component)
        ├── DashboardHero.tsx
        │   └── TripDayIndicator.tsx (new)
        ├── RecentActivityCard.tsx (new)
        │   └── ActivityItem.tsx (new)
        ├── NextUpCard.tsx (new)
        │   └── EventPreview.tsx (new)
        ├── QuickActionsBar.tsx (new)
        ├── TripStatsGrid.tsx (existing, enhanced)
        ├── TodaysItinerary.tsx (new, conditional)
        ├── ChecklistsWidget.tsx (new)
        └── WeatherWidget.tsx (new, conditional)
```

---

## Data Requirements

All required data is already loaded by TripDetailPage:

| Data | Source | Used For |
|------|--------|----------|
| Trip | `useQuery('trip')` | Hero, Day indicator |
| Activities | `useQuery('activities')` | Stats, Next Up, Today's Itinerary, Recent Activity |
| Transportation | `useQuery('transportation')` | Stats, Next Up, Recent Activity |
| Lodging | `useQuery('lodging')` | Stats, Next Up, Recent Activity |
| Locations | `useQuery('locations')` | Stats, Recent Activity |
| Journal | `useQuery('journal')` | Stats, Recent Activity |
| Photos | `photosPagination` | Stats, Recent Activity |
| Checklists | `useQuery('checklists')` | Checklists Widget |
| Companions | `useQuery('companions')` | Stats |

**New Calculations Needed:**
- `getRecentActivity(activities, transport, lodging, locations, journal, photos)` → sorted recent changes
- `getNextUpEvent(activities, transport, lodging)` → next chronological event
- `getTodaysEvents(activities, transport, lodging)` → today's events
- `getDayOfTrip(trip)` → current day number / total days

---

## Implementation Phases

### Phase 1: Core Dashboard Structure
1. Create `TripDashboard.tsx` component
2. Add "Dashboard" as first tab in TripDetailPage
3. Move TripStats from Timeline to Dashboard
4. Create `TripDayIndicator.tsx` for countdown/day display
5. Remove TripStats from Timeline tab

### Phase 2: Next Up Card
1. Create `NextUpCard.tsx` component
2. Implement `getNextUpEvent()` utility function
3. Handle all event types (activity, transport, lodging)
4. Add mini-map preview for location-based events

### Phase 3: Recent Activity Card
1. Create `RecentActivityCard.tsx` component
2. Implement `getRecentActivity()` utility function
3. Create `ActivityItem.tsx` for individual activity rows
4. Add click navigation to relevant entities

### Phase 4: Quick Actions & Today's Itinerary
1. Create `QuickActionsBar.tsx` with status-specific actions
2. Create `TodaysItinerary.tsx` for in-progress trips
3. Add time-based current event highlighting

### Phase 5: Polish & Enhancements
1. Create `ChecklistsWidget.tsx`
2. Add `WeatherWidget.tsx` (if API integrated)
3. Add animations and transitions
4. Mobile responsive refinements
5. Completed trip memory view

---

## Design Tokens

Following the Style Guide, use these design patterns:

**Cards:**
- Use `.card` class with appropriate backgrounds
- Add hover effects with `.card-interactive` where clickable

**Colors by Section:**
| Section | Light Mode | Dark Mode |
|---------|------------|-----------|
| Hero | Gradient with cover photo | Navy gradient with gold accents |
| Recent Activity | Subtle icons per action type | Gold accent on timestamps |
| Stats | Individual colors per stat | Gold borders on dark |
| Quick Actions | Primary buttons | Accent gold buttons |

**Typography:**
- Hero title: `font-display text-3xl`
- Section headers: `font-body font-semibold text-lg`
- Stats numbers: `font-display text-2xl`
- Labels: `font-body text-sm text-slate`
- Activity items: `font-body text-sm` with `text-xs` timestamps

**Animations:**
- Cards: `animate-fade-in` on load with stagger
- Stats: `animate-scale-in` for number counters
- Activity items: Subtle slide-in on new items

---

## Accessibility Considerations

1. **Keyboard Navigation**: All cards and actions keyboard accessible
2. **Screen Reader**: Proper ARIA labels for progress indicators
3. **Color Independence**: Don't rely solely on color for health status
4. **Focus Management**: Clear focus indicators on all interactive elements
5. **Reduced Motion**: Respect `prefers-reduced-motion` for animations

---

## Future Enhancements

1. **Drag-and-drop widget arrangement**
2. **Customizable dashboard layout** (user preferences)
3. **Widget visibility toggles**
4. **Push notifications integration** (next event reminders)
5. **Social sharing cards** (generate shareable trip cards)
6. **AI trip suggestions** (based on destinations, recommend activities)
7. **Budget tracking widget** (total spend vs budget)
8. **Packing list integration** (checklist templates for destinations)

---

## Open Questions

1. Should the Dashboard completely replace the Timeline as default, or be an optional home?
2. For completed trips, should the dashboard transform into a "memories" view?
3. Should we add a "Notes" or "Quick Notes" section for trip-level notes?
4. Integration with external calendars (Google Calendar, Apple Calendar)?
5. Should quick actions include voice input for journal entries?

---

## Success Metrics

After implementation, measure:
- Time to find relevant trip information
- Tab navigation patterns (do users still need other tabs?)
- Feature discovery (are quick actions being used?)
- User feedback on trip planning experience
