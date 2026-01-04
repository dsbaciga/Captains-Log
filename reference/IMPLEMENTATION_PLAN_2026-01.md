# Implementation Plan - January 2026

This document outlines the implementation plan for the following features selected for development:

1. Drag & Drop Timeline - Reorder activities/locations by dragging
2. Compact View Mode - Dense list view for trips with lots of activities
3. Trip Health Check - Catches planning mistakes automatically
4. Travel Time Alerts - Prevents impossible itineraries
5. Travel Lines on Map - Show flight paths and car routes between locations

---

## Feature 1: Drag & Drop Timeline

### Overview
Allow users to reorder activities, locations, and other timeline items by dragging and dropping them within the timeline view.

### Current State
- Timeline is read-only, items appear in chronological order
- No manual reordering capability
- Order determined by startTime/createdAt

### Implementation Details

#### Frontend Changes

**1. Add Drag-and-Drop Library**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
- Reasoning: `@dnd-kit` is modern, accessible, performant, and works well with React

**2. Update Timeline Component** (`frontend/src/components/Timeline.tsx`)
- Wrap timeline items in `SortableContext`
- Create `SortableTimelineItem` wrapper component
- Add drag handle UI (⋮⋮ icon)
- Implement `onDragEnd` handler to update order
- Visual feedback during drag (opacity, cursor, preview)

**3. Add Manual Ordering Field**
- Add `manualOrder` field to relevant models (Activity, Location, etc.)
- Update types in `frontend/src/types/`

**4. Update Services**
- Add `updateOrder` API calls to reorder items
- Batch update for efficiency

#### Backend Changes

**1. Database Schema Updates** (`backend/prisma/schema.prisma`)
```prisma
model Activity {
  // ... existing fields
  manualOrder   Int?      // Manual sort order (null = use chronological)
  @@index([tripId, manualOrder])
}

model Location {
  // ... existing fields
  manualOrder   Int?
  @@index([tripId, manualOrder])
}
```

**2. Migration**
```bash
npx prisma migrate dev --name add_manual_order_fields
```

**3. Update Services** (`backend/src/services/`)
- Modify `getActivitiesByTrip` to sort by `manualOrder` when present, fallback to `startTime`
- Add `updateActivityOrder(tripId, activityIds)` endpoint
- Similar updates for locations, transportation, lodging

**4. API Endpoints**
```typescript
// PATCH /api/trips/:tripId/activities/reorder
// Body: { activityIds: [3, 1, 2, 4] }
router.patch('/:tripId/activities/reorder', authenticate, controller.reorderActivities);
```

### Implementation Steps

1. ✅ Install @dnd-kit packages
2. ✅ Add manualOrder field to database schema
3. ✅ Create and run migration
4. ✅ Update backend services to support manual ordering
5. ✅ Add reorder API endpoints
6. ✅ Create SortableTimelineItem component
7. ✅ Integrate drag-and-drop into Timeline component
8. ✅ Add visual drag indicators and feedback
9. ✅ Test ordering persistence
10. ✅ Update documentation

### Edge Cases
- Handle items without start times
- Preserve chronological order when manualOrder is null
- Handle concurrent edits (optimistic UI updates)
- Mobile touch support
- Keyboard accessibility (Tab + Arrow keys)

### Testing
- Drag item up
- Drag item down
- Drag first/last items
- Drag across different days
- Cancel drag (ESC key)
- Mobile touch drag
- Screen reader compatibility

---

## Feature 2: Compact View Mode

### Overview
Dense list view option for trips with many activities, showing more items on screen at once.

### Current State
- Timeline has standard spacing optimized for readability
- No alternative view modes

### Implementation Details

#### Frontend Changes

**1. Add View Mode Toggle** (Timeline.tsx)
```typescript
const [viewMode, setViewMode] = useState<'standard' | 'compact'>('standard');
```

