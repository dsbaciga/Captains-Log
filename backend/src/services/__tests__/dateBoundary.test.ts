/**
 * Day-boundary determinism tests
 *
 * The "today" computed by travelDocument.service and trip.service must depend
 * only on the instant, never on the server process's timezone. Dates are stored
 * as UTC midnight (tripDateTransformer), so these code paths were converted from
 * setHours() to setUTCHours().
 *
 * The existing suites for this behaviour read the real system clock in whatever
 * timezone the runner happens to use, so they can never construct the case where
 * local and UTC dates diverge. Here the clock is pinned with
 * jest.setSystemTime() at instants where they DO diverge, and the process
 * timezone is simulated at the Date level.
 *
 * Why the Date-level simulation: `process.env.TZ` cannot be changed from inside
 * a Jest test. Jest runs each test file in a V8 vm context, and the timezone
 * cache reset that Node performs when TZ is assigned does not reach that
 * context — assigning it is a silent no-op (asserted below, so this file notices
 * if that ever changes). Instead, `withSimulatedTimezone` swaps in a Date
 * subclass whose LOCAL accessors — the getHours/setHours family, i.e. exactly
 * what the old buggy code used — operate at a chosen fixed UTC offset, while the
 * UTC accessor family and getTime() keep their real UTC meaning. Code that uses
 * setUTCHours is unaffected by the offset; code that uses setHours is not.
 *
 * Real timers and the real Date are restored in teardown.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@prisma/client', () => {
  class MockDecimal {
    private value: string;
    constructor(value: string | number) {
      this.value = String(value);
    }
    toString(): string { return this.value; }
    toNumber(): number { return parseFloat(this.value); }
    valueOf(): number { return this.toNumber(); }
  }
  return {
    Prisma: {
      Decimal: MockDecimal,
      DbNull: { __prismaSentinel: 'DbNull' },
      JsonNull: { __prismaSentinel: 'JsonNull' },
    },
  };
});

jest.mock('../companion.service', () => ({
  companionService: { getMyselfCompanion: jest.fn() },
}));

const mockPrisma = {
  travelDocument: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  trip: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import travelDocumentService from '../travelDocument.service';
import { TripService } from '../trip.service';
import { TripStatus } from '../../types/trip.types';

// ---------------------------------------------------------------------------
// Instants
// ---------------------------------------------------------------------------

/**
 * Late in the UTC day: every positive-offset timezone is already on the NEXT
 * calendar day locally, and — because "today" and the stored UTC-midnight dates
 * shift by different amounts — a setHours() implementation gives a DIFFERENT
 * answer here for every non-zero offset, in both directions.
 */
const LATE_UTC_EVENING = '2026-03-15T23:30:00Z';
/**
 * Early in the UTC day: every negative-offset timezone is still on the PREVIOUS
 * calendar day locally.
 */
const EARLY_UTC_MORNING = '2026-03-15T00:30:00Z';

const INSTANTS = [
  ['late UTC evening', LATE_UTC_EVENING],
  ['early UTC morning', EARLY_UTC_MORNING],
] as const;

/** Simulated process timezones, as minutes of local-minus-UTC offset. */
const OFFSETS: Array<[string, number]> = [
  ['UTC (+00:00)', 0],
  ['America/Los_Angeles (-07:00)', -7 * 60],
  ['America/Sao_Paulo (-03:00)', -3 * 60],
  ['Asia/Kathmandu (+05:45)', 5 * 60 + 45],
  ['Asia/Tokyo (+09:00)', 9 * 60],
  ['Pacific/Kiritimati (+14:00)', 14 * 60],
];

/** UTC date part of both pinned instants. */
const UTC_TODAY = '2026-03-15';

// ---------------------------------------------------------------------------
// Timezone simulation
// ---------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;

/**
 * The pristine Date, captured before any fake timers are installed.
 *
 * The subclass below MUST extend this rather than the fake-timers Date: the
 * fake-timers constructor returns a fresh native Date instead of `this`, which
 * silently discards any subclass prototype. The pinned "now" is threaded in via
 * the `nowFn` parameter instead.
 */
const RealDate: DateConstructor = global.Date;

