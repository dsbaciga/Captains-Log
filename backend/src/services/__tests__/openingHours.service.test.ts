/**
 * OpeningHours Service Tests
 *
 * Test cases:
 * - OH-001: Parse 24/7 as always open
 * - OH-002: Weekday ranges (Mo-Fr) open and closed boundaries
 * - OH-003: Weekday lists and combinations (Mo,We,Fr / Mo-We,Fr)
 * - OH-004: Wrapping weekday ranges (Fr-Mo)
 * - OH-005: Multiple time ranges in one day (lunch closure)
 * - OH-006: Time ranges crossing midnight
 * - OH-007: Explicit `off` / `closed` rules and `;` override precedence
 * - OH-008: Bare time selector applies to every day
 * - OH-009: Days not mentioned by any rule are closed
 * - OH-010: Unparseable specifications return UNKNOWN
 * - OH-011: Public/school holiday rules resolve only when both readings agree
 * - OH-012: Timezone correctness — same instant, different zones
 * - OH-013: Daylight saving transitions
 * - OH-014: Invalid timezone and invalid date return UNKNOWN
 * - OH-015: Whitespace, casing and formatting tolerance
 * - OH-016: 24:00 and whole-day time ranges
 * - OH-017: Boundary minutes are half-open [start, end)
 * - OH-018: parse() / isSupported() surface
 * - OH-019: The motivating case — 9am Monday at a Monday-closed museum
 */

// This service is pure logic with no database access, so no prisma mock is needed.
import openingHoursService from '../openingHours.service';

