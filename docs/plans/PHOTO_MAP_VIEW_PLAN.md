# Photo Map View Implementation Plan

**Feature:** Map view for photos with location fallback chain
**Priority:** Medium
**Status:** Planning

---

## Overview

Enhance the existing `PhotosMapView.tsx` component to display photos on a map using a cascading location resolution strategy:

1. **EXIF data** (highest priority) - Use photo's embedded GPS coordinates
2. **Direct entity link** - Photo linked directly to a Location
3. **Album link** - Photo's album is linked to a Location
4. **No location** - Photo excluded from map (current behavior)

---

## Current State

### Existing Component
`frontend/src/components/PhotosMapView.tsx` already implements:
- ✅ Map display with OpenStreetMap tiles
- ✅ Marker clustering via `@changey/react-leaflet-markercluster`
- ✅ Photo thumbnails as circular markers
- ✅ Popup with photo details on click
- ✅ Immich photo authentication handling
- ✅ Empty state when no geotagged photos

### Current Limitation
Only shows photos with EXIF coordinates (`latitude`/`longitude` fields). Photos without EXIF data are excluded entirely.

---

## Implementation Plan

### Phase 1: Data Enrichment

#### 1.1 Create Photo Location Resolver Hook

Create `frontend/src/hooks/usePhotoLocations.ts`:

```typescript
interface PhotoWithResolvedLocation extends Photo {
  resolvedLocation: {
    latitude: number;
    longitude: number;
    source: 'exif' | 'linked_location' | 'album_location';
    locationName?: string;
  } | null;
}

function usePhotoLocations(tripId: number, photos: Photo[]): {
  photosWithLocations: PhotoWithResolvedLocation[];
  loading: boolean;
  stats: {
    exif: number;
    linkedLocation: number;
    albumLocation: number;
    noLocation: number;
  };
}
```

#### 1.2 Location Resolution Logic

```typescript
async function resolvePhotoLocation(
  tripId: number,
  photo: Photo,
  photoToLocationLinks: Map<number, Location>,
  albumToLocationLinks: Map<number, Location>
): PhotoWithResolvedLocation {

  // Priority 1: EXIF coordinates
  if (photo.latitude != null && photo.longitude != null) {
    return {
      ...photo,
      resolvedLocation: {
        latitude: photo.latitude,
        longitude: photo.longitude,
        source: 'exif',
      },
    };
  }

  // Priority 2: Photo directly linked to Location
  const linkedLocation = photoToLocationLinks.get(photo.id);
  if (linkedLocation?.latitude != null && linkedLocation?.longitude != null) {
    return {
      ...photo,
      resolvedLocation: {
        latitude: linkedLocation.latitude,
        longitude: linkedLocation.longitude,
        source: 'linked_location',
        locationName: linkedLocation.name,
      },
    };
  }

  // Priority 3: Photo's album linked to Location
  if (photo.albums && photo.albums.length > 0) {
    for (const albumAssignment of photo.albums) {
      const albumLocation = albumToLocationLinks.get(albumAssignment.album.id);
      if (albumLocation?.latitude != null && albumLocation?.longitude != null) {
        return {
          ...photo,
          resolvedLocation: {
            latitude: albumLocation.latitude,
            longitude: albumLocation.longitude,
            source: 'album_location',
            locationName: albumLocation.name,
          },
        };
      }
    }
  }

  // No location resolved
  return {
    ...photo,
    resolvedLocation: null,
  };
}
```

#### 1.3 Batch Fetch Entity Links

To avoid N+1 queries, fetch all relevant links in bulk:

```typescript
// Fetch all PHOTO -> LOCATION links for the trip
const photoLocationLinks = await entityLinkService.getLinksByTargetType(tripId, 'LOCATION');
const photoLinks = photoLocationLinks.filter(link => link.sourceType === 'PHOTO');

// Fetch all PHOTO_ALBUM -> LOCATION links for the trip
const albumLinks = photoLocationLinks.filter(link => link.sourceType === 'PHOTO_ALBUM');

// Fetch location details for all linked location IDs
const locationIds = [...new Set([
  ...photoLinks.map(l => l.targetId),
  ...albumLinks.map(l => l.targetId),
])];
const locations = await locationService.getLocationsByIds(tripId, locationIds);
```

