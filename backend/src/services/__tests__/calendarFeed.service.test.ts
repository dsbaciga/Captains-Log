/**
 * CalendarFeed Service Tests
 *
 * Test cases:
 * - CAL-001: ICS text escaping (backslash, semicolon, comma, newline)
 * - CAL-002: 75-octet line folding (ASCII and multi-byte UTF-8)
 * - CAL-003: Date/date-time formatting
 * - CAL-004: All-day event date math (DTEND exclusive)
 * - CAL-005: Transportation timezone conversion to UTC
 * - CAL-006: Full calendar generation for a token
 * - CAL-007: Unknown token yields 404
 */

// Mock the database config BEFORE imports (it transitively loads config which validates DATABASE_URL)
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  trip: {
    findMany: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import {
  escapeIcsText,
  foldIcsLine,
  formatIcsDate,
  formatIcsDateTimeUtc,
  addDays,
  localDateTimeToUtc,
  buildTripEvent,
  buildTransportationEvent,
  buildLodgingEvent,
  buildCalendar,
  calendarFeedService,
} from '../calendarFeed.service';
import { AppError } from '../../errors/errors';

describe('CalendarFeed Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CAL-001: escapeIcsText', () => {
    it('escapes backslashes, semicolons, commas, and newlines', () => {
      expect(escapeIcsText('a\\b;c,d')).toBe('a\\\\b\\;c\\,d');
      expect(escapeIcsText('line1\nline2\r\nline3')).toBe('line1\\nline2\\nline3');
    });

    it('escapes backslashes before adding escape backslashes', () => {
      // A literal "\n" in input must become "\\n", not be confused with a newline escape
      expect(escapeIcsText('C:\\notes')).toBe('C:\\\\notes');
    });

    it('leaves plain text unchanged', () => {
      expect(escapeIcsText('Simple summary 123')).toBe('Simple summary 123');
    });
  });

  describe('CAL-002: foldIcsLine', () => {
    it('leaves lines of 75 octets or fewer unchanged', () => {
      const line = 'X'.repeat(75);
      expect(foldIcsLine(line)).toBe(line);
    });

    it('folds long lines so every physical line is at most 75 octets', () => {
      const line = 'SUMMARY:' + 'a'.repeat(200);
      const folded = foldIcsLine(line);
      const physicalLines = folded.split('\r\n');
      expect(physicalLines.length).toBeGreaterThan(1);
      for (const physical of physicalLines) {
        expect(Buffer.byteLength(physical, 'utf8')).toBeLessThanOrEqual(75);
      }
      // Continuation lines start with a single space
      for (const continuation of physicalLines.slice(1)) {
        expect(continuation.startsWith(' ')).toBe(true);
      }
      // Unfolding (removing CRLF + space) restores the original line
      expect(folded.replace(/\r\n /g, '')).toBe(line);
    });

    it('never splits a multi-byte UTF-8 character across a fold', () => {
      // Each emoji is 4 octets; 30 of them = 120 octets, forcing a fold
      const line = 'SUMMARY:' + '🏨'.repeat(30);
      const folded = foldIcsLine(line);
      const physicalLines = folded.split('\r\n');
      for (const physical of physicalLines) {
        expect(Buffer.byteLength(physical, 'utf8')).toBeLessThanOrEqual(75);
        // Round-tripping through Buffer must not produce replacement characters
        expect(Buffer.from(physical, 'utf8').toString('utf8')).not.toContain('�');
      }
      expect(folded.replace(/\r\n /g, '')).toBe(line);
    });
  });

  describe('CAL-003: date formatting', () => {
    it('formats DATE values from UTC components', () => {
      expect(formatIcsDate(new Date(Date.UTC(2026, 6, 4)))).toBe('20260704');
      expect(formatIcsDate(new Date(Date.UTC(2026, 0, 1)))).toBe('20260101');
    });

    it('formats UTC DATE-TIME values', () => {
      expect(formatIcsDateTimeUtc(new Date(Date.UTC(2026, 6, 4, 9, 5, 30)))).toBe(
        '20260704T090530Z'
      );
    });
  });

  describe('CAL-004: all-day event date math', () => {
    it('trip events span startDate through endDate with exclusive DTEND (+1 day)', () => {
      const event = buildTripEvent({
        id: 7,
        title: 'Summer Vacation',
        description: 'Fun in the sun',
        startDate: new Date(Date.UTC(2026, 6, 4)),
        endDate: new Date(Date.UTC(2026, 6, 10)),
        status: 'planned',
        tripTypeEmoji: '🏖️',
      });
      expect(event).not.toBeNull();
      expect(event?.uid).toBe('trip-7@travel-life');
      expect(event?.summary).toBe('🏖️ Summer Vacation');
      expect(event?.allDay).toBe(true);
      expect(formatIcsDate(event!.start)).toBe('20260704');
      // Exclusive end: one day after the last trip day
      expect(formatIcsDate(event!.end!)).toBe('20260711');
    });

    it('single-day trips (no endDate) produce a one-day event', () => {
      const event = buildTripEvent({
        id: 8,
        title: 'Day Trip',
        description: null,
        startDate: new Date(Date.UTC(2026, 11, 31)),
        endDate: null,
        status: 'planned',
        tripTypeEmoji: null,
      });
      expect(formatIcsDate(event!.start)).toBe('20261231');
      // addDays crosses the year boundary correctly
      expect(formatIcsDate(event!.end!)).toBe('20270101');
    });

    it('trips without a startDate are skipped', () => {
      const event = buildTripEvent({
        id: 9,
        title: 'Dream Trip',
        description: null,
        startDate: null,
        endDate: null,
        status: 'dream',
        tripTypeEmoji: null,
      });
      expect(event).toBeNull();
    });

    it('lodging events span check-in through check-out day (exclusive DTEND)', () => {
      const event = buildLodgingEvent({
        id: 3,
        name: 'Grand Hotel',
        address: '1 Main St',
        checkInDate: new Date(Date.UTC(2026, 6, 4)),
        checkOutDate: new Date(Date.UTC(2026, 6, 8)),
      });
      expect(event.uid).toBe('lodging-3@travel-life');
      expect(event.summary).toBe('🏨 Grand Hotel');
      expect(formatIcsDate(event.start)).toBe('20260704');
      expect(formatIcsDate(event.end!)).toBe('20260709');
    });

    it('addDays handles month boundaries', () => {
      expect(formatIcsDate(addDays(new Date(Date.UTC(2026, 1, 28)), 1))).toBe('20260301');
    });
  });

  describe('CAL-005: transportation timezone conversion', () => {
    const baseTransport = {
      id: 5,
      type: 'Flight',
      company: 'Acme Air',
      referenceNumber: 'AA123',
      scheduledStart: new Date(Date.UTC(2026, 6, 4, 10, 0, 0)), // 10:00 wall clock
      scheduledEnd: new Date(Date.UTC(2026, 6, 4, 13, 30, 0)), // 13:30 wall clock
      startTimezone: 'America/New_York', // UTC-4 in July (EDT)
      endTimezone: 'America/Los_Angeles', // UTC-7 in July (PDT)
      startLocationText: 'JFK',
      endLocationText: 'LAX',
      startLocation: null,
      endLocation: null,
    };

    it('converts wall-clock departure/arrival to UTC using record timezones', () => {
      const event = buildTransportationEvent(baseTransport);
      expect(event).not.toBeNull();
      expect(event?.uid).toBe('transport-5@travel-life');
      expect(event?.summary).toBe('Flight Acme Air AA123: JFK → LAX');
      // 10:00 EDT = 14:00 UTC, 13:30 PDT = 20:30 UTC
      expect(formatIcsDateTimeUtc(event!.start)).toBe('20260704T140000Z');
      expect(formatIcsDateTimeUtc(event!.end!)).toBe('20260704T203000Z');
    });

    it('treats datetimes as UTC when no timezone is set', () => {
      const event = buildTransportationEvent({
        ...baseTransport,
        startTimezone: null,
        endTimezone: null,
      });
      expect(formatIcsDateTimeUtc(event!.start)).toBe('20260704T100000Z');
      expect(formatIcsDateTimeUtc(event!.end!)).toBe('20260704T133000Z');
    });

    it('falls back to UTC for invalid timezone identifiers', () => {
      const result = localDateTimeToUtc(new Date(Date.UTC(2026, 6, 4, 10, 0, 0)), 'Not/AZone');
      expect(result.toISOString()).toBe('2026-07-04T10:00:00.000Z');
    });

    it('handles winter (standard time) offsets', () => {
      // 10:00 EST in January = 15:00 UTC
      const result = localDateTimeToUtc(
        new Date(Date.UTC(2026, 0, 15, 10, 0, 0)),
        'America/New_York'
      );
      expect(result.toISOString()).toBe('2026-01-15T15:00:00.000Z');
    });

    it('skips transportation without a scheduled start', () => {
      const event = buildTransportationEvent({ ...baseTransport, scheduledStart: null });
      expect(event).toBeNull();
    });
  });

  describe('CAL-006: full calendar generation', () => {
    it('emits a valid VCALENDAR with CRLF endings, calendar name, and TTL hints', () => {
      const ics = buildCalendar([], new Date(Date.UTC(2026, 6, 19, 12, 0, 0)));
      const lines = ics.split('\r\n');
      expect(lines[0]).toBe('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0\r\n');
      expect(ics).toContain('X-WR-CALNAME:Travel Life\r\n');
      expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT12H\r\n');
      expect(ics).toContain('X-PUBLISHED-TTL:PT12H\r\n');
      expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
      // No bare LF anywhere
      expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    });

    it('generates events for trips, transportation, and lodging of the token owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 42 });
      mockPrisma.trip.findMany.mockResolvedValue([
        {
          id: 1,
          title: 'Paris; The Sequel, Part 2',
          description: 'Croissants\nand museums',
          startDate: new Date(Date.UTC(2026, 8, 1)),
          endDate: new Date(Date.UTC(2026, 8, 10)),
          status: 'planned',
          tripTypeEmoji: '✈️',
          transportation: [
            {
              id: 11,
              type: 'Flight',
              company: 'Air France',
              referenceNumber: 'AF001',
              scheduledStart: new Date(Date.UTC(2026, 8, 1, 18, 0, 0)),
              scheduledEnd: new Date(Date.UTC(2026, 8, 2, 7, 30, 0)),
              startTimezone: 'America/New_York',
              endTimezone: 'Europe/Paris',
              startLocationText: 'JFK',
              endLocationText: 'CDG',
              startLocation: null,
              endLocation: null,
            },
          ],
          lodging: [
            {
              id: 21,
              name: 'Hotel Lutetia',
              address: '45 Boulevard Raspail, Paris',
              checkInDate: new Date(Date.UTC(2026, 8, 2)),
              checkOutDate: new Date(Date.UTC(2026, 8, 10)),
            },
          ],
        },
      ]);

      const token = 'a'.repeat(64);
      const ics = await calendarFeedService.generateFeedForToken(token);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { calendarToken: token } })
      );
      // Cancelled trips are excluded in the query
      expect(mockPrisma.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 42,
            NOT: { status: { equals: 'cancelled', mode: 'insensitive' } },
          }),
        })
      );

      // Unfold for assertions
      const unfolded = ics.replace(/\r\n /g, '');
      expect(unfolded).toContain('UID:trip-1@travel-life');
      expect(unfolded).toContain('SUMMARY:✈️ Paris\\; The Sequel\\, Part 2');
      expect(unfolded).toContain('DESCRIPTION:Croissants\\nand museums');
      expect(unfolded).toContain('DTSTART;VALUE=DATE:20260901');
      expect(unfolded).toContain('DTEND;VALUE=DATE:20260911');

      expect(unfolded).toContain('UID:transport-11@travel-life');
      expect(unfolded).toContain('SUMMARY:Flight Air France AF001: JFK → LAX'.replace('LAX', 'CDG'));
      // 18:00 EDT = 22:00 UTC; 07:30 CEST = 05:30 UTC
      expect(unfolded).toContain('DTSTART:20260901T220000Z');
      expect(unfolded).toContain('DTEND:20260902T053000Z');

      expect(unfolded).toContain('UID:lodging-21@travel-life');
      expect(unfolded).toContain('SUMMARY:🏨 Hotel Lutetia');
      expect(unfolded).toContain('DTSTART;VALUE=DATE:20260902');
      expect(unfolded).toContain('DTEND;VALUE=DATE:20260911');
      expect(unfolded).toContain('LOCATION:45 Boulevard Raspail\\, Paris');

      // Every VEVENT has a DTSTAMP
      const eventCount = (unfolded.match(/BEGIN:VEVENT/g) ?? []).length;
      const dtstampCount = (unfolded.match(/DTSTAMP:/g) ?? []).length;
      expect(eventCount).toBe(3);
      expect(dtstampCount).toBe(3);
    });
  });

  describe('CAL-007: unknown token', () => {
    it('throws a 404 AppError for an unknown token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(calendarFeedService.generateFeedForToken('f'.repeat(64))).rejects.toThrow(
        AppError
      );
      await expect(
        calendarFeedService.generateFeedForToken('f'.repeat(64))
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
