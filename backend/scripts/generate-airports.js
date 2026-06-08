#!/usr/bin/env node
/**
 * Generates `backend/src/data/airports.ts` from the OurAirports public-domain dataset.
 *
 * Includes only airports that have a 3-letter IATA code AND scheduled passenger
 * service — these are the airports a traveller would realistically check off.
 *
 * Re-run whenever the upstream dataset should be refreshed:
 *   node backend/scripts/generate-airports.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const COUNTRIES_URL = 'https://davidmegginson.github.io/ourairports-data/countries.csv';

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, embedded newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function load(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function main() {
  console.log('Downloading OurAirports data...');
  const [airportsCsv, countriesCsv] = await Promise.all([
    load(AIRPORTS_URL),
    load(COUNTRIES_URL),
  ]);

  // ISO country code -> country name
  const countryRows = parseCsv(countriesCsv);
  const cHead = countryRows[0];
  const cCode = cHead.indexOf('code');
  const cName = cHead.indexOf('name');
  const countryNames = new Map();
  for (let i = 1; i < countryRows.length; i++) {
    const r = countryRows[i];
    if (r[cCode]) countryNames.set(r[cCode], r[cName]);
  }

  const rows = parseCsv(airportsCsv);
  const head = rows[0];
  const col = (name) => head.indexOf(name);
  const cType = col('type');
  const cAName = col('name');
  const cLat = col('latitude_deg');
  const cLng = col('longitude_deg');
  const cIso = col('iso_country');
  const cMuni = col('municipality');
  const cSched = col('scheduled_service');
  const cIcao = col('icao_code');
  const cIata = col('iata_code');
  const cGps = col('gps_code');
  const cIdent = col('ident');

  const rank = { large_airport: 0, medium_airport: 1, small_airport: 2 };
  const airports = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length <= cIata) continue;
    const iata = (r[cIata] || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(iata)) continue;
    if ((r[cSched] || '').trim().toLowerCase() !== 'yes') continue;
    const name = (r[cAName] || '').trim();
    if (!name) continue;
    const lat = parseFloat(r[cLat]);
    const lng = parseFloat(r[cLng]);
    const iso = (r[cIso] || '').trim();
    airports.push({
      iata,
      icao: ((r[cIcao] || r[cGps] || r[cIdent]) || '').trim().toUpperCase(),
      name,
      city: (r[cMuni] || '').trim(),
      country: countryNames.get(iso) || iso,
      lat: Number.isFinite(lat) ? Math.round(lat * 1e5) / 1e5 : 0,
      lng: Number.isFinite(lng) ? Math.round(lng * 1e5) / 1e5 : 0,
      _rank: rank[(r[cType] || '').trim()] ?? 3,
    });
  }

  // Largest airports first so search tie-breaks favour major hubs.
  airports.sort((a, b) => a._rank - b._rank || a.name.localeCompare(b.name));

  // Dedupe by IATA code, keeping the largest match.
  const seen = new Set();
  const unique = [];
  for (const a of airports) {
    if (seen.has(a.iata)) continue;
    seen.add(a.iata);
    const { _rank, ...rest } = a;
    unique.push(rest);
  }

  const lines = unique.map((a) => '  ' + JSON.stringify(a)).join(',\n');
  const out = `// AUTO-GENERATED — do not edit by hand. Run: node backend/scripts/generate-airports.js
// Source: OurAirports (https://ourairports.com/data/), public domain.
// Airports that have a 3-letter IATA code and scheduled passenger service.
// Ordered largest-first so search tie-breaks favour major hubs.

export interface Airport {
  /** 3-letter IATA code (e.g. "JFK") */
  iata: string;
  /** ICAO code (e.g. "KJFK"), best-effort */
  icao: string;
  /** Full airport name */
  name: string;
  /** City / municipality served (may be empty) */
  city: string;
  /** Country name */
  country: string;
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
}

export const AIRPORTS: Airport[] = [
${lines}
];
`;

  const outPath = path.join(__dirname, '..', 'src', 'data', 'airports.ts');
  fs.writeFileSync(outPath, out);
  console.log(`Wrote ${unique.length} airports -> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
