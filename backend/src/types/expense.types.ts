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

/**
 * Budget summary response shape.
 * Note: amounts are simple sums of the recorded values — there is no
 * foreign-exchange conversion between differing currencies (see
 * expense.service.ts for details).
 */
export interface BudgetSummary {
  budget: number | null;
  currency: string;
  spent: number;
  breakdown: {
    lodging: number;
    transportation: number;
    activities: number;
    food: number;
    other: number;
  };
}