/**
 * Build a Date subclass whose LOCAL accessors behave as if the process were in
 * a timezone `offsetMinutes` from UTC. UTC accessors and getTime() are untouched.
 * `nowFn` supplies the (pinned) current time for the zero-argument constructor.
 */
function makeOffsetDateClass(
  nowFn: () => number,
  offsetMinutes: number
): DateConstructor {
  const shift = offsetMinutes * MINUTE_MS;

  class OffsetDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor>) {
      if (args.length === 0) {
        super(nowFn());
      } else {
        super(...args);
      }
    }

    static now(): number {
      return nowFn();
    }

    /** This instant as a plain Date whose UTC fields read as the local fields. */
    private asLocal(): Date {
      return new RealDate(this.getTime() + shift);
    }

    getTimezoneOffset(): number { return -offsetMinutes; }

    getFullYear(): number { return this.asLocal().getUTCFullYear(); }
    getMonth(): number { return this.asLocal().getUTCMonth(); }
    getDate(): number { return this.asLocal().getUTCDate(); }
    getDay(): number { return this.asLocal().getUTCDay(); }
    getHours(): number { return this.asLocal().getUTCHours(); }
    getMinutes(): number { return this.asLocal().getUTCMinutes(); }
    getSeconds(): number { return this.asLocal().getUTCSeconds(); }
    getMilliseconds(): number { return this.asLocal().getUTCMilliseconds(); }

    setHours(h: number, m?: number, s?: number, ms?: number): number {
      const local = this.asLocal();
      local.setUTCHours(
        h,
        m ?? local.getUTCMinutes(),
        s ?? local.getUTCSeconds(),
        ms ?? local.getUTCMilliseconds()
      );
      return this.setTime(local.getTime() - shift);
    }

    setDate(d: number): number {
      const local = this.asLocal();
      local.setUTCDate(d);
      return this.setTime(local.getTime() - shift);
    }

    setMonth(mo: number, d?: number): number {
      const local = this.asLocal();
      local.setUTCMonth(mo, d ?? local.getUTCDate());
      return this.setTime(local.getTime() - shift);
    }

    setFullYear(y: number, mo?: number, d?: number): number {
      const local = this.asLocal();
      local.setUTCFullYear(y, mo ?? local.getUTCMonth(), d ?? local.getUTCDate());
      return this.setTime(local.getTime() - shift);
    }
  }

  return OffsetDate;
}

let restoreDate: (() => void) | null = null;

function pinClock(instant: string): void {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(instant));
}

function installOffsetDate(offsetMinutes: number): void {
  const current = global.Date;
  // `current.now` is the fake-timers clock while the clock is pinned.
  const nowFn = () => current.now();
  global.Date = makeOffsetDateClass(nowFn, offsetMinutes);
  restoreDate = () => {
    global.Date = current;
    restoreDate = null;
  };
}

function releaseClock(): void {
  if (restoreDate) restoreDate();
  jest.useRealTimers();
}

/** Run `fn` with the clock pinned at `instant` and the local timezone simulated. */
async function inTimezone<T>(
  offsetMinutes: number,
  instant: string,
  fn: () => Promise<T> | T
): Promise<T> {
  pinClock(instant);
  installOffsetDate(offsetMinutes);
  try {
    return await fn();
  } finally {
    releaseClock();
  }
}

/** Build a UTC-midnight Date the way tripDateTransformer stores dates. */
const utcDate = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(
    async (callback: unknown) => (callback as (tx: unknown) => Promise<unknown>)(mockPrisma)
  );
});

afterEach(() => {
  releaseClock();
});

// ===========================================================================
// Harness sanity — the matrix must not be vacuous
// ===========================================================================