**2. Create Compact Timeline Styles**
- Reduced padding (p-3 → p-2)
- Smaller fonts (text-base → text-sm)
- Compressed spacing (space-y-4 → space-y-2)
- Hide secondary information by default (expand on click/hover)
- Smaller icons
- Condensed photo album previews

**3. Toggle UI Component**
```tsx
<div className="flex gap-2 mb-4">
  <button onClick={() => setViewMode('standard')}>Standard</button>
  <button onClick={() => setViewMode('compact')}>Compact</button>
</div>
```

**4. Conditional Rendering**
```tsx
<div className={viewMode === 'compact' ? 'compact-timeline' : 'standard-timeline'}>
  {/* timeline items */}
</div>
```

#### User Preferences
- Save view mode preference in localStorage
- Consider adding to User settings for cross-device sync

### Implementation Steps

1. ✅ Add viewMode state to Timeline component
2. ✅ Create compact CSS classes/variants
3. ✅ Add view mode toggle UI
4. ✅ Implement conditional rendering based on mode
5. ✅ Save preference to localStorage
6. ✅ Test with trips containing 10+ activities
7. ✅ Ensure all information remains accessible in compact mode
8. ✅ Mobile responsive adjustments

### Design Specifications

**Standard Mode** (current)
- Padding: 24px
- Font size: 16px (base)
- Item spacing: 16px
- Collapsed info: None

**Compact Mode** (new)
- Padding: 12px
- Font size: 14px (sm)
- Item spacing: 8px
- Collapsed info: Notes, booking details, journal previews (expand on click)

---

## Feature 3: Trip Health Check

### Overview
Automated validation system that identifies potential issues in trip planning and warns users before they encounter problems.

### Validation Rules

#### Critical Issues (Red Alerts)
1. **Missing Lodging**: Days without any lodging assignment
2. **Transportation Gaps**: Disconnected locations without transportation between them
3. **Timeline Conflicts**: Overlapping activities at same time
4. **Invalid Dates**: Activities before trip start or after trip end
5. **Missing Transportation**: Trip has multiple locations but no transportation

#### Warnings (Yellow Alerts)
1. **Tight Connections**: Less than 2 hours between activity end and next transportation
2. **Missing Information**: Activities without locations, times, or categories
3. **No Activities**: Days within trip duration with no planned activities
4. **Unbalanced Days**: Days with 6+ activities vs days with 0
5. **Missing Photos**: Completed trips with no photos

#### Info (Blue Suggestions)
1. **Optimization Opportunities**: Reorder activities to reduce travel time
2. **Missing Journal Entries**: Days without journal entries for completed trips
3. **Incomplete Details**: Missing costs, booking references, notes

### Implementation Details

#### Backend Service

**Create Trip Validator Service** (`backend/src/services/tripValidator.service.ts`)
```typescript
interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  affectedItems?: any[];
  suggestion?: string;
}

interface ValidationResult {
  tripId: number;
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100 health score
}

export async function validateTrip(tripId: number): Promise<ValidationResult> {
  // Implementation
}
```

**Validation Functions**
```typescript
function checkMissingLodging(trip, lodgings): ValidationIssue[]
function checkTransportationGaps(trip, locations, transportations): ValidationIssue[]
function checkTimelineConflicts(activities): ValidationIssue[]
function checkTightConnections(activities, transportations): ValidationIssue[]
// ... etc
```

#### Frontend Components

**1. Health Check Widget** (`frontend/src/components/TripHealthCheck.tsx`)
```tsx
export default function TripHealthCheck({ tripId }: { tripId: number }) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const runHealthCheck = async () => {
    const result = await tripService.validateTrip(tripId);
    setValidation(result);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3>Trip Health Check</h3>
      <HealthScore score={validation?.score} />
      <IssuesList issues={validation?.issues} />
    </div>
  );
}
```

**2. Health Score Display**
- 90-100: Excellent (Green)
- 70-89: Good (Yellow)
- 50-69: Needs Attention (Orange)
- 0-49: Critical Issues (Red)

