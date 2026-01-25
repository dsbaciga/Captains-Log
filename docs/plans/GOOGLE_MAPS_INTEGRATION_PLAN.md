# Plan: Google Maps Integration

## Overview

This plan outlines how to add Google Maps as an alternative mapping, geocoding, and routing service. Users will be able to add their own Google Maps API key and choose between the current open-source providers (Leaflet/Nominatim/OpenRouteService) and Google Maps services.

---

## Phase 1: Database & Backend API Key Storage

### 1.1 Database Schema Update

Add Google Maps API key field to the User model in Prisma schema:

```
User model additions:
- googleMapsApiKey: String? (encrypted, never returned to client)
- mapProvider: Enum('OPENSTREETMAP', 'GOOGLE') default 'OPENSTREETMAP'
- geocodingProvider: Enum('NOMINATIM', 'GOOGLE') default 'NOMINATIM'
- routingProvider: Enum('OPENROUTESERVICE', 'GOOGLE') default 'OPENROUTESERVICE'
```

**Rationale**: Allow users to choose providers independently (e.g., use Google Maps for display but OpenRouteService for routing).

### 1.2 Backend User Service Updates

Extend `user.service.ts` following the existing pattern from `updateOpenrouteserviceSettings()`:

- `updateGoogleMapsSettings()` - Store/update API key and provider preferences
- `getGoogleMapsSettings()` - Return `googleMapsApiKeySet: boolean` (never return actual key)
- `getEffectiveGoogleMapsKey()` - For internal use, return actual key (checks per-user first, then env fallback)

### 1.3 Backend Routes & Controllers

Add new endpoints to user routes:

- `PUT /api/users/settings/google-maps` - Update Google Maps API key and preferences
- `GET /api/users/settings/google-maps` - Get current settings (without actual key)
- `DELETE /api/users/settings/google-maps` - Remove API key

---

## Phase 2: Provider Abstraction Layer

### 2.1 Backend Geocoding Abstraction

Create `backend/src/services/geocoding.service.ts`:

```typescript
interface GeocodingProvider {
  searchPlaces(query: string): Promise<GeocodingResult[]>
  reverseGeocode(lat: number, lon: number): Promise<GeocodingResult>
}
```

**Implementations**:

- `NominatimGeocodingProvider` - Current implementation
- `GoogleGeocodingProvider` - New Google Geocoding API implementation

**Factory function**: Returns appropriate provider based on user preferences.

### 2.2 Backend Routing Abstraction

Refactor `routing.service.ts` to use provider interface:

```typescript
interface RoutingProvider {
  calculateRoute(from: Coords, to: Coords, profile: string): Promise<RouteResult>
}
```

**Implementations**:

- `OpenRouteServiceProvider` - Current implementation
- `GoogleDirectionsProvider` - New Google Directions API implementation

**Profile mapping**: Map internal profiles to Google equivalents:

- `driving-car` → `driving`
- `cycling-regular` → `bicycling`
- `foot-walking` → `walking`

### 2.3 Caching Enhancements

Extend `RouteCache` table:

- Add `provider` field to differentiate cached routes
- Existing cache remains valid for OpenRouteService
- Separate cache entries for Google routes

---

## Phase 3: Frontend Settings UI

### 3.1 Google Maps Settings Component

Create `GoogleMapsSettings.tsx` following the pattern of `OpenRouteServiceSettings.tsx`:

**Features**:

- API key input field (masked, with show/hide toggle)
- Provider selection dropdowns:
  - Map tiles: OpenStreetMap / Google Maps
  - Geocoding: Nominatim / Google
  - Routing: OpenRouteService / Google
- Instructions for obtaining a Google Maps API key
- Required APIs checklist (Maps JavaScript, Geocoding, Directions)
- Test connection button

### 3.2 Settings Page Integration

Add new section to Settings page under "External Services":

- Google Maps Settings (collapsible panel)
- Show warning about Google Maps pricing
- Link to Google Cloud Console

