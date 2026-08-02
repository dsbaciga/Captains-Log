import { describe, it, expect } from 'vitest';
import { filterValidCoordinates, filterMapVisibleLocations } from '../mapUtils';

describe('filterValidCoordinates', () => {
  it('keeps only entries with both coordinates set', () => {
    const input = [
      { latitude: 48.8, longitude: 2.3 },
      { latitude: null, longitude: 2.3 },
      { latitude: 40.7, longitude: null },
      { latitude: null, longitude: null },
    ];

    expect(filterValidCoordinates(input)).toEqual([{ latitude: 48.8, longitude: 2.3 }]);
  });

  it('ignores excludeFromMap (only concerned with coordinates)', () => {
    const input = [{ latitude: 48.8, longitude: 2.3, excludeFromMap: true }];

    expect(filterValidCoordinates(input)).toEqual(input);
  });
});

describe('filterMapVisibleLocations', () => {
  it('drops locations flagged excludeFromMap so they do not affect bounds/zoom', () => {
    const home = { id: 1, latitude: 40.7, longitude: -74.0, excludeFromMap: true };
    const paris = { id: 2, latitude: 48.8, longitude: 2.3, excludeFromMap: false };
    const rome = { id: 3, latitude: 41.9, longitude: 12.5 };

    const result = filterMapVisibleLocations([home, paris, rome]);

    expect(result).toEqual([paris, rome]);
  });

  it('still drops entries with missing coordinates', () => {
    const input = [
      { id: 1, latitude: null, longitude: null, excludeFromMap: false },
      { id: 2, latitude: 48.8, longitude: 2.3, excludeFromMap: false },
    ];

    expect(filterMapVisibleLocations(input)).toEqual([
      { id: 2, latitude: 48.8, longitude: 2.3, excludeFromMap: false },
    ]);
  });

  it('treats a missing excludeFromMap flag as included', () => {
    const input = [{ id: 1, latitude: 48.8, longitude: 2.3 }];

    expect(filterMapVisibleLocations(input)).toEqual(input);
  });
});
