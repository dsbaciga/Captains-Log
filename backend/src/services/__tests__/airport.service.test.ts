import { describe, it, expect } from '@jest/globals';
import { searchAirports } from '../airport.service';

describe('airport.service searchAirports', () => {
  describe('input handling', () => {
    it('returns an empty list for an empty query', () => {
      expect(searchAirports('')).toEqual([]);
    });

    it('returns an empty list for a whitespace-only query', () => {
      expect(searchAirports('   ')).toEqual([]);
    });

    it('returns an empty list for a single-character query', () => {
      expect(searchAirports('J')).toEqual([]);
    });
  });

  describe('IATA code search', () => {
    it('finds an airport by its exact IATA code', () => {
      const results = searchAirports('JFK');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].iata).toBe('JFK');
      expect(results[0].name).toMatch(/Kennedy/i);
    });

    it('is case-insensitive', () => {
      expect(searchAirports('jfk')[0].iata).toBe('JFK');
    });

    it('ranks the exact code match ahead of prefix and name matches', () => {
      expect(searchAirports('LHR')[0].iata).toBe('LHR');
      expect(searchAirports('LAX')[0].iata).toBe('LAX');
    });

    it('returns code-prefix matches', () => {
      const results = searchAirports('JF');
      expect(results.some((a) => a.iata === 'JFK')).toBe(true);
    });
  });

  describe('name and city search', () => {
    it('finds airports by a name fragment', () => {
      const results = searchAirports('Heathrow');
      expect(results.some((a) => a.iata === 'LHR')).toBe(true);
    });

    it('finds airports by city name', () => {
      const results = searchAirports('Los Angeles');
      expect(results.some((a) => a.iata === 'LAX')).toBe(true);
    });
  });

  describe('result shape and limits', () => {
    it('caps results at the default limit of 10', () => {
      expect(searchAirports('air').length).toBeLessThanOrEqual(10);
    });

    it('respects a custom limit', () => {
      expect(searchAirports('airport', 3).length).toBeLessThanOrEqual(3);
    });

    it('returns the expected fields for each result', () => {
      const [airport] = searchAirports('JFK');
      expect(airport).toEqual(
        expect.objectContaining({
          iata: expect.any(String),
          icao: expect.any(String),
          name: expect.any(String),
          city: expect.any(String),
          country: expect.any(String),
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        })
      );
    });

    it('returns no exact match for an unknown code', () => {
      const results = searchAirports('QXZ');
      expect(results.every((a) => a.iata !== 'QXZ')).toBe(true);
    });
  });
});