### 3.3 Frontend Service Updates

Create `frontend/src/services/google-maps.service.ts`:

- `updateSettings()` - Save API key and preferences
- `getSettings()` - Fetch current settings
- `testConnection()` - Validate API key works

---

## Phase 4: Map Component Abstraction

### 4.1 Map Provider Context

Create `MapProviderContext.tsx`:

- Stores current map provider preference
- Provides user's Google Maps API key (loaded once on app init)
- Exposes `useMapProvider()` hook

### 4.2 Abstract Map Components

Create wrapper components that conditionally render based on provider:

**`AbstractMap.tsx`**:

```tsx
// Renders either LeafletMap or GoogleMap based on provider
const AbstractMap = ({ children, ...props }) => {
  const { provider } = useMapProvider();
  return provider === 'GOOGLE'
    ? <GoogleMapWrapper {...props}>{children}</GoogleMapWrapper>
    : <LeafletMapWrapper {...props}>{children}</LeafletMapWrapper>;
}
```

**Similar abstractions for**:

- `AbstractMarker` - Leaflet Marker / Google Marker
- `AbstractPolyline` - Leaflet Polyline / Google Polyline
- `AbstractPopup` - Leaflet Popup / Google InfoWindow
- `AbstractTileLayer` - OSM tiles / Google tiles

### 4.3 Google Maps React Integration

Install `@react-google-maps/api` package for React integration:

**GoogleMapWrapper.tsx**:

- Uses `LoadScript` to load API with user's key
- Implements `GoogleMap` component
- Handles loading states and errors

### 4.4 Refactor Existing Map Components

Update each map component to use abstractions:

| Component | Changes Needed |
|-----------|----------------|
| `TripLocationsMap.tsx` | Replace Leaflet with AbstractMap, AbstractMarker, AbstractPolyline |
| `DayMiniMap.tsx` | Replace with AbstractMap, AbstractMarker |
| `LocationSearchMap.tsx` | Replace with AbstractMap, add Google Places Autocomplete option |
| `PlacesVisitedMap.tsx` | Replace with AbstractMap, handle marker clustering for both |
| `FlightRouteMap.tsx` | Replace with AbstractMap, AbstractPolyline |

---

## Phase 5: Frontend Geocoding Integration

### 5.1 Geocoding Service Abstraction

Refactor `geocoding.service.ts`:

```typescript
interface GeocodingService {
  searchPlaces(query: string): Promise<PlaceResult[]>
  reverseGeocode(lat: number, lon: number): Promise<AddressResult>
}
```

**Factory function**: Returns Nominatim or Google implementation based on user preference.

### 5.2 Google Geocoding Implementation

**Features**:

- Forward geocoding via Google Geocoding API
- Reverse geocoding
- Place Autocomplete integration for search fields
- Proper rate limiting and error handling

### 5.3 LocationSearchMap Updates

When using Google provider:

- Replace Nominatim search with Google Places Autocomplete
- Use Google's reverse geocoding on map click
- Maintain same UX, different underlying service

---

## Phase 6: Backend Google APIs Integration

### 6.1 Google Directions API Service

Create `google-directions.service.ts`:

**Features**:

- Route calculation with distance and duration
- Support for driving, walking, bicycling, transit modes
- Return route polyline (decoded from Google's encoded format)
- Handle waypoints for multi-stop routes
- Proper error handling and rate limiting

### 6.2 Google Geocoding API Service

Create `google-geocoding.service.ts`:

**Features**:

- Forward geocoding (address to coordinates)
- Reverse geocoding (coordinates to address)
- Place details lookup
- Component filtering (country, region)

### 6.3 Routing Service Factory

Update routing service to use provider factory:

```typescript
const getRoutingProvider = async (userId: string): Promise<RoutingProvider> => {
  const userSettings = await getUserRoutingPreference(userId);
  if (userSettings.provider === 'GOOGLE' && userSettings.hasValidKey) {
    return new GoogleDirectionsProvider(userSettings.apiKey);
  }
  return new OpenRouteServiceProvider(userSettings.orsApiKey);
}
```

---

## Phase 7: API Key Security & Validation

### 7.1 API Key Encryption

Store Google Maps API key encrypted in database (same pattern as other API keys):

- Encrypt before storing
- Decrypt only when making API calls
- Never return to frontend

### 7.2 API Key Validation Endpoint

Create endpoint to test API key validity:

- `POST /api/users/settings/google-maps/test`
- Makes minimal API call to verify key works
- Returns which APIs are enabled (Maps, Geocoding, Directions)

### 7.3 Frontend Key Handling

- API key passed to Google Maps loader only
- Key fetched via secure endpoint, not stored in localStorage
- Key cleared on logout

---

## Phase 8: Error Handling & Fallbacks

### 8.1 Provider Fallback Strategy

When Google APIs fail:

- Log error with details
- Fall back to OSM/Nominatim/ORS automatically
- Show user notification about fallback
- Cache fallback decision temporarily to avoid repeated failures

### 8.2 Quota & Rate Limiting

Handle Google API quotas:

- Track usage in session
- Warn users approaching limits
- Implement exponential backoff on rate limit errors

### 8.3 Graceful Degradation

If API key becomes invalid:

- Show notification to user
- Automatically switch to free providers
- Preserve user data (no data loss)

---

## Phase 9: Documentation & User Guidance

### 9.1 In-App Documentation

Add help content explaining:

- How to get a Google Maps API key
- Which APIs to enable in Google Cloud Console
- Billing/pricing information
- Provider comparison (features, costs, rate limits)

### 9.2 Settings Page Help Text

Clear guidance on:

- API key format validation
- Required API permissions
- Cost implications
- When to use each provider

### 9.3 Update ROUTING_SETUP.md

Add Google Maps section covering:

- Google Cloud Console setup
- API enablement steps
- Billing setup
- Configuration in Travel Life

---

## Implementation Order (Recommended)

1. **Phase 1** (Database) - Foundation for storing settings
2. **Phase 3.1-3.2** (Settings UI) - Allow users to input API key
3. **Phase 7** (Security) - Ensure key is stored/handled securely
4. **Phase 2** (Backend Abstraction) - Provider interfaces
5. **Phase 6** (Backend Google Services) - Implement Google API calls
6. **Phase 4** (Map Abstraction) - Frontend component wrappers
7. **Phase 5** (Frontend Geocoding) - Search integration
8. **Phase 8** (Error Handling) - Robustness
9. **Phase 9** (Documentation) - User guidance

---

## Key Considerations

### Google Maps Pricing

| API | Free Tier | Cost After |
|-----|-----------|------------|
| Maps JavaScript | $200/month credit | $7 per 1,000 loads |
| Geocoding | 40,000/month | $5 per 1,000 requests |
| Directions | 40,000/month | $5-10 per 1,000 requests |

**Recommendation**: Show clear pricing warnings in UI. The $200 monthly credit covers most personal use.

### Package Dependencies

**Frontend additions**:

- `@react-google-maps/api` - React Google Maps components
- `@googlemaps/js-api-loader` - Dynamic API loading

**Backend additions**:

- `@googlemaps/google-maps-services-js` - Official Node.js client

### Breaking Changes

None expected. All changes are additive:

- Existing users continue with current providers by default
- Google Maps is opt-in via settings
- No data migration needed

### Testing Strategy

- Unit tests for each provider implementation
- Integration tests for provider switching
- E2E tests for full map workflows with each provider
- Manual testing of quota handling and fallbacks

---

## Summary

This plan introduces Google Maps as an alternative to the current open-source stack while maintaining full backward compatibility. Users can opt-in by adding their API key and selecting their preferred providers independently for maps, geocoding, and routing. The abstraction layers ensure clean code separation and easy maintenance of multiple providers.