**3. Issue Resolution Actions**
```tsx
<IssueCard issue={issue}>
  <button onClick={() => fixIssue(issue)}>Fix Automatically</button>
  <button onClick={() => dismissIssue(issue)}>Dismiss</button>
</IssueCard>
```

#### API Endpoints

```typescript
// GET /api/trips/:tripId/validate
router.get('/:tripId/validate', authenticate, controller.validateTrip);

// POST /api/trips/:tripId/validate/fix
// Auto-fix certain issues
router.post('/:tripId/validate/fix', authenticate, controller.autoFixIssues);
```

### Implementation Steps

1. ✅ Create tripValidator service
2. ✅ Implement validation functions (one at a time)
3. ✅ Add validation endpoint
4. ✅ Create TripHealthCheck component
5. ✅ Add health check to trip detail page
6. ✅ Implement auto-fix for simple issues
7. ✅ Add dismiss/ignore functionality
8. ✅ Create notification system for critical issues
9. ✅ Test with various trip scenarios
10. ✅ Add documentation

### Auto-Fix Capabilities

Issues that can be auto-fixed:
- Set default timezone based on first location
- Add generic "Hotel" lodging for missing days
- Adjust activity times to prevent conflicts
- Fill in missing categories from location data

---

## Feature 4: Travel Time Alerts

### Overview
Calculate travel times between consecutive activities and warn when connections are impossible or unrealistic.

### Current State
- No travel time calculation
- Users manually estimate time between locations
- No warnings for impossible itineraries

### Implementation Details

#### Travel Time Calculation

**1. Data Sources**
- **Google Maps Distance Matrix API** (preferred)
  - Accurate, real-time, supports multiple transportation modes
  - Pricing: $5 per 1000 requests (reasonable for small user base)
- **OpenStreetMap OSRM** (free alternative)
  - Self-hosted or public instance
  - Good for driving/walking, less accurate for public transit

**2. Transportation Mode Mapping**
```typescript
enum TransportMode {
  DRIVING = 'driving',
  WALKING = 'walking',
  TRANSIT = 'transit',
  BICYCLING = 'bicycling',
  FLIGHT = 'flight', // Special handling
}

function getTransportMode(transportation: Transportation): TransportMode {
  if (transportation.type === 'Car' || transportation.type === 'Bus') return 'driving';
  if (transportation.type === 'Train') return 'transit';
  if (transportation.type === 'Flight') return 'flight';
  return 'driving'; // default
}
```

**3. Flight Time Estimation**
```typescript
function estimateFlightTime(origin: Location, destination: Location): number {
  const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);

  // Average flight speed: 500 mph = 800 km/h
  const flightTime = distance / 800; // hours

  // Add airport buffer (2 hours before, 1 hour after)
  const totalTime = flightTime + 3;

  return totalTime * 60; // return in minutes
}
```

#### Backend Service

**Create Travel Time Service** (`backend/src/services/travelTime.service.ts`)
```typescript
export async function calculateTravelTime(
  origin: { lat: number, lng: number },
  destination: { lat: number, lng: number },
  mode: TransportMode,
  departureTime?: Date
): Promise<number> {
  // Implementation using Google Maps or OSRM
}

export async function analyzeTripTimeline(tripId: number): Promise<TimelineAnalysis> {
  const activities = await getActivitiesWithLocations(tripId);
  const transportations = await getTransportations(tripId);

  const alerts = [];

  for (let i = 0; i < activities.length - 1; i++) {
    const current = activities[i];
    const next = activities[i + 1];

    const travelTime = await calculateTravelTime(
      current.location,
      next.location,
      getTransportMode(findTransportBetween(current, next))
    );

    const availableTime = next.startTime - current.endTime;
    const bufferTime = availableTime - travelTime;

    if (bufferTime < 0) {
      alerts.push({
        type: 'impossible',
        severity: 'critical',
        message: `Impossible to travel from ${current.name} to ${next.name}`,
        requiredTime: travelTime,
        availableTime,
        shortfall: Math.abs(bufferTime)
      });
    } else if (bufferTime < 30) {
      alerts.push({
        type: 'tight',
        severity: 'warning',
        message: `Very tight connection between ${current.name} and ${next.name}`,
        bufferTime
      });
    }
  }

  return { alerts, statistics: { /* ... */ } };
}
```

