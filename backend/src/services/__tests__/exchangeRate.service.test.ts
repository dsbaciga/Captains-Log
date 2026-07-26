/**
 * Exchange Rate Service Tests
 *
 * Test cases:
 * - FX-001: getRate returns 1 for an identical currency pair without a network call
 * - FX-002: getRate fetches a historical rate and caches it in the database
 * - FX-003: getRate serves a cached rate without touching the network
 * - FX-004: getRate uses the "latest" endpoint when no date is supplied
 * - FX-005: getRate clamps a future date to the latest rate
 * - FX-006: getRate returns null (never throws) when the provider fails
 * - FX-007: getRate does not re-request a pair that just failed (negative cache)
 * - FX-008: getRate rejects malformed provider responses
 * - FX-009: getRate rejects unusable rate values (missing / non-positive)
 * - FX-010: getRate normalises casing and rejects non-currency codes
 * - FX-011: convert produces exchangeRate + baseAmount with decimal precision
 * - FX-012: convert treats a missing source currency as already-in-target
 * - FX-013: convert returns null when no rate is available (no fabricated 1:1)
 * - FX-014: A cache write failure does not fail the conversion
 * - FX-015: precision is 'exact' with a date and 'estimated' without one
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the database config
const mockPrisma = {
  exchangeRate: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock axios — no test may reach the network
jest.mock('axios');
import axios from 'axios';
const mockAxios = axios as jest.Mocked<typeof axios>;

import { Prisma } from '@prisma/client';
import exchangeRateService, {
  isCurrencyCode,
  normalizeCurrency,
} from '../exchangeRate.service';

/** Builds a Frankfurter-shaped success response. */
function frankfurterResponse(base: string, quote: string, rate: number, date = '2026-03-10') {
  return { data: { amount: 1.0, base, date, rates: { [quote]: rate } } };
}

