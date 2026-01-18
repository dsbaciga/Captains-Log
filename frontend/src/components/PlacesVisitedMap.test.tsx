import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PlacesVisitedMap from './PlacesVisitedMap';
import { Location } from '../types/location';
import { Transportation } from '../types/transportation';
import { vi } from 'vitest';
import { MapContainer } from 'react-leaflet';

vi.mock('@changey/react-leaflet-markercluster', () => ({
    default: ({ children }) => <div data-testid="marker-cluster-group">{children}</div>,
}));

const mockLocations: Location[] = [
  { id: 1, name: 'Location 1', latitude: 40.7128, longitude: -74.006, address: '', tripId: 1, visitDate: null, visitOrder: null, notes: null, isVisited: true, description: null, website: null, category: null, rating: null, cost: null, currency: null, requiredTime: null },
  { id: 2, name: 'Location 2', latitude: 40.7138, longitude: -74.007, address: '', tripId: 1, visitDate: null, visitOrder: null, notes: null, isVisited: true, description: null, website: null, category: null, rating: null, cost: null, currency: null, requiredTime: null },
  { id: 3, name: 'Location 3', latitude: 34.0522, longitude: -118.2437, address: '', tripId: 1, visitDate: null, visitOrder: null, notes: null, isVisited: true, description: null, website: null, category: null, rating: null, cost: null, currency: null, requiredTime: null },
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