#### Frontend Components

**1. Travel Time Indicator** (show between timeline items)
```tsx
<div className="timeline-connector">
  <div className="travel-info">
    <CarIcon />
    <span>45 min</span>
    {alert && <AlertIcon className="text-red-500" />}
  </div>
</div>
```

**2. Alert Display**
```tsx
<TimelineAlert alert={alert}>
  <AlertTriangle />
  <span>⚠️ Only 15 min to travel 45 min distance</span>
  <button onClick={suggestFix}>Suggest Fix</button>
</TimelineAlert>
```

**3. Auto-Fix Suggestions**
- Move activity earlier/later
- Add buffer time
- Remove activity
- Split into multiple days

#### API Endpoints

```typescript
// GET /api/trips/:tripId/timeline-analysis
router.get('/:tripId/timeline-analysis', authenticate, controller.analyzeTimeline);

// POST /api/trips/:tripId/optimize-timeline
// Auto-adjust times to fix conflicts
router.post('/:tripId/optimize-timeline', authenticate, controller.optimizeTimeline);
```

### Implementation Steps

1. ✅ Choose and configure travel time API (Google Maps vs OSRM)
2. ✅ Create travelTime service
3. ✅ Implement flight time estimation
4. ✅ Add timeline analysis function
5. ✅ Create API endpoint
6. ✅ Design timeline connector UI
7. ✅ Add travel time indicators to Timeline
8. ✅ Implement alert display
9. ✅ Create auto-fix suggestions
10. ✅ Test with various scenarios
11. ✅ Add caching to reduce API costs

### Optimization
- Cache travel times between common locations
- Batch API requests
- Update only when locations/times change
- Provide offline estimates using straight-line distance

---

## Feature 5: Travel Lines on Map

### Overview
Visualize travel routes on maps by drawing lines/paths between locations, color-coded by transportation type.

### Current State
- `TripLocationsMap.tsx` shows location markers
- `FlightRouteMap.tsx` exists (check current implementation)
- No comprehensive route visualization across all transportation types

### Implementation Details

#### Map Library: Leaflet (already in use)

**Route Visualization Types**

1. **Flights**: Curved arc (great circle route)
2. **Driving/Bus**: Road-following polyline (from routing API)
3. **Train**: Simplified straight line with railway styling
4. **Walking/Cycling**: Actual path from routing API
5. **Ferry/Boat**: Curved line (water route)

#### Component Structure

**Enhanced TripLocationsMap** (`frontend/src/components/TripLocationsMap.tsx`)

```typescript
interface RouteSegment {
  id: string;
  type: TransportationType;
  origin: Location;
  destination: Location;
  path?: LatLng[]; // Actual route coordinates
  color: string;
  icon: string;
}

export default function TripLocationsMap({
  locations,
  transportations,
  showRoutes = true
}: Props) {
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);

  useEffect(() => {
    if (showRoutes) {
      const segments = buildRouteSegments(locations, transportations);
      fetchRoutePaths(segments); // Get actual paths from API
      setRouteSegments(segments);
    }
  }, [locations, transportations, showRoutes]);

  return (
    <MapContainer>
      {/* Location markers */}
      {locations.map(loc => <Marker key={loc.id} position={[loc.lat, loc.lng]} />)}

      {/* Route lines */}
      {routeSegments.map(segment => (
        <RoutePolyline
          key={segment.id}
          path={segment.path}
          color={segment.color}
          type={segment.type}
        />
      ))}

      {/* Route animation on hover */}
      <AnimatedRouteOverlay />
    </MapContainer>
  );
}
```

