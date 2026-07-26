import type { ReactNode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import PlacesVisitedMap from './PlacesVisitedMap';
import type { Location } from '../types/location';
import type { Transportation } from '../types/transportation';
import { vi } from 'vitest';
import { MapContainer } from 'react-leaflet';
import { mockLocation } from '../test/fixtures';

vi.mock('@changey/react-leaflet-markercluster', () => ({
    default: ({ children }: { children: ReactNode }) => <div data-testid="marker-cluster-group">{children}</div>,
}));

// Built from the shared fixture so this stays in step with the Location type;
// only the coordinates matter here (two close together, one far, to exercise
// marker clustering).
const mockLocations: Location[] = [
  { ...mockLocation, id: 1, name: 'Location 1', latitude: 40.7128, longitude: -74.006 },
  { ...mockLocation, id: 2, name: 'Location 2', latitude: 40.7138, longitude: -74.007 },
  { ...mockLocation, id: 3, name: 'Location 3', latitude: 34.0522, longitude: -118.2437 },
];


const mockTransportation: Transportation[] = [];

describe('PlacesVisitedMap', () => {
  it('should render markers', async () => {
    const { container } = render(
      <BrowserRouter>
        <MapContainer center={[0, 0]} zoom={1}>
          <PlacesVisitedMap locations={mockLocations} transportation={mockTransportation} />
        </MapContainer>
      </BrowserRouter>
    );

    await waitFor(() => {
        expect(container.querySelector('.leaflet-marker-icon')).toBeInTheDocument();
    });
  });
});