describe('OpeningHoursService', () => {
  const PARIS = 'Europe/Paris';
  const NEW_YORK = 'America/New_York';
  const TOKYO = 'Asia/Tokyo';
  const UTC = 'UTC';

  /**
   * Build the instant corresponding to a wall-clock time in a given zone, without depending
   * on the machine's local timezone. Offsets are stated explicitly per test so the intent of
   * each fixture is visible.
   */
  const utc = (iso: string): Date => new Date(iso);

  /** 2026-07-20 is a Monday, which anchors most weekday fixtures below. */
  const MONDAY_UTC = '2026-07-20';
  const TUESDAY_UTC = '2026-07-21';
  const WEDNESDAY_UTC = '2026-07-22';
  const THURSDAY_UTC = '2026-07-23';
  const FRIDAY_UTC = '2026-07-24';
  const SATURDAY_UTC = '2026-07-25';
  const SUNDAY_UTC = '2026-07-26';

  // ============================================================
  // OH-001: Parse 24/7 as always open
  // ============================================================
  describe('OH-001: 24/7', () => {
    it('should report open at any hour on any day', () => {
      const instants = [
        `${MONDAY_UTC}T00:00:00Z`,
        `${WEDNESDAY_UTC}T12:30:00Z`,
        `${SUNDAY_UTC}T23:59:00Z`,
      ];

      for (const instant of instants) {
        expect(openingHoursService.evaluate('24/7', utc(instant), UTC).status).toBe('OPEN');
      }
    });

    it('should tolerate surrounding whitespace', () => {
      expect(openingHoursService.evaluate('  24/7  ', utc(`${MONDAY_UTC}T03:00:00Z`), UTC).status).toBe('OPEN');
    });
  });

  // ============================================================
  // OH-002: Weekday ranges open and closed boundaries
  // ============================================================
  describe('OH-002: Weekday ranges', () => {
    const spec = 'Mo-Fr 09:00-17:00';

    it('should be open inside the range on a weekday', () => {
      expect(openingHoursService.evaluate(spec, utc(`${WEDNESDAY_UTC}T12:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should be closed before opening time', () => {
      expect(openingHoursService.evaluate(spec, utc(`${WEDNESDAY_UTC}T08:59:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should be closed after closing time', () => {
      expect(openingHoursService.evaluate(spec, utc(`${WEDNESDAY_UTC}T17:30:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should be closed on Saturday and Sunday', () => {
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T12:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${SUNDAY_UTC}T12:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should cover every weekday named by the range', () => {
      const weekdays = [MONDAY_UTC, TUESDAY_UTC, WEDNESDAY_UTC, THURSDAY_UTC, FRIDAY_UTC];
      for (const day of weekdays) {
        expect(openingHoursService.evaluate(spec, utc(`${day}T10:00:00Z`), UTC).status).toBe('OPEN');
      }
    });
  });

  // ============================================================
  // OH-003: Weekday lists and combinations
  // ============================================================
  describe('OH-003: Weekday lists', () => {
    it('should honour a comma-separated list', () => {
      const spec = 'Mo,We,Fr 10:00-14:00';
      expect(openingHoursService.evaluate(spec, utc(`${MONDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T11:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${WEDNESDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${THURSDAY_UTC}T11:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${FRIDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should honour a mix of ranges and single days', () => {
      const spec = 'Mo-We,Sa 10:00-14:00';
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${THURSDAY_UTC}T11:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
    });
  });

  // ============================================================
  // OH-004: Wrapping weekday ranges
  // ============================================================
  describe('OH-004: Wrapping weekday ranges', () => {
    const spec = 'Fr-Mo 10:00-14:00';

    it('should include the days either side of the week boundary', () => {
      expect(openingHoursService.evaluate(spec, utc(`${FRIDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${SUNDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${MONDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should exclude the days in the middle of the week', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T11:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${WEDNESDAY_UTC}T11:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${THURSDAY_UTC}T11:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should treat Su-Sa as the whole week', () => {
      const wholeWeek = 'Su-Sa 08:00-20:00';
      const days = [MONDAY_UTC, TUESDAY_UTC, WEDNESDAY_UTC, THURSDAY_UTC, FRIDAY_UTC, SATURDAY_UTC, SUNDAY_UTC];
      for (const day of days) {
        expect(openingHoursService.evaluate(wholeWeek, utc(`${day}T12:00:00Z`), UTC).status).toBe('OPEN');
      }
    });
  });

  // ============================================================
  // OH-005: Multiple time ranges in one day
  // ============================================================
  describe('OH-005: Multiple time ranges per day', () => {
    const spec = 'Mo-Fr 09:00-12:00,13:00-18:00';

    it('should be open in the morning window', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should be closed during the lunch gap', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T12:30:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should be open in the afternoon window', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T15:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should tolerate spaces around the comma', () => {
      const spaced = 'Mo-Fr 09:00-12:00, 13:00-18:00';
      expect(openingHoursService.evaluate(spaced, utc(`${TUESDAY_UTC}T15:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spaced, utc(`${TUESDAY_UTC}T12:30:00Z`), UTC).status).toBe('CLOSED');
    });
  });

  // ============================================================
  // OH-006: Time ranges crossing midnight
  // ============================================================
  describe('OH-006: Overnight ranges', () => {
    const spec = 'Fr-Sa 20:00-02:00';

    it('should be open on the evening the range starts', () => {
      expect(openingHoursService.evaluate(spec, utc(`${FRIDAY_UTC}T22:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should still be open after midnight on the following day', () => {
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T01:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should be closed once the overnight range ends', () => {
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T02:30:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should spill into Sunday from the Saturday rule', () => {
      expect(openingHoursService.evaluate(spec, utc(`${SUNDAY_UTC}T01:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${SUNDAY_UTC}T22:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should not leak into the morning before the first opening day', () => {
      // Friday 01:00 would only be open if Thursday's (absent) rule ran overnight.
      expect(openingHoursService.evaluate(spec, utc(`${FRIDAY_UTC}T01:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should handle an every-day overnight range', () => {
      const nightly = '22:00-06:00';
      expect(openingHoursService.evaluate(nightly, utc(`${WEDNESDAY_UTC}T23:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(nightly, utc(`${WEDNESDAY_UTC}T05:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(nightly, utc(`${WEDNESDAY_UTC}T12:00:00Z`), UTC).status).toBe('CLOSED');
    });
  });

  // ============================================================
  // OH-007: `off` rules and `;` override precedence
  // ============================================================
  describe('OH-007: Closed rules and rule precedence', () => {
    it('should close a day named by a later off rule', () => {
      const spec = 'Mo-Su 09:00-17:00; We off';
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T12:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${WEDNESDAY_UTC}T12:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should accept `closed` as a synonym for `off`', () => {
      const spec = 'Mo-Su 09:00-17:00; Su closed';
      expect(openingHoursService.evaluate(spec, utc(`${SUNDAY_UTC}T12:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T12:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should let a later rule reopen a day an earlier rule closed', () => {
      const spec = 'Mo off; Mo 10:00-12:00';
      expect(openingHoursService.evaluate(spec, utc(`${MONDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should let a later rule replace an earlier rule for the same day', () => {
      // Per the OSM spec `;` overrides rather than accumulates, so the morning window is lost.
      const spec = 'Mo-Fr 09:00-12:00; Mo-Fr 13:00-17:00';
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('CLOSED');
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T14:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should treat a bare off as closed on every day', () => {
      expect(openingHoursService.evaluate('off', utc(`${TUESDAY_UTC}T14:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should leave unrelated days untouched by an off rule', () => {
      const spec = 'Mo-Fr 09:00-17:00; Sa off';
      expect(openingHoursService.evaluate(spec, utc(`${MONDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T10:00:00Z`), UTC).status).toBe('CLOSED');
    });
  });

  // ============================================================
  // OH-008: Bare time selector applies to every day
  // ============================================================
  describe('OH-008: Time-only specifications', () => {
    it('should apply the range to all seven days', () => {
      const spec = '08:00-20:00';
      const days = [MONDAY_UTC, TUESDAY_UTC, WEDNESDAY_UTC, THURSDAY_UTC, FRIDAY_UTC, SATURDAY_UTC, SUNDAY_UTC];
      for (const day of days) {
        expect(openingHoursService.evaluate(spec, utc(`${day}T12:00:00Z`), UTC).status).toBe('OPEN');
        expect(openingHoursService.evaluate(spec, utc(`${day}T07:00:00Z`), UTC).status).toBe('CLOSED');
      }
    });
  });

  // ============================================================
  // OH-009: Days not mentioned by any rule are closed
  // ============================================================
  describe('OH-009: Unmentioned days', () => {
    it('should report closed for a day no rule selects', () => {
      const result = openingHoursService.evaluate('Sa-Su 10:00-18:00', utc(`${WEDNESDAY_UTC}T12:00:00Z`), UTC);
      expect(result.status).toBe('CLOSED');
    });
  });

  // ============================================================
  // OH-010: Unparseable specifications return UNKNOWN
  // ============================================================
  describe('OH-010: Unsupported syntax returns UNKNOWN', () => {
    const unsupported: Array<[string, string]> = [
      ['month selector', 'Apr-Oct 09:00-18:00'],
      ['date selector', 'Dec 25 off'],
      ['year selector', '2026 Mo-Fr 09:00-17:00'],
      ['week selector', 'week 1-10 Mo-Fr 09:00-17:00'],
      ['nth weekday', 'Mo[1] 09:00-17:00'],
      ['variable time', 'Mo-Su sunrise-sunset'],
      ['variable time with offset', 'Mo-Su (sunset-01:00)-23:00'],
      ['open-ended time', 'Mo-Fr 08:00+'],
      ['fallback rule', 'Mo-Fr 09:00-17:00 || 10:00-16:00'],
      ['comment', 'Mo-Fr 09:00-17:00 "by appointment"'],
      ['unknown keyword', 'unknown'],
      ['bare weekday selector', 'Mo-Fr'],
      ['hours past midnight marker', 'Mo 22:00-26:00'],
      ['invalid minutes', 'Mo 09:70-17:00'],
      ['garbage', 'whenever we feel like it'],
      ['empty string', ''],
      ['whitespace only', '   '],
      ['additional-rule comma', 'Mo-Fr 09:00-17:00, Sa 10:00-14:00'],
      ['holiday range', 'PH-Mo 09:00-17:00'],
      ['holiday mixed with weekdays', 'PH,Su 09:00-17:00'],
    ];

    it.each(unsupported)('should return UNKNOWN for %s', (_label, spec) => {
      const result = openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T12:00:00Z`), UTC);
      expect(result.status).toBe('UNKNOWN');
      expect(result.reason).toBeTruthy();
    });

    it('should never report CLOSED for something it cannot parse', () => {
      for (const [, spec] of unsupported) {
        expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T12:00:00Z`), UTC).status).not.toBe('CLOSED');
      }
    });
  });

  // ============================================================
  // OH-011: Public/school holiday rules
  // ============================================================
  describe('OH-011: Public and school holiday rules', () => {
    const spec = 'Mo-Fr 09:00-17:00; PH off';

    it('should return UNKNOWN when the holiday rule could change the answer', () => {
      // A Tuesday morning: open normally, closed if it happens to be a public holiday.
      const result = openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T10:00:00Z`), UTC);
      expect(result.status).toBe('UNKNOWN');
      expect(result.reason).toContain('holiday');
    });

    it('should return CLOSED when both readings agree it is closed', () => {
      // A Sunday: closed by the weekday rule and closed by the holiday rule.
      expect(openingHoursService.evaluate(spec, utc(`${SUNDAY_UTC}T10:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should return CLOSED outside opening hours on a weekday', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T03:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should handle a PH rule that opens rather than closes', () => {
      const phOpen = 'Mo-Fr 09:00-17:00; PH 10:00-14:00';
      // Sunday 11:00: closed normally, open if it is a public holiday.
      expect(openingHoursService.evaluate(phOpen, utc(`${SUNDAY_UTC}T11:00:00Z`), UTC).status).toBe('UNKNOWN');
      // Sunday 20:00: closed under both readings.
      expect(openingHoursService.evaluate(phOpen, utc(`${SUNDAY_UTC}T20:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should apply the same treatment to SH (school holiday) rules', () => {
      const shSpec = 'Mo-Fr 09:00-17:00; SH off';
      expect(openingHoursService.evaluate(shSpec, utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('UNKNOWN');
      expect(openingHoursService.evaluate(shSpec, utc(`${SUNDAY_UTC}T10:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should respect rule order — a weekday rule after PH wins', () => {
      // The Mo-Fr rule comes last, so it governs weekdays whether or not it is a holiday.
      const phFirst = 'PH off; Mo-Fr 09:00-17:00';
      expect(openingHoursService.evaluate(phFirst, utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
    });
  });

  // ============================================================
  // OH-012: Timezone correctness
  // ============================================================
  describe('OH-012: Timezone handling', () => {
    const spec = 'Mo-Fr 09:00-17:00';

    it('should read the same instant differently in different zones', () => {
      // 2026-07-21T13:00Z is Tuesday 15:00 in Paris (open) and Tuesday 09:00 in New York (open),
      // but Tuesday 22:00 in Tokyo (closed).
      const instant = utc(`${TUESDAY_UTC}T13:00:00Z`);
      expect(openingHoursService.evaluate(spec, instant, PARIS).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, instant, NEW_YORK).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, instant, TOKYO).status).toBe('CLOSED');
    });

    it('should not use UTC as a silent fallback', () => {
      // 2026-07-21T02:00Z is Tuesday 11:00 in Tokyo (open) but 02:00 UTC (closed).
      const instant = utc(`${TUESDAY_UTC}T02:00:00Z`);
      expect(openingHoursService.evaluate(spec, instant, TOKYO).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, instant, UTC).status).toBe('CLOSED');
    });

    it('should shift the weekday when the zone crosses a day boundary', () => {
      // 2026-07-20T23:00Z is still Monday in UTC but already Tuesday 08:00 in Tokyo.
      const instant = utc(`${MONDAY_UTC}T23:00:00Z`);
      const mondayOnly = 'Mo 09:00-17:00';
      expect(openingHoursService.evaluate(mondayOnly, instant, TOKYO).status).toBe('CLOSED');

      // 2026-07-21T02:00Z is Monday 22:00 in New York, inside a Monday evening window.
      const mondayEvening = 'Mo 20:00-23:00';
      expect(openingHoursService.evaluate(mondayEvening, utc(`${TUESDAY_UTC}T02:00:00Z`), NEW_YORK).status).toBe('OPEN');
    });

    it('should keep overnight ranges correct across a zone shift', () => {
      // 2026-07-25T03:00Z is Friday 23:00 in New York, inside a Friday overnight window.
      const spec2 = 'Fr 20:00-02:00';
      expect(openingHoursService.evaluate(spec2, utc(`${SATURDAY_UTC}T03:00:00Z`), NEW_YORK).status).toBe('OPEN');
      // The same instant is Saturday 03:00 UTC, past the end of the Friday window there.
      expect(openingHoursService.evaluate(spec2, utc(`${SATURDAY_UTC}T03:00:00Z`), UTC).status).toBe('CLOSED');
    });
  });

  // ============================================================
  // OH-013: Daylight saving transitions
  // ============================================================
  describe('OH-013: Daylight saving transitions', () => {
    const spec = 'Mo-Su 09:00-17:00';

    it('should use the summer offset in July for Paris (UTC+2)', () => {
      // 07:30Z is 09:30 in Paris — open.
      expect(openingHoursService.evaluate(spec, utc('2026-07-22T07:30:00Z'), PARIS).status).toBe('OPEN');
      // 06:30Z is 08:30 in Paris — closed.
      expect(openingHoursService.evaluate(spec, utc('2026-07-22T06:30:00Z'), PARIS).status).toBe('CLOSED');
    });

    it('should use the winter offset in January for Paris (UTC+1)', () => {
      // 08:30Z is 09:30 in Paris — open.
      expect(openingHoursService.evaluate(spec, utc('2026-01-21T08:30:00Z'), PARIS).status).toBe('OPEN');
      // 07:30Z is 08:30 in Paris — closed.
      expect(openingHoursService.evaluate(spec, utc('2026-01-21T07:30:00Z'), PARIS).status).toBe('CLOSED');
    });

    it('should evaluate correctly on the spring-forward morning in New York', () => {
      // 2026-03-08 is the US spring-forward date; 02:00 local does not exist.
      // 07:30Z is 02:30 EST → 03:30 EDT after the jump, inside a 03:00-05:00 window.
      const window = 'Su 03:00-05:00';
      expect(openingHoursService.evaluate(window, utc('2026-03-08T07:30:00Z'), NEW_YORK).status).toBe('OPEN');
      // 06:30Z is 01:30 EST, before the jump and outside the window.
      expect(openingHoursService.evaluate(window, utc('2026-03-08T06:30:00Z'), NEW_YORK).status).toBe('CLOSED');
    });

    it('should evaluate correctly on the autumn fall-back morning in New York', () => {
      // 2026-11-01 is the US fall-back date; 01:00-02:00 local happens twice.
      // 05:30Z is 01:30 EDT (first pass) and 06:30Z is 01:30 EST (second pass).
      const window = 'Su 01:00-02:00';
      expect(openingHoursService.evaluate(window, utc('2026-11-01T05:30:00Z'), NEW_YORK).status).toBe('OPEN');
      expect(openingHoursService.evaluate(window, utc('2026-11-01T06:30:00Z'), NEW_YORK).status).toBe('OPEN');
      // 07:30Z is 02:30 EST, past the window under either reading.
      expect(openingHoursService.evaluate(window, utc('2026-11-01T07:30:00Z'), NEW_YORK).status).toBe('CLOSED');
    });

    it('should handle a southern-hemisphere zone whose DST runs opposite', () => {
      // Sydney is UTC+10 in July (winter) and UTC+11 in January (summer).
      const sydney = 'Australia/Sydney';
      // 2026-07-22T00:30Z is 10:30 in Sydney — open.
      expect(openingHoursService.evaluate(spec, utc('2026-07-22T00:30:00Z'), sydney).status).toBe('OPEN');
      // 2026-01-21T23:30Z is 10:30 the next day in Sydney — open.
      expect(openingHoursService.evaluate(spec, utc('2026-01-21T23:30:00Z'), sydney).status).toBe('OPEN');
      // 2026-01-21T20:30Z is 07:30 in Sydney — closed.
      expect(openingHoursService.evaluate(spec, utc('2026-01-21T20:30:00Z'), sydney).status).toBe('CLOSED');
    });

    it('should handle a half-hour offset zone', () => {
      // Kolkata is UTC+5:30 year round. 04:00Z is 09:30 local — open.
      expect(openingHoursService.evaluate(spec, utc('2026-07-22T04:00:00Z'), 'Asia/Kolkata').status).toBe('OPEN');
      // 03:00Z is 08:30 local — closed.
      expect(openingHoursService.evaluate(spec, utc('2026-07-22T03:00:00Z'), 'Asia/Kolkata').status).toBe('CLOSED');
    });
  });

  // ============================================================
  // OH-014: Invalid timezone and invalid date
  // ============================================================
  describe('OH-014: Invalid inputs', () => {
    it('should return UNKNOWN for an unrecognised timezone', () => {
      const result = openingHoursService.evaluate('Mo-Fr 09:00-17:00', utc(`${TUESDAY_UTC}T10:00:00Z`), 'Middle/Earth');
      expect(result.status).toBe('UNKNOWN');
      expect(result.reason).toContain('Middle/Earth');
    });

    it('should return UNKNOWN for an empty timezone', () => {
      expect(openingHoursService.evaluate('Mo-Fr 09:00-17:00', utc(`${TUESDAY_UTC}T10:00:00Z`), '').status).toBe('UNKNOWN');
      expect(openingHoursService.evaluate('Mo-Fr 09:00-17:00', utc(`${TUESDAY_UTC}T10:00:00Z`), '   ').status).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for an invalid date', () => {
      const result = openingHoursService.evaluate('Mo-Fr 09:00-17:00', new Date('not a date'), UTC);
      expect(result.status).toBe('UNKNOWN');
    });
  });

  // ============================================================
  // OH-015: Whitespace, casing and formatting tolerance
  // ============================================================
  describe('OH-015: Formatting tolerance', () => {
    it('should be case-insensitive', () => {
      expect(openingHoursService.evaluate('MO-FR 09:00-17:00', utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate('mo-fr 09:00-17:00', utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should tolerate extra whitespace around separators', () => {
      const spec = '  Mo - Fr   09:00 - 17:00 ;  Sa   10:00 - 14:00  ';
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T11:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${SATURDAY_UTC}T16:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should tolerate a trailing semicolon', () => {
      expect(openingHoursService.evaluate('Mo-Fr 09:00-17:00;', utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should accept single-digit hours', () => {
      expect(openingHoursService.evaluate('Mo-Fr 9:00-17:00', utc(`${TUESDAY_UTC}T10:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate('Mo-Fr 9:00-17:00', utc(`${TUESDAY_UTC}T08:00:00Z`), UTC).status).toBe('CLOSED');
    });
  });

  // ============================================================
  // OH-016: 24:00 and whole-day ranges
  // ============================================================
  describe('OH-016: Whole-day ranges', () => {
    it('should treat 00:00-24:00 as open all day', () => {
      const spec = 'Mo-Su 00:00-24:00';
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T00:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T23:59:00Z`), UTC).status).toBe('OPEN');
    });

    it('should treat 00:00-00:00 as open all day', () => {
      const spec = 'Mo 00:00-00:00';
      expect(openingHoursService.evaluate(spec, utc(`${MONDAY_UTC}T13:00:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T13:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should accept 24:00 as a closing time', () => {
      const spec = 'Mo-Su 18:00-24:00';
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T23:30:00Z`), UTC).status).toBe('OPEN');
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T17:30:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should reject 24:30 as out of range', () => {
      expect(openingHoursService.evaluate('Mo 18:00-24:30', utc(`${MONDAY_UTC}T20:00:00Z`), UTC).status).toBe('UNKNOWN');
    });
  });

  // ============================================================
  // OH-017: Boundary minutes are half-open [start, end)
  // ============================================================
  describe('OH-017: Interval boundaries', () => {
    const spec = 'Mo-Fr 09:00-17:00';

    it('should be open exactly at the opening minute', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T09:00:00Z`), UTC).status).toBe('OPEN');
    });

    it('should be closed exactly at the closing minute', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T17:00:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should be open one minute before closing', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T16:59:00Z`), UTC).status).toBe('OPEN');
    });

    it('should be closed one minute before opening', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T08:59:00Z`), UTC).status).toBe('CLOSED');
    });

    it('should ignore seconds within the opening minute', () => {
      expect(openingHoursService.evaluate(spec, utc(`${TUESDAY_UTC}T16:59:59Z`), UTC).status).toBe('OPEN');
    });
  });

  // ============================================================
  // OH-018: parse() / isSupported() surface
  // ============================================================
  describe('OH-018: Parse surface', () => {
    it('should report supported specifications', () => {
      expect(openingHoursService.isSupported('24/7')).toBe(true);
      expect(openingHoursService.isSupported('Mo-Fr 09:00-17:00; Sa 10:00-14:00; Su off')).toBe(true);
      expect(openingHoursService.isSupported('Mo-Fr 09:00-17:00; PH off')).toBe(true);
    });

    it('should report unsupported specifications', () => {
      expect(openingHoursService.isSupported('Apr-Oct 09:00-18:00')).toBe(false);
      expect(openingHoursService.isSupported('Mo-Su sunrise-sunset')).toBe(false);
      expect(openingHoursService.isSupported('')).toBe(false);
    });

    it('should return the parsed rules for a supported specification', () => {
      const result = openingHoursService.parse('Mo-Fr 09:00-17:00; Su off');
      expect(result.supported).toBe(true);
      if (result.supported) {
        expect(result.rules).toHaveLength(2);
        expect(result.rules[0].closed).toBe(false);
        expect(result.rules[0].ranges).toEqual([{ startMinutes: 540, endMinutes: 1020 }]);
        expect(result.rules[1].closed).toBe(true);
      }
    });

    it('should return a reason for an unsupported specification', () => {
      const result = openingHoursService.parse('Dec 25 off');
      expect(result.supported).toBe(false);
      if (!result.supported) {
        expect(result.reason).toContain('Unsupported rule');
      }
    });
  });

  // ============================================================
  // OH-019: The motivating case
  // ============================================================
  describe('OH-019: Monday-closed museum', () => {
    // The Louvre's real OSM tag shape: closed Tuesdays, late night on Wednesday and Friday.
    const museum = 'Mo,Th,Sa,Su 09:00-18:00; We,Fr 09:00-21:45; Tu off';

    it('should catch a 09:00 Tuesday visit to a Tuesday-closed museum', () => {
      // 2026-07-21T07:00Z is Tuesday 09:00 in Paris.
      const result = openingHoursService.evaluate(museum, utc(`${TUESDAY_UTC}T07:00:00Z`), PARIS);
      expect(result.status).toBe('CLOSED');
    });

    it('should allow a 09:00 Monday visit', () => {
      expect(openingHoursService.evaluate(museum, utc(`${MONDAY_UTC}T07:00:00Z`), PARIS).status).toBe('OPEN');
    });

    it('should allow a late Wednesday evening visit', () => {
      // 2026-07-22T19:00Z is Wednesday 21:00 in Paris.
      expect(openingHoursService.evaluate(museum, utc(`${WEDNESDAY_UTC}T19:00:00Z`), PARIS).status).toBe('OPEN');
    });

    it('should reject the same late evening visit on a Thursday', () => {
      // 2026-07-23T19:00Z is Thursday 21:00 in Paris, after the 18:00 close.
      expect(openingHoursService.evaluate(museum, utc(`${THURSDAY_UTC}T19:00:00Z`), PARIS).status).toBe('CLOSED');
    });
  });
});