describe('ExchangeRateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    exchangeRateService.clearFailureCache();
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    mockPrisma.exchangeRate.upsert.mockResolvedValue({});
    // Silence the service's intentional warn-and-degrade logging.
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  // ============================================================
  // FX-001: Identical currency pair
  // ============================================================
  describe('FX-001: identical currency pair', () => {
    it('should return a rate of 1 without calling the provider', async () => {
      const result = await exchangeRateService.getRate('USD', 'USD', new Date('2026-03-10'));

      expect(result).not.toBeNull();
      expect(result?.rate.toNumber()).toBe(1);
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(mockPrisma.exchangeRate.findUnique).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FX-002: Historical fetch + cache write
  // ============================================================
  describe('FX-002: fetch and cache a historical rate', () => {
    it('should request the record date and persist the result', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.1426));

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result?.rate.toNumber()).toBeCloseTo(1.1426, 6);
      expect(mockAxios.get).toHaveBeenCalledTimes(1);

      const [url, options] = mockAxios.get.mock.calls[0];
      expect(url).toContain('/2026-03-10');
      expect(options).toMatchObject({ params: { base: 'EUR', symbols: 'USD' } });

      expect(mockPrisma.exchangeRate.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // FX-003: Cache hit
  // ============================================================
  describe('FX-003: cached rate', () => {
    it('should serve from the database without calling the provider', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue({
        id: 1,
        date: new Date('2026-03-10T00:00:00.000Z'),
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: new Prisma.Decimal('1.1426'),
        source: 'frankfurter',
      });

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result?.rate.toNumber()).toBeCloseTo(1.1426, 6);
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(mockPrisma.exchangeRate.upsert).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FX-004: No date supplied
  // ============================================================
  describe('FX-004: no date supplied', () => {
    it('should use the provider "latest" endpoint', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('GBP', 'USD', 1.27));

      const result = await exchangeRateService.getRate('GBP', 'USD', null);

      expect(result?.rate.toNumber()).toBeCloseTo(1.27, 6);
      expect(mockAxios.get.mock.calls[0][0]).toContain('/latest');
    });
  });

  // ============================================================
  // FX-005: Future date
  // ============================================================
  describe('FX-005: future date', () => {
    it('should clamp to the latest rate rather than requesting the future', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.14));

      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const result = await exchangeRateService.getRate('EUR', 'USD', future);

      expect(result?.precision).toBe('estimated');
      expect(mockAxios.get.mock.calls[0][0]).toContain('/latest');
    });
  });

  // ============================================================
  // FX-006: Provider failure degrades to null
  // ============================================================
  describe('FX-006: provider failure', () => {
    it('should return null instead of throwing', async () => {
      mockAxios.get.mockRejectedValue(new Error('ECONNRESET'));

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result).toBeNull();
      expect(mockPrisma.exchangeRate.upsert).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FX-007: Negative cache
  // ============================================================
  describe('FX-007: negative cache', () => {
    it('should not re-request a pair whose lookup just failed', async () => {
      mockAxios.get.mockRejectedValue(new Error('503 Service Unavailable'));

      const first = await exchangeRateService.getRate('EUR', 'JPY', new Date('2026-03-10'));
      const second = await exchangeRateService.getRate('EUR', 'JPY', new Date('2026-03-10'));

      expect(first).toBeNull();
      expect(second).toBeNull();
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should retry once the failure cache is cleared', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('503 Service Unavailable'));
      mockAxios.get.mockResolvedValueOnce(frankfurterResponse('EUR', 'JPY', 185.54));

      expect(await exchangeRateService.getRate('EUR', 'JPY', new Date('2026-03-10'))).toBeNull();
      exchangeRateService.clearFailureCache();

      const retried = await exchangeRateService.getRate('EUR', 'JPY', new Date('2026-03-10'));
      expect(retried?.rate.toNumber()).toBeCloseTo(185.54, 4);
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // FX-008: Malformed response
  // ============================================================
  describe('FX-008: malformed provider response', () => {
    it('should return null when the payload does not match the expected shape', async () => {
      mockAxios.get.mockResolvedValue({ data: { unexpected: true } });

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result).toBeNull();
      expect(mockPrisma.exchangeRate.upsert).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FX-009: Unusable rate values
  // ============================================================
  describe('FX-009: unusable rate values', () => {
    it('should return null when the requested symbol is absent', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'GBP', 0.84));

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result).toBeNull();
    });

    it('should return null for a non-positive rate', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 0));

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // FX-010: Currency code handling
  // ============================================================
  describe('FX-010: currency code handling', () => {
    it('should accept and normalise lower-case codes', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.14));

      const result = await exchangeRateService.getRate(' eur ', 'usd', new Date('2026-03-10'));

      expect(result).not.toBeNull();
      expect(mockAxios.get.mock.calls[0][1]).toMatchObject({
        params: { base: 'EUR', symbols: 'USD' },
      });
    });

    it('should reject values that are not three-letter codes', async () => {
      expect(await exchangeRateService.getRate('EURO', 'USD', null)).toBeNull();
      expect(await exchangeRateService.getRate('EUR', '', null)).toBeNull();
      expect(await exchangeRateService.getRate(null, 'USD', null)).toBeNull();
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should expose matching guard helpers', () => {
      expect(isCurrencyCode('USD')).toBe(true);
      expect(isCurrencyCode('usd')).toBe(false);
      expect(isCurrencyCode(123)).toBe(false);
      expect(normalizeCurrency(' eur ')).toBe('EUR');
      expect(normalizeCurrency('EURO')).toBeNull();
      expect(normalizeCurrency(null)).toBeNull();
    });
  });

  // ============================================================
  // FX-011: convert precision
  // ============================================================
  describe('FX-011: convert', () => {
    it('should return the rate and the converted amount rounded to cents', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.1426));

      const result = await exchangeRateService.convert(
        500,
        'EUR',
        'USD',
        new Date('2026-03-10')
      );

      expect(result).not.toBeNull();
      expect(result?.baseCurrency).toBe('USD');
      // 500 * 1.1426 = 571.30 exactly — no float drift permitted.
      expect(result?.baseAmount.toString()).toBe('571.3');
      expect(result?.exchangeRate.toNumber()).toBeCloseTo(1.1426, 6);
    });

    it('should keep decimal precision on values a float would mangle', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.1));

      const result = await exchangeRateService.convert(
        new Prisma.Decimal('0.3'),
        'EUR',
        'USD',
        new Date('2026-03-10')
      );

      // 0.3 * 1.1 is 0.33000000000000004 in IEEE-754 doubles.
      expect(result?.baseAmount.toString()).toBe('0.33');
    });
  });

  // ============================================================
  // FX-012: Missing source currency
  // ============================================================
  describe('FX-012: missing source currency', () => {
    it('should treat a null currency as already being in the target currency', async () => {
      const result = await exchangeRateService.convert(250, null, 'USD', new Date('2026-03-10'));

      expect(result?.baseAmount.toNumber()).toBe(250);
      expect(result?.exchangeRate.toNumber()).toBe(1);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FX-013: No rate available
  // ============================================================
  describe('FX-013: no rate available', () => {
    it('should return null rather than fabricating a 1:1 rate', async () => {
      mockAxios.get.mockRejectedValue(new Error('timeout'));

      const result = await exchangeRateService.convert(
        500,
        'JPY',
        'USD',
        new Date('2026-03-10')
      );

      expect(result).toBeNull();
    });

    it('should return null when the target currency is invalid', async () => {
      const result = await exchangeRateService.convert(500, 'EUR', null, null);

      expect(result).toBeNull();
      expect(mockAxios.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FX-014: Cache write failure
  // ============================================================
  describe('FX-014: cache write failure', () => {
    it('should still return the fetched rate', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.1426));
      mockPrisma.exchangeRate.upsert.mockRejectedValue(new Error('db down'));

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result?.rate.toNumber()).toBeCloseTo(1.1426, 6);
    });

    it('should survive a cache read failure by falling back to the provider', async () => {
      mockPrisma.exchangeRate.findUnique.mockRejectedValue(new Error('db down'));
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.1426));

      const result = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));

      expect(result?.rate.toNumber()).toBeCloseTo(1.1426, 6);
    });
  });

  // ============================================================
  // FX-015: Precision flag
  // ============================================================
  describe('FX-015: precision flag', () => {
    it('should be exact for a dated lookup and estimated for an undated one', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.1426));

      const dated = await exchangeRateService.getRate('EUR', 'USD', new Date('2026-03-10'));
      expect(dated?.precision).toBe('exact');

      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      const undated = await exchangeRateService.getRate('EUR', 'USD', null);
      expect(undated?.precision).toBe('estimated');
    });

    it('should be estimated for a date before the provider has data', async () => {
      mockAxios.get.mockResolvedValue(frankfurterResponse('EUR', 'USD', 1.1426));

      const ancient = await exchangeRateService.getRate('EUR', 'USD', new Date('1970-01-01'));

      expect(ancient?.precision).toBe('estimated');
      expect(mockAxios.get.mock.calls[0][0]).toContain('/latest');
    });
  });
});
