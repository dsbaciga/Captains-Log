import { buildConditionalUpdateData, tripDateTransformer } from '../prismaUpdateData';

describe('prismaUpdateData', () => {
  describe('buildConditionalUpdateData', () => {
    it('should apply custom transformers', () => {
      const data = {
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const result = buildConditionalUpdateData(data, {
        transformers: {
          startDate: tripDateTransformer,
          endDate: tripDateTransformer,
        },
      });

      // Comparing the Date values directly needs no cast, and asserts more than
      // the ISO string did: toEqual checks the instance type and the instant.
      expect(result.startDate).toEqual(new Date('2025-01-15T00:00:00.000Z'));
      expect(result.endDate).toEqual(new Date('2025-01-20T00:00:00.000Z'));
    });

    it('should convert empty strings to null by default', () => {
      const data = {
        name: 'Test',
        description: '',
      };

      const result = buildConditionalUpdateData(data);

      expect(result).toEqual({
        name: 'Test',
        description: null,
      });
    });

    it('should preserve empty strings if option disabled', () => {
      const data = {
        name: 'Test',
        description: '',
      };

      const result = buildConditionalUpdateData(data, {
        emptyStringToNull: false,
      });

      expect(result).toEqual(data);
    });

    it('should apply transformer to null values', () => {
      const data = {
        startDate: null,
      };

      const result = buildConditionalUpdateData(data, {
        transformers: {
          startDate: tripDateTransformer,
        },
      });

      expect(result.startDate).toBeNull();
    });

    it('should exclude undefined fields', () => {
      const data = {
        name: 'Test',
        description: undefined,
      };

      const result = buildConditionalUpdateData(data);

      expect(result).toEqual({ name: 'Test' });
      expect(result).not.toHaveProperty('description');
    });
  });

  describe('tripDateTransformer', () => {
    it('should convert date string to UTC Date', () => {
      const dateStr = '2025-01-15';
      const result = tripDateTransformer(dateStr);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2025-01-15T00:00:00.000Z');
    });

    it('should return null for null input', () => {
      const result = tripDateTransformer(null);

      expect(result).toBeNull();
    });

    it('should handle different date formats', () => {
      const result1 = tripDateTransformer('2025-12-31');
      const result2 = tripDateTransformer('2025-01-01');

      expect(result1?.toISOString()).toBe('2025-12-31T00:00:00.000Z');
      expect(result2?.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });
  });
});
