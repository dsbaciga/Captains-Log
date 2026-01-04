import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatDate,
  formatDateRange,
  getRelativeTime,
  formatTime,
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
});