describe('day-boundary harness', () => {
  it('pins the clock, so "now" is the chosen instant', async () => {
    for (const [, offset] of OFFSETS) {
      const now = await inTimezone(offset, LATE_UTC_EVENING, () => new Date().toISOString());
      expect(now).toBe('2026-03-15T23:30:00.000Z');
    }
  });

  it('the simulated timezone really moves the LOCAL calendar day', async () => {
    const localDay = (offset: number, instant: string) =>
      inTimezone(offset, instant, () => new Date().getDate());

    // 23:30Z: UTC is the 15th, positive offsets are already on the 16th.
    expect(await localDay(0, LATE_UTC_EVENING)).toBe(15);
    expect(await localDay(9 * 60, LATE_UTC_EVENING)).toBe(16);
    expect(await localDay(14 * 60, LATE_UTC_EVENING)).toBe(16);
    expect(await localDay(-7 * 60, LATE_UTC_EVENING)).toBe(15);

    // 00:30Z: UTC is the 15th, negative offsets are still on the 14th.
    expect(await localDay(0, EARLY_UTC_MORNING)).toBe(15);
    expect(await localDay(-7 * 60, EARLY_UTC_MORNING)).toBe(14);
    expect(await localDay(-3 * 60, EARLY_UTC_MORNING)).toBe(14);
    expect(await localDay(9 * 60, EARLY_UTC_MORNING)).toBe(15);
  });

  it('leaves UTC accessors alone while shifting local ones', async () => {
    await inTimezone(9 * 60, LATE_UTC_EVENING, () => {
      const d = new Date('2026-03-15T23:30:00Z');
      expect(d.getUTCDate()).toBe(15);
      expect(d.getUTCHours()).toBe(23);
      expect(d.getDate()).toBe(16);
      expect(d.getHours()).toBe(8);
      expect(d.getMinutes()).toBe(30);
      expect(d.getTimezoneOffset()).toBe(-540);
    });
  });

  it('setHours(0,0,0,0) lands on LOCAL midnight, setUTCHours on UTC midnight', async () => {
    await inTimezone(9 * 60, LATE_UTC_EVENING, () => {
      const local = new Date('2026-03-15T23:30:00Z');
      local.setHours(0, 0, 0, 0);
      // Local midnight of 2026-03-16 (+09:00) == 2026-03-15T15:00Z
      expect(local.toISOString()).toBe('2026-03-15T15:00:00.000Z');

      const utc = new Date('2026-03-15T23:30:00Z');
      utc.setUTCHours(0, 0, 0, 0);
      expect(utc.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    });
  });

  it('the two normalisations DISAGREE at the late-evening instant for every non-zero offset', async () => {
    // This is what gives the service assertions below their teeth: a regression
    // from setUTCHours back to setHours changes the answer here.
    const daysUntil = (useUtc: boolean, expiry: string) => {
      const today = new Date();
      const target = new Date(`${expiry}T00:00:00.000Z`);
      if (useUtc) {
        today.setUTCHours(0, 0, 0, 0);
        target.setUTCHours(0, 0, 0, 0);
      } else {
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
      }
      return Math.ceil((target.getTime() - today.getTime()) / 86400000);
    };

    for (const [label, offset] of OFFSETS) {
      const [utcDays, localDays] = await inTimezone(offset, LATE_UTC_EVENING, () => [
        daysUntil(true, UTC_TODAY),
        daysUntil(false, UTC_TODAY),
      ]);

      expect({ label, utcDays }).toEqual({ label, utcDays: 0 });
      expect({ label, agree: utcDays === localDays }).toEqual({ label, agree: offset === 0 });
    }
  });

  it('documents that process.env.TZ cannot be used for this inside Jest', async () => {
    // If this ever starts failing, Jest gained real TZ switching and the Date
    // shim above can be replaced with process.env.TZ assignment.
    const before = new Date('2026-03-15T23:30:00Z').getDate();
    const originalTz = process.env.TZ;
    process.env.TZ = originalTz === 'Asia/Tokyo' ? 'Pacific/Kiritimati' : 'Asia/Tokyo';
    const after = new Date('2026-03-15T23:30:00Z').getDate();
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }

    expect(after).toBe(before);
  });

  it('restores real timers and the real Date between tests', () => {
    expect(new Date().getFullYear()).toBeGreaterThanOrEqual(2025);
    expect(Object.getPrototypeOf(Date)).toBe(Function.prototype);
  });
});

// ===========================================================================
// travelDocument.service — calculateExpirationStatus / calculateDaysUntilExpiry
// ===========================================================================