**Route Styling**

```typescript
const ROUTE_STYLES = {
  Flight: {
    color: '#3B82F6', // Blue
    weight: 3,
    dashArray: '5, 10',
    icon: '✈️'
  },
  Car: {
    color: '#10B981', // Green
    weight: 4,
    dashArray: null,
    icon: '🚗'
  },
  Train: {
    color: '#EF4444', // Red
    weight: 4,
    dashArray: '10, 5',
    icon: '🚂'
  },
  Bus: {
    color: '#F59E0B', // Amber
    weight: 3,
    dashArray: '8, 4',
    icon: '🚌'
  },
  Ferry: {
    color: '#06B6D4', // Cyan
    weight: 3,
    dashArray: '3, 3',
    icon: '⛴️'
  }
};
```

#### Route Path Generation

**1. Flight Routes (Great Circle)**
```typescript
function generateFlightPath(origin: LatLng, dest: LatLng): LatLng[] {
  // Use great circle calculation
  const points = [];
  const steps = 50;

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const point = interpolateGreatCircle(origin, dest, fraction);

    // Add altitude for arc effect
    point.alt = Math.sin(fraction * Math.PI) * 100;
    points.push(point);
  }

  return points;
}
```

**2. Driving/Transit Routes (API-based)**
```typescript
async function fetchDrivingRoute(origin: LatLng, dest: LatLng): Promise<LatLng[]> {
  // Use Google Directions API or OSRM
  const response = await fetch(
    `https://api.openrouteservice.org/v2/directions/driving-car?` +
    `start=${origin.lng},${origin.lat}&end=${dest.lng},${dest.lat}`
  );

  const data = await response.json();
  return decodePolyline(data.routes[0].geometry);
}
```

**3. Simplified Routes (Straight Lines)**
```typescript
function generateStraightRoute(origin: LatLng, dest: LatLng): LatLng[] {
  return [origin, dest];
}
```

#### Interactive Features

**1. Route Hover Effects**
```tsx
<Polyline
  positions={segment.path}
  color={segment.color}
  weight={segment.isHovered ? 6 : 3}
  opacity={segment.isHovered ? 1 : 0.7}
  eventHandlers={{
    mouseover: () => setHoveredRoute(segment.id),
    mouseout: () => setHoveredRoute(null)
  }}
>
  <Tooltip>
    <TransportationDetails segment={segment} />
  </Tooltip>
</Polyline>
```

**2. Route Legend**
```tsx
<div className="route-legend">
  {Object.entries(ROUTE_STYLES).map(([type, style]) => (
    <div key={type} className="legend-item">
      <span style={{ color: style.color }}>{style.icon}</span>
      <LinePreview style={style} />
      <span>{type}</span>
    </div>
  ))}
</div>
```

**3. Toggle Routes**
```tsx
<div className="map-controls">
  <label>
    <input
      type="checkbox"
      checked={showRoutes}
      onChange={(e) => setShowRoutes(e.target.checked)}
    />
    Show Travel Routes
  </label>

  <label>
    <input
      type="checkbox"
      checked={animateRoutes}
      onChange={(e) => setAnimateRoutes(e.target.checked)}
    />
    Animate Routes
  </label>
