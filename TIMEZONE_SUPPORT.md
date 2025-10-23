# Timezone Support in Captain's Log

## Overview

Captain's Log has comprehensive timezone support built into the application. Each activity, transportation segment, and lodging reservation can have its own timezone, independent of the trip's default timezone.

## Current Implementation

### Database Schema

The following entities support timezone fields:

1. **Trip** (`trips.timezone`)
   - Default timezone for the entire trip
   - Falls back to user's timezone if not set

2. **Activity** (`activities.timezone`)
   - Specific timezone for activity times
   - Falls back to trip timezone if not set
   - Used for `startTime` and `endTime` fields

3. **Transportation** (`transportation.start_timezone` and `transportation.end_timezone`)
   - Separate timezones for departure and arrival
   - Crucial for flights/travel across time zones
   - Falls back to trip timezone if not set

4. **Lodging** (`lodging.timezone`)
   - Timezone for check-in/check-out times
   - Falls back to trip timezone if not set

### Frontend Components

All three manager components already have timezone support implemented:

#### ActivityManager
- ✅ Timezone selector dropdown
- ✅ Displays selected timezone with globe emoji (🌍)
- ✅ Defaults to "Use trip timezone"
- ✅ Saves timezone to backend
- ⚠️ **Issue**: Displays times in browser's local timezone, not activity's timezone

**Location**: [frontend/src/components/ActivityManager.tsx](frontend/src/components/ActivityManager.tsx)

#### TransportationManager
- ✅ Separate timezone selectors for departure and arrival
- ✅ Displays both timezones with globe emoji (🌍)
- ✅ Defaults to "Use trip timezone"
- ✅ Saves both timezones to backend
- ⚠️ **Issue**: Displays times in browser's local timezone, not transportation's timezone

**Location**: [frontend/src/components/TransportationManager.tsx](frontend/src/components/TransportationManager.tsx)

#### LodgingManager
- ✅ Timezone selector dropdown
- ✅ Displays selected timezone
- ✅ Defaults to "Use trip timezone"
- ✅ Saves timezone to backend
- ⚠️ **Issue**: Displays times in browser's local timezone, not lodging's timezone

**Location**: [frontend/src/components/LodgingManager.tsx](frontend/src/components/LodgingManager.tsx)

### Backend API

The backend already accepts and stores timezone information:

- **Activity**: `timezone` field in create/update schemas
- **Transportation**: `startTimezone` and `endTimezone` fields
- **Lodging**: `timezone` field in create/update schemas

All validation schemas allow timezone as optional string fields.

## Known Issue: Display Formatting

### The Problem

While the UI allows users to **select and save** timezones, the **display formatting** doesn't respect the selected timezone. All times are currently displayed in the browser's local timezone.

**Example:**
- Activity scheduled for 2:00 PM PST
- User in EST sees "5:00 PM" (converted to their local time)
- **Should show**: "2:00 PM PST" or "2:00 PM" with timezone indicator

### Root Cause

The `formatDateTime` functions in each component use JavaScript's `toLocaleString()` without the `timeZone` option:

```typescript
// Current implementation (INCORRECT)
const formatDateTime = (dateTime: string | null) => {
  if (!dateTime) return "Not set";
  return new Date(dateTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  // This uses browser's local timezone!
};
```

### Solution Created

I've created a new timezone utility file with proper timezone-aware formatting:

**File**: [frontend/src/utils/timezone.ts](frontend/src/utils/timezone.ts)

**Key Functions**:

1. **`formatDateTimeInTimezone()`** - Format date+time in a specific timezone
2. **`formatTimeInTimezone()`** - Format time only with timezone
3. **`formatDateInTimezone()`** - Format date only
4. **`getTimezoneAbbreviation()`** - Get timezone abbreviation (e.g., "PST")
5. **`calculateDuration()`** - Calculate time duration
6. **`commonTimezones`** - List of common timezone options
7. **`renderTimezoneOptions()`** - React component for timezone select

**Usage Example**:

```typescript
import { formatDateTimeInTimezone } from '../utils/timezone';

// Format activity time with its specific timezone
const formattedTime = formatDateTimeInTimezone(
  activity.startTime,           // ISO datetime string
  activity.timezone,             // Activity's timezone
  trip.timezone,                 // Fallback to trip timezone
  { includeTimezone: true }      // Show "PST", "EST", etc.
);
// Output: "Jun 2, 2:00 PM PST"
```

## Next Steps to Complete Fix

To fully implement timezone-aware display, update the three manager components:

### 1. Update ActivityManager

Replace the `formatDateTime` function:

```typescript
// OLD
const formatDateTime = (dateTime: string | null) => {
  if (!dateTime) return "Not set";
  return new Date(dateTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// NEW
import { formatDateTimeInTimezone } from '../utils/timezone';

const formatDateTime = (
  dateTime: string | null,
  timezone?: string | null
) => {
  return formatDateTimeInTimezone(
    dateTime,
    timezone,
    trip.timezone,  // Pass trip timezone as fallback
    { includeTimezone: true }
  );
};
```

Then update all calls to include the timezone parameter:

```typescript
// Display activity time
{formatDateTime(activity.startTime, activity.timezone)}
```

### 2. Update TransportationManager

Same approach, but handle both start and end timezones:

```typescript
const formatDepartureTime = (transport: Transportation) => {
  return formatDateTimeInTimezone(
    transport.departureTime,
    transport.startTimezone,
    trip.timezone,
    { includeTimezone: true }
  );
};

const formatArrivalTime = (transport: Transportation) => {
  return formatDateTimeInTimezone(
    transport.arrivalTime,
    transport.endTimezone,
    trip.timezone,
    { includeTimezone: true }
  );
};
```

### 3. Update LodgingManager

Similar to ActivityManager:

```typescript
const formatCheckInTime = (lodging: Lodging) => {
  return formatDateTimeInTimezone(
    lodging.checkInDate,
    lodging.timezone,
    trip.timezone,
    { includeTimezone: true }
  );
};
```

### 4. Update Timeline Component

The Timeline component also needs to respect timezones when displaying events chronologically.

**File**: [frontend/src/components/Timeline.tsx](frontend/src/components/Timeline.tsx)

## Testing Timezone Support

### Test Scenarios

1. **Cross-timezone trip**
   - Create a trip with default timezone "America/New_York" (EST)
   - Add activity in "America/Los_Angeles" (PST) at 2:00 PM
   - Verify it displays "2:00 PM PST" not "5:00 PM EST"

2. **International flight**
   - Add transportation departing "America/New_York" at 3:00 PM
   - Arriving "Europe/London" at 8:00 AM (next day)
   - Verify both times show with correct timezone abbreviations

3. **Hotel check-in**
   - Add lodging in "Asia/Tokyo" timezone
   - Set check-in to 3:00 PM local time
   - Verify it displays correctly regardless of browser timezone

## Available Timezone Options

The UI currently provides these common timezones:

- UTC (Coordinated Universal Time)
- America/New_York (Eastern Time)
- America/Chicago (Central Time)
- America/Denver (Mountain Time)
- America/Los_Angeles (Pacific Time)
- America/Anchorage (Alaska)
- Pacific/Honolulu (Hawaii)
- Europe/London (London)
- Europe/Paris (Paris)
- Europe/Berlin (Berlin)
- Asia/Tokyo (Tokyo)
- Asia/Shanghai (Shanghai)
- Asia/Dubai (Dubai)
- Australia/Sydney (Sydney)
- Pacific/Auckland (Auckland)

**Note**: These use IANA timezone identifiers, which automatically handle daylight saving time changes.

## Future Enhancements

1. **Autocomplete Timezone Selection**
   - Add search/autocomplete for all ~600 IANA timezones
   - Suggest timezone based on location/coordinates

2. **Smart Timezone Defaults**
   - Auto-detect timezone from location coordinates
   - Auto-fill timezone when selecting a location

3. **Timezone Converter Tool**
   - Show "What time is this in my local timezone?"
   - Display multiple timezones side-by-side

4. **Timeline Timezone Toggle**
   - View entire timeline in a single timezone
   - Toggle between trip timezone, local timezone, UTC

5. **Duration Calculations**
   - Show duration with timezone conversion
   - "3-hour flight (6:00 PM - 11:00 PM local times)"

## Technical Notes

### Why IANA Timezones?

We use IANA timezone identifiers (e.g., "America/New_York") instead of abbreviations (e.g., "EST") because:

1. **Daylight Saving Time**: IANA identifiers automatically handle DST transitions
2. **Uniqueness**: "CST" could mean Central Standard Time, China Standard Time, or Cuba Standard Time
3. **Browser Support**: JavaScript's `Intl.DateTimeFormat` uses IANA identifiers
4. **Database Standard**: PostgreSQL's timezone support uses IANA identifiers

### Timezone vs UTC Offset

We store actual datetimes in ISO 8601 format (UTC-based) and keep timezone as a separate field. This ensures:

- Accurate calculations across timezone boundaries
- Proper handling of DST transitions
- Ability to display in any timezone later

## References

- **IANA Timezone Database**: https://www.iana.org/time-zones
- **MDN Intl.DateTimeFormat**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- **Moment Timezone (if we need it later)**: https://momentjs.com/timezone/