describe('travelDocument.service — expiry day boundary', () => {
  const buildDoc = (expiry: string | null) => ({
    id: 1,
    userId: 7,
    type: 'PASSPORT',
    issuingCountry: 'US',
    documentNumber: '123456789',
    issueDate: utcDate('2020-01-01'),
    expiryDate: expiry ? utcDate(expiry) : null,
    name: 'Main Passport',
    notes: null,
    isPrimary: true,
    alertDaysBefore: 180,
    createdAt: utcDate('2020-01-01'),
    updatedAt: utcDate('2020-01-01'),
  });

  const CASES: Array<[string, number, string]> = [
    // expiryDate, expected daysUntilExpiry, expected expirationStatus
    ['2026-03-13', -2, 'expired'],
    ['2026-03-14', -1, 'expired'],
    [UTC_TODAY, 0, 'expired'],
    ['2026-03-16', 1, 'critical'],
    ['2026-04-14', 30, 'critical'],
    ['2026-04-15', 31, 'warning'],
    ['2026-06-13', 90, 'warning'],
    ['2026-06-14', 91, 'caution'],
    ['2026-09-11', 180, 'caution'],
    ['2026-09-12', 181, 'valid'],
  ];

  for (const [instantName, instant] of INSTANTS) {
    describe(`at ${instantName} (${instant})`, () => {
      it.each(CASES)(
        'expiry %s => %i days / %s in every timezone',
        async (expiry, expectedDays, expectedStatus) => {
          for (const [label, offset] of OFFSETS) {
            mockPrisma.travelDocument.findFirst.mockResolvedValue(buildDoc(expiry));
            const doc = await inTimezone(offset, instant, () =>
              travelDocumentService.getById(7, 1)
            );

            expect({
              label,
              days: doc.daysUntilExpiry,
              status: doc.expirationStatus,
            }).toEqual({ label, days: expectedDays, status: expectedStatus });
          }
        }
      );
    });
  }

  it('produces identical responses across all timezones for a whole document set', async () => {
    const docs = [
      buildDoc('2026-03-14'),
      buildDoc(UTC_TODAY),
      buildDoc('2026-03-16'),
      buildDoc('2026-09-12'),
      buildDoc(null),
    ];

    for (const [, instant] of INSTANTS) {
      const results: string[] = [];
      for (const [, offset] of OFFSETS) {
        mockPrisma.travelDocument.findMany.mockResolvedValue(docs);
        const all = await inTimezone(offset, instant, () => travelDocumentService.getAll(7));
        results.push(JSON.stringify(all.map((d) => [d.daysUntilExpiry, d.expirationStatus])));
      }

      expect(new Set(results).size).toBe(1);
      expect(JSON.parse(results[0])).toEqual([
        [-1, 'expired'],
        [0, 'expired'],
        [1, 'critical'],
        [181, 'valid'],
        [null, 'valid'],
      ]);
    }
  });

  it('getDocumentsRequiringAttention uses the same UTC boundary in every timezone', async () => {
    // alertDaysBefore = 1: only documents expiring today or earlier, or tomorrow,
    // fall inside the window. A one-day boundary shift changes the result set.
    const docs = [
      { ...buildDoc('2026-03-14'), id: 1, name: 'Yesterday', alertDaysBefore: 1 },
      { ...buildDoc(UTC_TODAY), id: 2, name: 'Today', alertDaysBefore: 1 },
      { ...buildDoc('2026-03-16'), id: 3, name: 'Tomorrow', alertDaysBefore: 1 },
      { ...buildDoc('2026-03-17'), id: 4, name: 'DayAfter', alertDaysBefore: 1 },
    ];

    for (const [, instant] of INSTANTS) {
      for (const [label, offset] of OFFSETS) {
        mockPrisma.travelDocument.findMany.mockResolvedValue(docs);
        const alerts = await inTimezone(offset, instant, () =>
          travelDocumentService.getDocumentsRequiringAttention(7)
        );

        expect({ label, alerts: alerts.map((a) => [a.document.name, a.alertType]) }).toEqual({
          label,
          alerts: [
            ['Yesterday', 'expired'],
            ['Today', 'expired'],
            ['Tomorrow', 'critical'],
          ],
        });
      }
    }
  });
});

// ===========================================================================
// trip.service — autoUpdateGlobalTripStatuses
// ===========================================================================