</div>
```

#### Backend Support

**Route Data Storage** (optional, for caching)
```prisma
model RouteCache {
  id              Int      @id @default(autoincrement())
  originLat       Decimal
  originLng       Decimal
  destLat         Decimal
  destLng         Decimal
  transportType   String
  pathData        Json     // Array of coordinates
  distance        Int      // meters
  duration        Int      // minutes
  createdAt       DateTime @default(now())
  expiresAt       DateTime // Cache expiry

  @@index([originLat, originLng, destLat, destLng, transportType])
}
```

### Implementation Steps

1. ✅ Review existing FlightRouteMap implementation
2. ✅ Design route styling and color scheme
3. ✅ Implement great circle calculation for flights
4. ✅ Integrate routing API (OpenRouteService or Google)
5. ✅ Create RoutePolyline component
6. ✅ Build route segment generation logic
7. ✅ Add route lines to TripLocationsMap
8. ✅ Implement hover effects and tooltips
9. ✅ Add route legend
10. ✅ Create toggle controls
11. ✅ Add route animation (optional)
12. ✅ Optimize performance (clustering, lazy loading)
13. ✅ Test with various trip types
14. ✅ Add route caching

### Performance Optimization

- Only fetch routes for visible map bounds
- Cache route paths in localStorage
- Use route simplification for zoomed-out views
- Lazy load routes as user pans/zooms
- Limit number of simultaneous route requests

---

## Overall Implementation Timeline

### Phase 1: Quick Wins (Week 1-2)
- ✅ Compact View Mode (simplest, no backend changes)
- ✅ Drag & Drop Timeline (moderate complexity)

### Phase 2: Core Features (Week 3-4)
- ✅ Travel Lines on Map (enhance existing map)
- ✅ Trip Health Check (critical for UX)

### Phase 3: Advanced Features (Week 5-6)
- ✅ Travel Time Alerts (requires API integration)
- Polish and bug fixes
- Documentation updates

### Phase 4: Testing & Launch (Week 7-8)
- Comprehensive testing
- User acceptance testing
- Performance optimization
- Deploy to production

---

## Dependencies & Prerequisites

### NPM Packages
```bash
# Drag and Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Map routing (if using React Leaflet)
npm install leaflet-routing-machine
npm install @types/leaflet-routing-machine -D
```

### External APIs
1. **Google Maps Distance Matrix API** (optional, for travel time)
   - Setup: Enable API in Google Cloud Console
   - Get API key
   - Add to .env: `GOOGLE_MAPS_API_KEY=xxx`

2. **OpenRouteService** (free alternative for routing)
   - Sign up at openrouteservice.org
   - Get API key
   - Add to .env: `OPENROUTE_API_KEY=xxx`

### Database Migrations
```bash
# Add manual ordering fields
npx prisma migrate dev --name add_manual_order

# Add route caching (optional)
npx prisma migrate dev --name add_route_cache
```

---

## Success Metrics

### Drag & Drop Timeline
- ✅ Users can reorder items in < 2 seconds
- ✅ Order persists across sessions
- ✅ Mobile touch works smoothly
- ✅ No accessibility regressions

### Compact View Mode
- ✅ Shows 2x more items on screen
- ✅ All information remains accessible
- ✅ User preference persists

### Trip Health Check
- ✅ Identifies 90%+ of planning issues
- ✅ Auto-fix resolves 50%+ of warnings
- ✅ Reduces support tickets about invalid itineraries

### Travel Time Alerts
- ✅ Accurate within ±15 minutes for driving routes
- ✅ Catches impossible itineraries before user encounters them
- ✅ 80%+ alert acceptance rate (users agree with warnings)

### Travel Lines on Map
- ✅ Routes render in < 2 seconds
- ✅ Works with 20+ locations without lag
- ✅ Accurate representation of actual travel paths

---

## Notes & Considerations

1. **API Costs**: Monitor usage of external APIs (Google Maps, routing services)
2. **Performance**: Implement caching aggressively to reduce costs and latency
3. **Mobile**: All features must work on touch devices
4. **Accessibility**: Keyboard navigation, screen reader support
5. **Progressive Enhancement**: Features should gracefully degrade if APIs are unavailable
6. **User Testing**: Get feedback on each feature before finalizing

---

## Documentation Updates

After implementation, update:
- ✅ [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) - Add completed features
- ✅ [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - Document new components
- ✅ [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Mark features as complete
- ✅ User guide (if creating one)
- ✅ API documentation (for new endpoints)
