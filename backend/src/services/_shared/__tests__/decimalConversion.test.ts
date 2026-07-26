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

import { convertDecimals } from '../decimalConversion';
// jest.mock above is hoisted, so this resolves to the mocked module — no need
// for require() and its lint suppression.
import { Prisma } from '@prisma/client';

describe('decimalConversion', () => {
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
});