describe('trip.service — autoUpdateGlobalTripStatuses day boundary', () => {
  const tripService = new TripService();

  /** The exact row shape autoUpdateGlobalTripStatuses selects. */
  interface TripStatusRow {
    id: number;
    status: (typeof TripStatus)[keyof typeof TripStatus];
    startDate: Date | null;
    endDate: Date | null;
  }

  const buildTrip = (
    id: number,
    start: string | null,
    end: string | null
  ): TripStatusRow => ({
    id,
    status: TripStatus.PLANNING,
    startDate: start ? utcDate(start) : null,
    endDate: end ? utcDate(end) : null,
  });

  /** Run one pass and report which trip IDs were moved to which status. */
  const runPass = async (
    offsetMinutes: number,
    instant: string,
    trips: TripStatusRow[]
  ): Promise<{ completed: number[]; inProgress: number[]; total: number }> => {
    mockPrisma.trip.findMany.mockReset();
    mockPrisma.trip.updateMany.mockReset();
    mockPrisma.trip.findMany.mockResolvedValue(trips);
    mockPrisma.trip.updateMany.mockResolvedValue({ count: 0 });

    const total = await inTimezone(offsetMinutes, instant, () =>
      tripService.autoUpdateGlobalTripStatuses()
    );

    let completed: number[] = [];
    let inProgress: number[] = [];
    for (const call of mockPrisma.trip.updateMany.mock.calls) {
      const args = call[0] as {
        where: { id: { in: number[] } };
        data: { status: string };
      };
      if (args.data.status === TripStatus.COMPLETED) completed = args.where.id.in;
      if (args.data.status === TripStatus.IN_PROGRESS) inProgress = args.where.id.in;
    }
    return { completed, inProgress, total };
  };

  const TRIPS = [
    buildTrip(1, '2026-03-01', '2026-03-13'), // ended two days ago
    buildTrip(2, '2026-03-01', '2026-03-14'), // ended yesterday
    buildTrip(3, '2026-03-01', UTC_TODAY), // ends TODAY -> still in progress
    buildTrip(4, UTC_TODAY, '2026-03-20'), // starts TODAY -> in progress
    buildTrip(5, '2026-03-16', '2026-03-20'), // starts TOMORROW -> untouched
    buildTrip(6, '2026-04-01', '2026-04-10'), // future -> untouched
  ];

  for (const [instantName, instant] of INSTANTS) {
    it(`classifies every trip identically in all timezones at ${instantName}`, async () => {
      const observed: string[] = [];
      for (const [, offset] of OFFSETS) {
        observed.push(JSON.stringify(await runPass(offset, instant, TRIPS)));
      }

      // All timezones must agree...
      expect(new Set(observed).size).toBe(1);
      // ...on the UTC-correct answer.
      expect(JSON.parse(observed[0])).toEqual({
        completed: [1, 2],
        inProgress: [3, 4],
        total: 4,
      });
    });
  }

  it('treats a trip ending today as in progress, not completed, in every timezone', async () => {
    for (const [, instant] of INSTANTS) {
      for (const [label, offset] of OFFSETS) {
        const result = await runPass(offset, instant, [buildTrip(3, '2026-03-01', UTC_TODAY)]);
        expect({ label, ...result }).toEqual({
          label,
          completed: [],
          inProgress: [3],
          total: 1,
        });
      }
    }
  });

  it('does not start a trip that begins tomorrow, in any timezone', async () => {
    for (const [, instant] of INSTANTS) {
      for (const [label, offset] of OFFSETS) {
        const result = await runPass(offset, instant, [buildTrip(5, '2026-03-16', '2026-03-20')]);
        expect({ label, ...result }).toEqual({
          label,
          completed: [],
          inProgress: [],
          total: 0,
        });
      }
    }
  });

  it('completes a trip that ended yesterday, in every timezone', async () => {
    for (const [, instant] of INSTANTS) {
      for (const [label, offset] of OFFSETS) {
        const result = await runPass(offset, instant, [buildTrip(2, '2026-03-01', '2026-03-14')]);
        expect({ label, ...result }).toEqual({
          label,
          completed: [2],
          inProgress: [],
          total: 1,
        });
      }
    }
  });

  it('skips trips with no dates without consulting the clock', async () => {
    const result = await runPass(9 * 60, LATE_UTC_EVENING, [buildTrip(9, null, null)]);

    expect(result.total).toBe(0);
    expect(mockPrisma.trip.updateMany).not.toHaveBeenCalled();
  });
});
