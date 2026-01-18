import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  formatDateRange,
  getRelativeTime,
  formatTime,
  formatTripDates,
  getRelativeDateDescription,
  formatTripDatesWithRelative,
  getTripDateStatus,
  formatSingleDate,
  getTripDurationDays,
  formatTripDuration,
} from '../dateFormat';

describe('Date Format Utilities', () => {
  describe('formatDate', () => {
    it('should format date with medium style by default', () => {
      const result = formatDate('2024-03-15');
      expect(result).toBe('Mar 15, 2024');
    });

    it('should format date with short style', () => {
      const result = formatDate('2024-03-15', 'short');
      expect(result).toBe('3/15/24');
    });

    it('should format date with long style', () => {
      const result = formatDate('2024-03-15', 'long');
      expect(result).toBe('March 15, 2024');
    });

    it('should format date with full style', () => {
      const result = formatDate('2024-03-15', 'full');
      expect(result).toContain('2024');
      expect(result).toContain('March');
      expect(result).toContain('15');
    });

    it('should return fallback for null date', () => {
      const result = formatDate(null);
      expect(result).toBe('Not set');
    });

    it('should return custom fallback', () => {
      const result = formatDate(undefined, 'medium', 'TBD');
      expect(result).toBe('TBD');
    });

    it('should handle Date objects', () => {
      const date = new Date(2024, 2, 15); // March 15, 2024
      const result = formatDate(date);
      expect(result).toBe('Mar 15, 2024');
    });

    it('should handle datetime strings with time component', () => {
      const result = formatDate('2024-03-15T10:30:00');
      expect(result).toBe('Mar 15, 2024');
    });

    it('should return fallback for invalid date string', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Not set');
    });
  });

  describe('formatDateRange', () => {
    it('should format date range with same year', () => {
      const result = formatDateRange('2024-03-15', '2024-03-20');
      expect(result).toBe('Mar 15 - Mar 20, 2024');
    });

    it('should format date range with different years', () => {
      const result = formatDateRange('2024-12-30', '2025-01-05');
      expect(result).toBe('Dec 30, 2024 - Jan 5, 2025');
    });

    it('should handle missing start date', () => {
      const result = formatDateRange(null, '2024-03-20');
      expect(result).toBe('TBD - Mar 20, 2024');
    });

    it('should handle missing end date', () => {
      const result = formatDateRange('2024-03-15', null);
      expect(result).toBe('Mar 15, 2024 - TBD');
    });

    it('should handle both dates missing', () => {
      const result = formatDateRange(null, null);
      expect(result).toBe('Dates not set');
    });

    it('should work with Date objects', () => {
      const start = new Date(2024, 2, 15);
      const end = new Date(2024, 2, 20);
      const result = formatDateRange(start, end);
      expect(result).toBe('Mar 15 - Mar 20, 2024');
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      // Mock current date to Jan 15, 2024
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 15));
    });

    it('should return "Today" for current date', () => {
      const result = getRelativeTime('2024-01-15');
      expect(result).toBe('Today');
    });

    it('should return "Tomorrow" for next day', () => {
      const result = getRelativeTime('2024-01-16');
      expect(result).toBe('Tomorrow');
    });

    it('should return "Yesterday" for previous day', () => {
      const result = getRelativeTime('2024-01-14');
      expect(result).toBe('Yesterday');
    });

    it('should return "In X days" for future dates within a week', () => {
      const result = getRelativeTime('2024-01-18');
      expect(result).toBe('In 3 days');
    });

    it('should return "X days ago" for past dates within a week', () => {
      const result = getRelativeTime('2024-01-12');
      expect(result).toBe('3 days ago');
    });

    it('should return formatted date for dates beyond a month', () => {
      const result = getRelativeTime('2024-03-15');
      expect(result).toBe('Mar 15, 2024');
    });

    it('should return empty string for null', () => {
      const result = getRelativeTime(null);
      expect(result).toBe('');
    });

    it('should handle Date objects', () => {
      const tomorrow = new Date(2024, 0, 16);
      const result = getRelativeTime(tomorrow);
      expect(result).toBe('Tomorrow');
    });
  });

  describe('formatTime', () => {
    it('should format time in 12-hour format by default', () => {
      const result = formatTime('2024-01-15T14:30:00');
      expect(result).toMatch(/2:30/);
      expect(result).toMatch(/PM/);
    });

    it('should format time in 24-hour format when specified', () => {
      const result = formatTime('2024-01-15T14:30:00', true);
      expect(result).toContain('14:30');
    });

    it('should return empty string for null', () => {
      const result = formatTime(null);
      expect(result).toBe('');
    });

    it('should handle midnight correctly', () => {
      const result = formatTime('2024-01-15T00:00:00');
      expect(result).toMatch(/12:00/);
      expect(result).toMatch(/AM/);
    });

    it('should handle noon correctly', () => {
      const result = formatTime('2024-01-15T12:00:00');
      expect(result).toMatch(/12:00/);
      expect(result).toMatch(/PM/);
    });
  });

  describe('formatTripDates (Natural Language)', () => {
    it('should format dates in same month as "Mar 15-22, 2024"', () => {
      const result = formatTripDates('2024-03-15', '2024-03-22');
      expect(result).toBe('Mar 15-22, 2024');
    });

    it('should format dates in different months same year as "Mar 28 - Apr 5, 2024"', () => {
      const result = formatTripDates('2024-03-28', '2024-04-05');
      expect(result).toBe('Mar 28 - Apr 5, 2024');
    });

    it('should format dates in different years as "Dec 30, 2024 - Jan 5, 2025"', () => {
      const result = formatTripDates('2024-12-30', '2025-01-05');
      expect(result).toBe('Dec 30, 2024 - Jan 5, 2025');
    });

    it('should format single day trip as "Mar 15, 2024"', () => {
      const result = formatTripDates('2024-03-15', '2024-03-15');
      expect(result).toBe('Mar 15, 2024');
    });

    it('should handle missing both dates', () => {
      const result = formatTripDates(null, null);
      expect(result).toBe('Dates not set');
    });

    it('should handle missing start date', () => {
      const result = formatTripDates(null, '2024-03-22');
      expect(result).toContain('Ends');
    });

    it('should handle missing end date', () => {
      const result = formatTripDates('2024-03-15', null);
      expect(result).toContain('Starts');
    });

    it('should handle Date objects', () => {
      const start = new Date(2024, 2, 15); // March 15, 2024
      const end = new Date(2024, 2, 22); // March 22, 2024
      const result = formatTripDates(start, end);
      expect(result).toBe('Mar 15-22, 2024');
    });
  });

  describe('getRelativeDateDescription (Extended Range)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 15)); // Jan 15, 2024
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Today" for current date', () => {
      const result = getRelativeDateDescription('2024-01-15');
      expect(result).toBe('Today');
    });

    it('should return "Tomorrow" for next day', () => {
      const result = getRelativeDateDescription('2024-01-16');
      expect(result).toBe('Tomorrow');
    });

    it('should return "Yesterday" for previous day', () => {
      const result = getRelativeDateDescription('2024-01-14');
      expect(result).toBe('Yesterday');
    });

    it('should return "In X days" for future dates within a week', () => {
      const result = getRelativeDateDescription('2024-01-20');
      expect(result).toBe('In 5 days');
    });

    it('should return "X days ago" for past dates within a week', () => {
      const result = getRelativeDateDescription('2024-01-10');
      expect(result).toBe('5 days ago');
    });

    it('should return "In X weeks" for future dates 8-30 days', () => {
      const result = getRelativeDateDescription('2024-01-29'); // 14 days = 2 weeks
      expect(result).toBe('In 2 weeks');
    });

    it('should return "X weeks ago" for past dates 8-30 days', () => {
      const result = getRelativeDateDescription('2024-01-01'); // 14 days ago
      expect(result).toBe('2 weeks ago');
    });

    it('should return "In X months" for future dates 31-365 days', () => {
      const result = getRelativeDateDescription('2024-03-15'); // ~60 days = 2 months
      expect(result).toBe('In 2 months');
    });

    it('should return "X months ago" for past dates 31-365 days', () => {
      const result = getRelativeDateDescription('2023-11-15'); // ~60 days ago = 2 months
      expect(result).toBe('2 months ago');
    });

    it('should return formatted date for dates beyond a year', () => {
      const result = getRelativeDateDescription('2025-03-15');
      expect(result).toContain('2025');
    });

    it('should return empty string for null', () => {
      const result = getRelativeDateDescription(null);
      expect(result).toBe('');
    });
  });

  describe('getTripDateStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 15)); // Jan 15, 2024
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Starts tomorrow" for trip starting next day', () => {
      const result = getTripDateStatus('2024-01-16', '2024-01-20');
      expect(result).toBe('Starts tomorrow');
    });

    it('should return "Starts in X days" for future trips', () => {
      const result = getTripDateStatus('2024-01-20', '2024-01-25');
      expect(result).toBe('Starts in 5 days');
    });

    it('should return "Starts today" for trip starting today', () => {
      const result = getTripDateStatus('2024-01-15', '2024-01-20');
      expect(result).toBe('Starts today');
    });

    it('should return "In progress" for ongoing trip', () => {
      const result = getTripDateStatus('2024-01-10', '2024-01-20');
      expect(result).toBe('In progress');
    });

    it('should return "Ends today" for trip ending today', () => {
      const result = getTripDateStatus('2024-01-10', '2024-01-15');
      expect(result).toBe('Ends today');
    });

    it('should return "Ended yesterday" for trip that ended yesterday', () => {
      const result = getTripDateStatus('2024-01-10', '2024-01-14');
      expect(result).toBe('Ended yesterday');
    });

    it('should return "Ended X days ago" for recently ended trips', () => {
      const result = getTripDateStatus('2024-01-05', '2024-01-10');
      expect(result).toBe('Ended 5 days ago');
    });

    it('should return null for trips without start date', () => {
      const result = getTripDateStatus(null, '2024-01-20');
      expect(result).toBeNull();
    });

    it('should return null for trips ended long ago', () => {
      // Beyond the relative time range, should return null
      const result = getTripDateStatus('2022-01-01', '2022-01-10');
      expect(result).toBeNull();
    });
  });

  describe('formatSingleDate', () => {
    it('should format date with weekday', () => {
      const result = formatSingleDate('2024-03-15');
      expect(result).toContain('Friday');
      expect(result).toContain('Mar');
      expect(result).toContain('15');
    });

    it('should return "Not set" for null', () => {
      const result = formatSingleDate(null);
      expect(result).toBe('Not set');
    });
  });

  describe('getTripDurationDays', () => {
    it('should return 1 for single day trip', () => {
      const result = getTripDurationDays('2024-03-15', '2024-03-15');
      expect(result).toBe(1);
    });

    it('should return 8 for week-long trip (inclusive)', () => {
      const result = getTripDurationDays('2024-03-15', '2024-03-22');
      expect(result).toBe(8);
    });

    it('should return null for missing dates', () => {
      expect(getTripDurationDays(null, '2024-03-22')).toBeNull();
      expect(getTripDurationDays('2024-03-15', null)).toBeNull();
      expect(getTripDurationDays(null, null)).toBeNull();
    });
  });

  describe('formatTripDuration', () => {
    it('should return "1 day" for single day trip', () => {
      const result = formatTripDuration('2024-03-15', '2024-03-15');
      expect(result).toBe('1 day');
    });

    it('should return "X days" for short trips', () => {
      const result = formatTripDuration('2024-03-15', '2024-03-20');
      expect(result).toBe('6 days');
    });

    it('should return "X weeks" for longer trips', () => {
      const result = formatTripDuration('2024-03-01', '2024-03-21'); // 21 days
      expect(result).toBe('3 weeks');
    });

    it('should return empty string for missing dates', () => {
      const result = formatTripDuration(null, null);
      expect(result).toBe('');
    });
  });

  describe('formatTripDatesWithRelative', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 15)); // Jan 15, 2024
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should combine relative and absolute dates', () => {
      const result = formatTripDatesWithRelative('2024-01-29', '2024-02-05');
      expect(result).toContain('In 2 weeks');
      expect(result).toContain('Jan 29 - Feb 5, 2024');
    });

    it('should return absolute only for old dates', () => {
      const result = formatTripDatesWithRelative('2022-03-15', '2022-03-22');
      // Should just be absolute date since it's too far in the past
      expect(result).not.toContain('ago');
    });

    it('should handle showAbsoluteOnly option', () => {
      const result = formatTripDatesWithRelative('2024-01-20', '2024-01-25', {
        showAbsoluteOnly: true,
      });
      expect(result).not.toContain('In');
      expect(result).toBe('Jan 20-25, 2024');
    });
  });
});