### Phase 2: Backend Enhancement (if needed)

#### 2.1 Add Bulk Location Fetch Endpoint

If not already available, add to `backend/src/services/location.service.ts`:

```typescript
async getLocationsByIds(userId: number, tripId: number, locationIds: number[]): Promise<Location[]> {
  return prisma.location.findMany({
    where: {
      id: { in: locationIds },
      tripId,
      trip: { userId },
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
    },
  });
}
```

Add route: `GET /api/trips/:tripId/locations/bulk?ids=1,2,3`

### Phase 3: UI Updates

#### 3.1 Update PhotosMapView Component

```typescript
interface PhotosMapViewProps {
  tripId: number;  // NEW: Required for entity link queries
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  showLocationSources?: boolean;  // NEW: Show legend of location sources
}
```

#### 3.2 Visual Differentiation by Source

Different marker styles based on location source:

| Source | Marker Style |
|--------|--------------|
| EXIF | Blue ring (current style) |
| Linked Location | Gold ring |
| Album Location | Purple ring with dashed border |

```typescript
const getMarkerRingColor = (source: 'exif' | 'linked_location' | 'album_location') => {
  switch (source) {
    case 'exif': return 'ring-blue-500';
    case 'linked_location': return 'ring-amber-500';
    case 'album_location': return 'ring-purple-500 ring-dashed';
  }
};
```

#### 3.3 Enhanced Popup Content

Show location source in popup:

```tsx
<Popup>
  <div className="w-48">
    {/* Photo thumbnail */}
    <img src={photoUrl} alt={photo.caption} className="w-full h-32 object-cover" />

    <div className="p-2">
      {photo.caption && <p className="font-medium">{photo.caption}</p>}

      {/* Location source indicator */}
      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
        {resolvedLocation.source === 'exif' && (
          <>
            <CameraIcon className="w-3 h-3" />
            <span>GPS from photo</span>
          </>
        )}
        {resolvedLocation.source === 'linked_location' && (
          <>
            <MapPinIcon className="w-3 h-3" />
            <span>Linked to {resolvedLocation.locationName}</span>
          </>
        )}
        {resolvedLocation.source === 'album_location' && (
          <>
            <FolderIcon className="w-3 h-3" />
            <span>Album at {resolvedLocation.locationName}</span>
          </>
        )}
      </div>
    </div>
  </div>
</Popup>
```

#### 3.4 Stats/Legend Component

Show breakdown of location sources:

```tsx
<div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
  <span className="flex items-center gap-1">
    <span className="w-3 h-3 rounded-full ring-2 ring-blue-500" />
    {stats.exif} with GPS
  </span>
  <span className="flex items-center gap-1">
    <span className="w-3 h-3 rounded-full ring-2 ring-amber-500" />
    {stats.linkedLocation} linked to location
  </span>
  <span className="flex items-center gap-1">
    <span className="w-3 h-3 rounded-full ring-2 ring-purple-500 ring-dashed" />
    {stats.albumLocation} via album
  </span>
  {stats.noLocation > 0 && (
    <span className="text-gray-400">
      {stats.noLocation} without location
    </span>
  )}
</div>
```

#### 3.5 Updated Empty State

Update empty state message to reflect fallback options:

```tsx
<div className="flex flex-col items-center justify-center h-96">
  <MapIcon className="w-16 h-16 text-gray-400 mb-4" />
  <p className="text-lg font-medium">No photos with locations</p>
  <p className="text-sm text-gray-500 mt-1 text-center max-w-md">
    Photos will appear on the map if they have GPS data,
    are linked to a location, or belong to an album linked to a location.
  </p>
</div>
```

### Phase 4: Integration

#### 4.1 Add Map Tab to Trip Photos Section

In `TripDetailPage.tsx` or photo gallery component, add a toggle:

```tsx
const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

<div className="flex gap-2 mb-4">
  <button
    onClick={() => setViewMode('grid')}
    className={viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}
  >
    <GridIcon /> Grid
  </button>
  <button
    onClick={() => setViewMode('map')}
    className={viewMode === 'map' ? 'btn-primary' : 'btn-secondary'}
  >
    <MapIcon /> Map
  </button>
</div>

{viewMode === 'grid' ? (
  <PhotoGallery photos={photos} />
) : (
  <PhotosMapView tripId={tripId} photos={photos} onPhotoClick={handlePhotoClick} />
)}
```

---

## File Changes Summary

### New Files
- `frontend/src/hooks/usePhotoLocations.ts` - Location resolution hook

### Modified Files
- `frontend/src/components/PhotosMapView.tsx` - Enhanced with fallback logic
- `frontend/src/services/location.service.ts` - Add bulk fetch (if needed)
- `backend/src/services/location.service.ts` - Add bulk fetch endpoint (if needed)
- `backend/src/routes/location.routes.ts` - Add bulk route (if needed)
- `frontend/src/pages/TripDetailPage.tsx` - Add map view toggle (or wherever photos are displayed)

### Dependencies
- No new dependencies required (uses existing react-leaflet, marker cluster)

---

## Data Flow Diagram

```
Photos Array
    │
    ├─── Has EXIF lat/lng? ─── YES ──→ Use EXIF coordinates (source: 'exif')
    │           │
    │          NO
    │           │
    │           ▼
    │    Photo → Location link exists?
    │           │
    │    ┌──────┴──────┐
    │   YES           NO
    │    │             │
    │    ▼             ▼
    │  Location    Photo in album?
    │  has coords?     │
    │    │       ┌─────┴─────┐
    │   YES     YES         NO
    │    │       │           │
    │    ▼       ▼           ▼
    │  Use     Album →     Exclude
    │  linked  Location    from map
    │  location link?
    │  (source:   │
    │  'linked')  ▼
    │          Location
    │          has coords?
    │              │
    │        ┌─────┴─────┐
    │       YES         NO
    │        │           │
    │        ▼           ▼
    │      Use        Exclude
    │      album      from map
    │      location
    │      (source:
    │      'album')
    │
    ▼
PhotosMapView renders all photos with resolvedLocation
```

---

## Testing Checklist

- [ ] Photos with EXIF coordinates display correctly
- [ ] Photos linked directly to locations display at location coordinates
- [ ] Photos in albums linked to locations display at album's location
- [ ] Photos with no location are excluded from map
- [ ] Marker clustering works with mixed location sources
- [ ] Popup shows correct location source indicator
- [ ] Stats legend shows accurate counts
- [ ] Empty state displays when no photos have locations
- [ ] Immich photos with authenticated thumbnails work
- [ ] Performance acceptable with 100+ photos
- [ ] Dark mode styling correct

---

## Future Enhancements

1. **Filter by location source** - Toggle to show only EXIF/linked/album photos
2. **Create location from cluster** - Right-click cluster to create new location from photo coordinates
3. **Link photos to location from map** - Drag photo marker to location marker to create link
4. **Timeline slider** - Scrub through photos by date
5. **Heatmap view** - Alternative visualization showing photo density

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Data Enrichment | Medium |
| Phase 2: Backend (if needed) | Small |
| Phase 3: UI Updates | Medium |
| Phase 4: Integration | Small |
| **Total** | **Medium** |

---

## Review Notes & Potential Issues

### Issue 1: `getLinksByTargetType` Returns Only IDs, Not Coordinates

**Problem:** The existing `getLinksByTargetType` endpoint returns:
```typescript
{ sourceType: EntityType; sourceId: number; targetId: number }
```

It does NOT include location coordinates. We need to fetch location details separately.

**Solution:** Use existing `getLocationsByTrip` which returns all locations with coordinates, then build a lookup map. This is more efficient than a new bulk endpoint since:

- We likely already have locations loaded in the trip context
- One API call instead of two

**Updated approach:**

```typescript
// Already available - fetch once and reuse
const locations = await locationService.getLocationsByTrip(tripId);
const locationMap = new Map(locations.map(loc => [loc.id, loc]));

// Then use getLinksByTargetType for link mappings
const links = await entityLinkService.getLinksByTargetType(tripId, 'LOCATION');
```

