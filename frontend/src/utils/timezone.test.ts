import { describe, it, expect } from 'vitest';
import {
  parseDateOnlyAsLocal,
  extractDatePortion,
  formatDateInTimezone,
  formatTimeInTimezone,
  formatDateTimeInTimezone,
} from './timezone';

describe('parseDateOnlyAsLocal', () => {
  it('parses a date-only string (YYYY-MM-DD) as noon local time', () => {
    const result = parseDateOnlyAsLocal('2025-01-15');

    // Should be Jan 15, 2025 at noon
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0); // January is 0
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('handles ISO string with midnight UTC (the problematic case)', () => {
    // This is what happens when the database returns a date-only field
    // "2025-01-15" stored in DB -> Prisma returns "2025-01-15T00:00:00.000Z"
    const result = parseDateOnlyAsLocal('2025-01-15T00:00:00.000Z');

    // Should still extract the date portion and create local noon
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(12);
  });

  it('handles various date formats correctly', () => {
    // Standard date
    expect(parseDateOnlyAsLocal('2025-06-30').getDate()).toBe(30);
    expect(parseDateOnlyAsLocal('2025-06-30').getMonth()).toBe(5); // June is 5

    // With time component
    expect(parseDateOnlyAsLocal('2025-12-25T14:30:00').getDate()).toBe(25);
    expect(parseDateOnlyAsLocal('2025-12-25T14:30:00').getMonth()).toBe(11); // December is 11
  });

  it('preserves the calendar date regardless of local timezone', () => {
    // The key test: if we create "Jan 15" it should stay "Jan 15"
    // regardless of what timezone the browser thinks it's in
    const dateStr = '2025-01-15';
    const result = parseDateOnlyAsLocal(dateStr);

    // When we format this date locally, it should still show Jan 15
    const formatted = `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
    expect(formatted).toBe('2025-01-15');
  });

  it('handles edge cases at year boundaries', () => {
    // New Year's Eve
    const nye = parseDateOnlyAsLocal('2025-12-31');
    expect(nye.getDate()).toBe(31);
    expect(nye.getMonth()).toBe(11);
    expect(nye.getFullYear()).toBe(2025);

    // New Year's Day
    const nyd = parseDateOnlyAsLocal('2026-01-01');
    expect(nyd.getDate()).toBe(1);
    expect(nyd.getMonth()).toBe(0);
    expect(nyd.getFullYear()).toBe(2026);
  });

  it('handles leap year dates', () => {
    // Feb 29 on a leap year
    const leapDay = parseDateOnlyAsLocal('2024-02-29');
    expect(leapDay.getDate()).toBe(29);
    expect(leapDay.getMonth()).toBe(1); // February is 1
    expect(leapDay.getFullYear()).toBe(2024);
  });

  it('falls back to standard parsing for invalid format', () => {
    // If the regex doesn't match, it should still try to parse
    const result = parseDateOnlyAsLocal('January 15, 2025');
    // Standard Date parsing should work for this format
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});

describe('extractDatePortion', () => {
  it('extracts YYYY-MM-DD from a date-only string', () => {
    expect(extractDatePortion('2025-01-15')).toBe('2025-01-15');
  });

  it('extracts YYYY-MM-DD from an ISO datetime string', () => {
    expect(extractDatePortion('2025-01-15T00:00:00.000Z')).toBe('2025-01-15');
    expect(extractDatePortion('2025-01-15T14:30:00.000Z')).toBe('2025-01-15');
    expect(extractDatePortion('2025-01-15T23:59:59.999Z')).toBe('2025-01-15');
  });

  it('extracts YYYY-MM-DD from datetime without Z suffix', () => {
    expect(extractDatePortion('2025-06-30T12:00:00')).toBe('2025-06-30');
    expect(extractDatePortion('2025-12-25T00:00:00+05:30')).toBe('2025-12-25');
  });

  it('handles various valid date strings', () => {
    expect(extractDatePortion('2024-02-29')).toBe('2024-02-29'); // Leap day
    expect(extractDatePortion('2025-12-31')).toBe('2025-12-31'); // Year end
    expect(extractDatePortion('2026-01-01')).toBe('2026-01-01'); // Year start
  });

  it('returns correct date for edge case months', () => {
    expect(extractDatePortion('2025-01-01')).toBe('2025-01-01'); // January
    expect(extractDatePortion('2025-12-31')).toBe('2025-12-31'); // December
    expect(extractDatePortion('2025-02-28')).toBe('2025-02-28'); // February non-leap
  });
});

describe('formatDateInTimezone', () => {
  it('formats a date correctly in a specific timezone', () => {
    // formatDateInTimezone expects an ISO string
    const isoString = '2025-01-15T12:00:00.000Z';

    // Format in UTC - should be Jan 15
    const utcFormatted = formatDateInTimezone(isoString, 'UTC');
    expect(utcFormatted).toContain('Jan');
    expect(utcFormatted).toContain('15');
    expect(utcFormatted).toContain('2025');
  });

  it('uses consistent formatting pattern', () => {
    const isoString = '2025-06-20T10:00:00.000Z';
    const formatted = formatDateInTimezone(isoString, 'UTC');

    // Should follow "Jun 20, 2025" pattern (month day, year)
    expect(formatted).toMatch(/\w+\s+\d+,\s+\d{4}/);
  });
});

describe('formatTimeInTimezone', () => {
  it('formats time correctly in a specific timezone', () => {
    // formatTimeInTimezone expects an ISO string
    const isoString = '2025-01-15T14:30:00.000Z';

    // In UTC, should show 2:30 PM
    const utcTime = formatTimeInTimezone(isoString, 'UTC');
    expect(utcTime).toMatch(/2:30.*PM/i);
  });

  it('shows different times for different timezones', () => {
    const isoString = '2025-01-15T12:00:00.000Z';

    const utcTime = formatTimeInTimezone(isoString, 'UTC');
    const nyTime = formatTimeInTimezone(isoString, 'America/New_York');
    const laTime = formatTimeInTimezone(isoString, 'America/Los_Angeles');

    // All should be different (12:00 UTC, 7:00 AM EST, 4:00 AM PST)
    // Just verify they're not all the same
    expect(utcTime).not.toBe(nyTime);
    expect(nyTime).not.toBe(laTime);
  });
});

describe('formatDateTimeInTimezone', () => {
  it('combines date and time formatting', () => {
    // formatDateTimeInTimezone expects an ISO string, not a Date object
    const isoString = '2025-01-15T14:30:00.000Z';
    const formatted = formatDateTimeInTimezone(isoString, 'UTC');

    // Default 'medium' format: "Jan 15, 2:30 PM UTC" (no year in medium format)
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    expect(formatted).toMatch(/2:30.*PM/i);
    expect(formatted).toContain('UTC');
  });

  it('includes year in long format', () => {
    const isoString = '2025-01-15T14:30:00.000Z';
    const formatted = formatDateTimeInTimezone(isoString, 'UTC', null, { format: 'long' });

    // Long format includes year
    expect(formatted).toContain('2025');
    expect(formatted).toContain('Jan');
  });
});

describe('UTC midnight timezone shift issue', () => {
  /**
   * This test demonstrates the core problem we're solving:
   *
   * When a date-only string like "2025-01-15" is parsed with new Date(),
   * JavaScript interprets it as midnight UTC. In timezones west of UTC,
   * this shifts to the previous calendar day.
   *
   * For example, in EST (UTC-5):
   * - "2025-01-15" parsed as new Date() = Jan 15 00:00 UTC = Jan 14 19:00 EST
   *
   * Our parseDateOnlyAsLocal function solves this by creating the date
   * at noon local time instead.
   */
  it('demonstrates the problem with naive Date parsing', () => {
    // This is the PROBLEMATIC approach
    const naiveDate = new Date('2025-01-15');

    // The date is at midnight UTC
    expect(naiveDate.getUTCHours()).toBe(0);
    expect(naiveDate.getUTCDate()).toBe(15);

    // But in local time (if we're west of UTC), it might be the previous day
    // We can't test this directly since it depends on the test runner's timezone,
    // but we can verify our solution doesn't have this problem
  });

  it('demonstrates that parseDateOnlyAsLocal avoids the problem', () => {
    const safeDate = parseDateOnlyAsLocal('2025-01-15');

    // The LOCAL date should always be Jan 15
    expect(safeDate.getDate()).toBe(15);
    expect(safeDate.getMonth()).toBe(0); // January
    expect(safeDate.getFullYear()).toBe(2025);

    // And it's at noon, so there's no edge-case time issues
    expect(safeDate.getHours()).toBe(12);
  });

  it('demonstrates that extractDatePortion avoids Date parsing entirely', () => {
    // Even if we have a UTC midnight timestamp that would shift days,
    // extractDatePortion just pulls out the string portion
    const isoString = '2025-01-15T00:00:00.000Z';
    const datePortion = extractDatePortion(isoString);

    // Always returns the date that's IN THE STRING
    expect(datePortion).toBe('2025-01-15');
  });
});

describe('journal entry date filtering scenario', () => {
  /**
   * This simulates the actual use case: a journal entry dated Jan 15
   * should appear on Jan 15 in the timeline, not Jan 14.
   */
  it('journal entry appears on correct day', () => {
    // Simulate what comes from the database
    const journalEntryDate = '2025-01-15'; // Date-only from Prisma

    // Parse using our safe function
    const parsedDate = parseDateOnlyAsLocal(journalEntryDate);

    // When we format this for display/grouping, it should be Jan 15
    const dateKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
    expect(dateKey).toBe('2025-01-15');
  });

  it('journal entry matches correct lodging day', () => {
    // Lodging check-in: Jan 14
    // Lodging check-out: Jan 17
    // Journal entry: Jan 15

    const journalDate = extractDatePortion('2025-01-15');

    // When viewing lodging on Jan 14, the Jan 15 journal should NOT appear
    expect(journalDate).not.toBe('2025-01-14');

    // When viewing lodging on Jan 15, the Jan 15 journal SHOULD appear
    expect(journalDate).toBe('2025-01-15');

    // When viewing lodging on Jan 16, the Jan 15 journal should NOT appear
    expect(journalDate).not.toBe('2025-01-16');
  });
});
