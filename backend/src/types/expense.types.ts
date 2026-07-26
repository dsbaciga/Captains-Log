import { z } from 'zod';
import {
  optionalNullable,
  requiredStringWithMax,
  optionalCurrencyCode,
  optionalDatetime,
  optionalDatetimeCreate,
  optionalNotes,
} from '../validation/zodHelpers';

/**
 * Allowed expense categories.
 * lodging/transportation/activities expenses are added to the matching
 * budget-summary bucket; food gets its own bucket; shopping/other roll
 * into the "other" bucket.
 */
export const EXPENSE_CATEGORIES = [
  'food',
  'transportation',
  'lodging',
  'activities',
  'shopping',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES);

export const createExpenseSchema = z.object({
  description: requiredStringWithMax(500),
  category: expenseCategorySchema,
  amount: z.number().min(0),
  currency: z.string().length(3).optional().nullable(),
  date: optionalDatetimeCreate(), // ISO date string (YYYY-MM-DD)
  notes: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  description: optionalNullable(requiredStringWithMax(500)),
  category: expenseCategorySchema.optional(),
  amount: z.number().min(0).optional(),
  currency: optionalCurrencyCode(),
  date: optionalDatetime(),
  notes: optionalNotes(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

/** An amount that could not be converted, grouped by its original currency. */
export interface UnconvertedAmount {
  /** ISO 4217 code the amount is recorded in. */
  currency: string;
  /** Sum of the affected amounts, in `currency` (NOT in the base currency). */
  amount: number;
  /** How many records make up `amount`. */
  count: number;
}

/**
 * Explains how `spent` was arrived at, so the UI never has to guess whether a
 * total is trustworthy.
 */
export interface BudgetConversionInfo {
  /** Currency `spent` and `breakdown` are expressed in. */
  baseCurrency: string;
  /**
   * Records converted at the rate that applied on their own date (or already
   * in the base currency).
   */
  exactCount: number;
  /**
   * Records with no date of their own, so the latest rate had to stand in for
   * the rate that applied when the money was actually spent. Their
   * contribution to `spent` is an approximation.
   */
  estimatedCount: number;
  /**
   * Records with no currency recorded at all. They are counted at face value
   * on the assumption that they are already in `baseCurrency`.
   */
  assumedBaseCount: number;
  /**
   * Records EXCLUDED from `spent` because no rate could be obtained. Their
   * amounts are reported here in their own currency and are deliberately not
   * mixed into the totals.
   */
  unconverted: UnconvertedAmount[];
  /** True when nothing was excluded and nothing was estimated. */
  isComplete: boolean;
}

/**
 * Budget summary response shape.
 *
 * `spent` and every `breakdown` bucket are expressed in `currency`, converted
 * from each record's own currency using the rate frozen at its transaction
 * date. Amounts that could not be converted are excluded from the totals and
 * listed under `conversion.unconverted` instead of being summed at face value.
 */
export interface BudgetSummary {
  /**
   * The trip budget expressed in `currency`, so it is directly comparable with
   * `spent`. Null when no budget is set, or when the budget's own currency
   * could not be converted — check `budgetOriginal` to tell those apart.
   */
  budget: number | null;
  /** The budget exactly as entered, before any conversion. */
  budgetOriginal: number | null;
  /** The currency the budget was entered in. */
  budgetCurrency: string | null;
  /** Currency that `budget`, `spent` and `breakdown` are expressed in. */
  currency: string;
  spent: number;
  breakdown: {
    lodging: number;
    transportation: number;
    activities: number;
    food: number;
    other: number;
  };
  conversion: BudgetConversionInfo;
}
