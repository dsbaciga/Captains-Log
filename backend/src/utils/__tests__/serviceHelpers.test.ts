// Mock @prisma/client BEFORE any imports that depend on it
// This mock must be hoisted by Jest, so the factory cannot reference external variables
jest.mock('@prisma/client', () => {
  // Define MockDecimal inside the factory so it's available at hoist time
  class MockDecimal {
    private value: string;

    constructor(value: string | number) {
      this.value = String(value);
    }

    toString(): string {
      return this.value;
    }

    toNumber(): number {
      return parseFloat(this.value);
    }

    valueOf(): number {
      return this.toNumber();
    }
  }

  return {
    Prisma: {
      Decimal: MockDecimal,
    },
  };
});

// Mock the database config to avoid actual DB connections
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {},
}));

import {
  buildUpdateData,
  buildConditionalUpdateData,
  tripDateTransformer,
  convertDecimals,
  verifyEntityAccess,
} from '../serviceHelpers';

// Use require to get the mocked Prisma (bypasses TypeScript's import type checking)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Prisma } = require('@prisma/client');

describe('Service Helpers', () => {
  describe('buildUpdateData', () => {
    it('should include defined fields', () => {
      const data = {
        name: 'Test',
        description: 'Test description',
        count: 5,
      };

      const result = buildUpdateData(data);

      expect(result).toEqual(data);
    });

    it('should convert empty strings to null', () => {
      const data = {
        name: 'Test',
        description: '',
        notes: '',
      };

      const result = buildUpdateData(data);

      expect(result).toEqual({
        name: 'Test',
        description: null,
        notes: null,
      });
    });

    it('should exclude undefined fields', () => {
      const data = {
        name: 'Test',
        description: undefined,
        count: 5,
      };

      const result = buildUpdateData(data);

      expect(result).toEqual({
        name: 'Test',
        count: 5,
      });
      expect(result).not.toHaveProperty('description');
    });

    it('should preserve null values', () => {
      const data = {
        name: 'Test',
        description: null,
      };

      const result = buildUpdateData(data);

      expect(result).toEqual(data);
    });

    it('should preserve zero and false values', () => {
      const data = {
        count: 0,
        isActive: false,
        rating: 0,
      };

      const result = buildUpdateData(data);

      expect(result).toEqual(data);
    });
  });

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

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect((result.startDate as Date)?.toISOString()).toBe('2025-01-15T00:00:00.000Z');
      expect((result.endDate as Date)?.toISOString()).toBe('2025-01-20T00:00:00.000Z');
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

  describe('convertDecimals', () => {
    it('should convert Decimal objects to numbers', () => {
      const obj = {
        latitude: new Prisma.Decimal('40.7128'),
        longitude: new Prisma.Decimal('-74.0060'),
      };

      const result = convertDecimals(obj);

      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.006);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });

    it('should handle nested objects with Decimals', () => {
      const obj = {
        location: {
          latitude: new Prisma.Decimal('40.7128'),
          longitude: new Prisma.Decimal('-74.0060'),
        },
        name: 'New York',
      };

      const result = convertDecimals(obj);

      expect(result.location.latitude).toBe(40.7128);
      expect(result.location.longitude).toBe(-74.006);
      expect(result.name).toBe('New York');
    });

    it('should handle arrays with Decimals', () => {
      const arr = [
        { value: new Prisma.Decimal('10.5') },
        { value: new Prisma.Decimal('20.7') },
      ];

      const result = convertDecimals(arr);

      expect(result[0].value).toBe(10.5);
      expect(result[1].value).toBe(20.7);
    });

    it('should preserve Date objects', () => {
      const date = new Date('2025-01-15');
      const obj = {
        createdAt: date,
        value: new Prisma.Decimal('10.5'),
      };

      const result = convertDecimals(obj);

      expect(result.createdAt).toBe(date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle null and undefined', () => {
      expect(convertDecimals(null)).toBeNull();
      expect(convertDecimals(undefined)).toBeUndefined();
    });

    it('should handle primitive types', () => {
      expect(convertDecimals('string')).toBe('string');
      expect(convertDecimals(42)).toBe(42);
      expect(convertDecimals(true)).toBe(true);
    });
  });

  describe('verifyEntityAccess', () => {
    it('should return entity if access is granted', async () => {
      const entity = {
        id: 1,
        name: 'Test',
        trip: { userId: 5 },
      };

      const result = await verifyEntityAccess(entity, 5, 'Activity');

      expect(result).toBe(entity);
    });
  });
});
