import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;

/**
 * Conversion of Prisma `Decimal` values into plain numbers, so JSON responses
 * carry numbers rather than Decimal instances.
 */

/**
 * Utility type that transforms Decimal properties to number recursively.
 * This accurately represents the runtime transformation performed by convertDecimals.
 * Use this type when you need type-accurate representation of converted data.
 *
 * @example
 * type ConvertedLocation = ConvertDecimalsToNumbers<Location>;
 * // latitude: number (instead of Decimal)
 */
export type ConvertDecimalsToNumbers<T> = T extends Decimal
  ? number
  : T extends Array<infer U>
    ? ConvertDecimalsToNumbers<U>[]
    : T extends object
      ? { [K in keyof T]: ConvertDecimalsToNumbers<T[K]> }
      : T;

/**
 * Recursively converts Decimal objects (from Prisma) to numbers.
 * Useful for ensuring JSON responses have numbers instead of Decimal objects.
 *
 * Note: At runtime, Decimal fields become numbers. The return type is `T` for
 * backward compatibility, but callers should be aware that Decimal properties
 * will be numbers at runtime. Use `ConvertDecimalsToNumbers<T>` utility type
 * when you need type-accurate representation.
 *
 * @param obj - The object or array containing Decimal fields
 * @returns The object with Decimals converted to numbers (typed as T for compatibility)
 */
export function convertDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Prisma.Decimal) {
    return Number(obj) as T;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertDecimals(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertDecimals(obj[key]);
      }
    }
    return result as T;
  }

  return obj;
}
