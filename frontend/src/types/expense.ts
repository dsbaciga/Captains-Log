export const EXPENSE_CATEGORIES = [
  'food',
  'transportation',
  'lodging',
  'activities',
  'shopping',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Food & Drink',
  transportation: 'Transportation',
  lodging: 'Lodging',
  activities: 'Activities',
  shopping: 'Shopping',
  other: 'Other',
};

export type TripExpense = {
  id: number;
  tripId: number;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string | null;
  date: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseInput = {
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string | null;
  date?: string;
  notes?: string;
};

export type UpdateExpenseInput = {
  description?: string;
  category?: ExpenseCategory;
  amount?: number;
  currency?: string | null;
  date?: string | null;
  notes?: string | null;
};

export type BudgetSummary = {
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
};
