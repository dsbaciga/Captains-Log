import { AIRPORTS, Airport } from '../data/airports';

/** A single airport returned by a search. */
export interface AirportSearchResult {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

const MAX_RESULTS = 10;

function toResult(a: Airport): AirportSearchResult {
  return {
    iata: a.iata,
    icao: a.icao,
    name: a.name,
    city: a.city,
    country: a.country,
    latitude: a.lat,
    longitude: a.lng,
  };
}

/**
 * Search airports by IATA/ICAO code or by airport/city name.
 *
 * Results are ranked into tiers: an exact IATA match first, then code prefix
 * matches (IATA or ICAO), then name/city substring matches. Within each tier
 * the source order is preserved, and AIRPORTS is pre-sorted largest-first so
 * major hubs surface ahead of minor airports.
 */
export function searchAirports(query: string, limit: number = MAX_RESULTS): AirportSearchResult[] {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const upper = q.toUpperCase();
  const lower = q.toLowerCase();

  const exact: Airport[] = [];
  const codeMatch: Airport[] = [];
  const textMatch: Airport[] = [];

  for (const a of AIRPORTS) {
    if (a.iata === upper) {
      exact.push(a);
    } else if (a.iata.startsWith(upper) || a.icao === upper || a.icao.startsWith(upper)) {
      codeMatch.push(a);
    } else if (a.name.toLowerCase().includes(lower) || a.city.toLowerCase().includes(lower)) {
      textMatch.push(a);
    }
  }

  return [...exact, ...codeMatch, ...textMatch].slice(0, limit).map(toResult);
}

export default { searchAirports };