### Issue 2: EntityLink `getDetails` for LOCATION Missing Coordinates

**Problem:** In `backend/src/services/entityLink.service.ts`, the `ENTITY_CONFIG.LOCATION.getDetails` only returns:
```typescript
{ id: location.id, name: location.name }
```

It does NOT include `latitude` and `longitude`.

**Impact:** If we use `EnrichedEntityLink` responses (like `getLinksFrom`), the `targetEntity` won't have coordinates.

**Solution:** Don't rely on enriched link responses for coordinates. Instead:

1. Fetch all trip locations separately (already have coordinates)
2. Use link data only for relationship mapping (sourceId → targetId)

### Issue 3: Photo's `albums` Array Structure

**Verified:** Photos returned from `getPhotosByTrip` include:

```typescript
albums?: { album: { id: number; name: string } }[]
```

This is transformed from `albumAssignments` in the controller. The structure is confirmed working.

### Issue 4: Multiple Albums per Photo

**Consideration:** A photo can belong to multiple albums. If multiple albums are linked to different locations, which location wins?

**Decision:** Use the FIRST album that has a linked location with valid coordinates. Document this behavior.

**Alternative (future):** Show photo at multiple locations if in multiple geolocated albums (creates duplicates on map).

### Issue 5: Locations Without Coordinates

**Problem:** A location may exist but have `latitude: null, longitude: null` (e.g., user created location without geocoding).

**Already handled:** The plan's logic checks `latitude != null && longitude != null` before using.

### Issue 6: Performance with Large Photo Sets

**Concern:** Trips with 500+ photos could be slow if we fetch all entity links.

**Mitigation strategies:**

1. `getLinksByTargetType` is efficient (single DB query with index)
2. Location lookup uses Map (O(1) access)
3. Resolution is done client-side in one pass
4. Consider adding pagination to map view for very large sets

**Recommendation:** Test with 500+ photo dataset. If slow, add:

- Loading skeleton for map
- Progressive loading (show EXIF photos first, then resolve others)

### Issue 7: Hook Dependency Management

**Concern:** The `usePhotoLocations` hook needs to re-fetch links when photos change, but not re-fetch locations unnecessarily.

**Solution:** Separate concerns:

```typescript
// Fetch locations once per trip (stable)
const { data: locations } = useQuery(['locations', tripId], ...);

// Fetch links once per trip (stable)
const { data: links } = useQuery(['entity-links', tripId, 'LOCATION'], ...);

// Resolve photos when any dependency changes (memoized)
const photosWithLocations = useMemo(() =>
  resolvePhotos(photos, locations, links),
  [photos, locations, links]
);
```

### Issue 8: Backend Bulk Endpoint May Not Be Needed

**Original plan:** Add `GET /api/trips/:tripId/locations/bulk?ids=1,2,3`

**Revised:** Not needed because:

- `getLocationsByTrip` already returns all locations with coordinates
- Building a lookup map from existing data is simpler
- Avoids new endpoint maintenance

**Remove from plan:** Phase 2 backend changes can be skipped entirely.

---

## Updated Implementation Approach

### Simplified Data Flow

```text
1. Fetch photos (existing) → Photo[]
2. Fetch trip locations (existing) → Location[] → Map<id, Location>
3. Fetch entity links (existing) → getLinksByTargetType('LOCATION')
   → Build Map<photoId, locationId> for PHOTO sources
   → Build Map<albumId, locationId> for PHOTO_ALBUM sources
4. Resolve each photo's location (client-side, memoized)
5. Render map with resolved locations
```

### No New Backend Endpoints Needed

All required data is available from existing endpoints:

- `GET /photos/trip/:tripId` - Photos with albums
- `GET /locations/trip/:tripId` - Locations with coordinates
- `GET /trips/:tripId/links/target-type/LOCATION` - All links to locations

---

## Revised File Changes

### New Files

- `frontend/src/hooks/usePhotoLocations.ts` - Location resolution hook

### Modified Files

- `frontend/src/components/PhotosMapView.tsx` - Enhanced with fallback logic
- Photo gallery/tab component - Add map view toggle

### No Backend Changes Required
