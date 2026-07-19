import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import expenseService from "../services/expense.service";
import tripService from "../services/trip.service";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type TripExpense,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "../types/expense";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import EmptyState from "./EmptyState";
import { ListItemSkeleton } from "./SkeletonLoader";

/**
 * BudgetManager handles the trip budget and expense tracking tab.
 *
 * Features:
 * - Set / edit / clear the total trip budget (amount + currency)
 * - Budget progress with remaining / over-budget indicator
 * - Expense CRUD (description, category, amount, currency, date, notes)
 * - Per-category spending totals (includes activity/transportation/lodging
 *   costs via the backend budget summary)
 *
 * Note: totals are simple sums with no currency conversion — mixed-currency
 * trips are summed as-is under a single display currency.
 */
interface BudgetManagerProps {
  tripId: number;
  budget: number | null;
  budgetCurrency: string | null;
  onUpdate?: () => void;
}

interface ExpenseFormState {
  description: string;
  category: ExpenseCategory;
  amount: string;
  currency: string;
  date: string;
  notes: string;
}

const EMPTY_EXPENSE_FORM: ExpenseFormState = {
  description: "",
  category: "food",
  amount: "",
  currency: "",
  date: "",
  notes: "",
};

function isExpenseCategory(value: string): value is ExpenseCategory {
  return EXPENSE_CATEGORIES.some((category) => category === value);
}

export default function BudgetManager({
  tripId,
  budget,
  budgetCurrency,
  onUpdate,
}: BudgetManagerProps) {
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrencyInput, setBudgetCurrencyInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(EMPTY_EXPENSE_FORM);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ["expenses", tripId],
    queryFn: () => expenseService.getExpensesByTrip(tripId),
    enabled: !!tripId,
  });

  const { data: summary } = useQuery({
    queryKey: ["budget-summary", tripId],
    queryFn: () => expenseService.getBudgetSummary(tripId),
    enabled: !!tripId,
  });

  const displayCurrency = budgetCurrency || summary?.currency || "USD";

  const formatCurrency = useMemo(() => {
    return (amount: number, currency?: string | null) => {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency || displayCurrency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        // Invalid/unknown currency code — fall back to a plain number
        return amount.toFixed(2);
      }
    };
  }, [displayCurrency]);

  const spent = summary?.spent ?? 0;
  const remaining = budget !== null ? budget - spent : null;
  const percentage = budget && budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const isOverBudget = budget !== null && spent > budget;
  const isNearBudget = budget !== null && !isOverBudget && percentage >= 80;

  const progressColor = isOverBudget
    ? "bg-red-500 dark:bg-red-400"
    : isNearBudget
    ? "bg-amber-500 dark:bg-amber-400"
    : "bg-green-500 dark:bg-green-400";

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses", tripId] });
    queryClient.invalidateQueries({ queryKey: ["budget-summary", tripId] });
    queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    onUpdate?.();
  };

  // -------------------------------------------------------------------------
  // Budget handlers
  // -------------------------------------------------------------------------

  const openBudgetEditor = () => {
    setBudgetAmount(budget !== null ? String(budget) : "");
    setBudgetCurrencyInput(budgetCurrency || displayCurrency);
    setIsEditingBudget(true);
  };

  const handleSaveBudget = async () => {
    const parsedAmount = budgetAmount.trim() === "" ? null : Number(budgetAmount);
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
      toast.error("Budget must be a positive number");
      return;
    }
    const currency = budgetCurrencyInput.trim().toUpperCase();
    if (parsedAmount !== null && currency.length !== 3) {
      toast.error("Currency must be a 3-letter code (e.g. USD)");
      return;
    }

    setIsSavingBudget(true);
    try {
      await tripService.updateTrip(tripId, {
        budget: parsedAmount,
        budgetCurrency: parsedAmount !== null ? currency : null,
      });
      toast.success(parsedAmount !== null ? "Budget saved" : "Budget removed");
      setIsEditingBudget(false);
      refreshData();
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleRemoveBudget = async () => {
    const confirmed = await confirm({
      title: "Remove Budget",
      message: "Remove the budget for this trip? Expenses will be kept.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsSavingBudget(true);
    try {
      await tripService.updateTrip(tripId, { budget: null, budgetCurrency: null });
      toast.success("Budget removed");
      setIsEditingBudget(false);
      refreshData();
    } catch {
      toast.error("Failed to remove budget");
    } finally {
      setIsSavingBudget(false);
    }
  };

  // -------------------------------------------------------------------------
  // Expense handlers
  // -------------------------------------------------------------------------

  const openCreateExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, currency: displayCurrency });
    setShowExpenseForm(true);
  };

  const openEditExpenseForm = (expense: TripExpense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      description: expense.description,
      category: expense.category,
      amount: String(expense.amount),
      currency: expense.currency || "",
      date: expense.date ? expense.date.substring(0, 10) : "",
      notes: expense.notes || "",
    });
    setShowExpenseForm(true);
  };

  const closeExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpenseId(null);
    setExpenseForm(EMPTY_EXPENSE_FORM);
  };

  const handleSubmitExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const amount = Number(expenseForm.amount);
    if (!expenseForm.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (isNaN(amount) || amount < 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    const currency = expenseForm.currency.trim().toUpperCase();
    if (currency && currency.length !== 3) {
      toast.error("Currency must be a 3-letter code (e.g. USD)");
      return;
    }

    setIsSavingExpense(true);
    try {
      if (editingExpenseId) {
        const updateData: UpdateExpenseInput = {
          description: expenseForm.description.trim(),
          category: expenseForm.category,
          amount,
          currency: currency || null,
          date: expenseForm.date || null,
          notes: expenseForm.notes.trim() || null,
        };
        await expenseService.updateExpense(tripId, editingExpenseId, updateData);
        toast.success("Expense updated");
      } else {
        const createData: CreateExpenseInput = {
          description: expenseForm.description.trim(),
          category: expenseForm.category,
          amount,
          currency: currency || null,
          date: expenseForm.date || undefined,
          notes: expenseForm.notes.trim() || undefined,
        };
        await expenseService.createExpense(tripId, createData);
        toast.success("Expense added");
      }
      closeExpenseForm();
      refreshData();
    } catch {
      toast.error(editingExpenseId ? "Failed to update expense" : "Failed to add expense");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: TripExpense) => {
    const confirmed = await confirm({
      title: "Delete Expense",
      message: `Delete "${expense.description}"?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await expenseService.deleteExpense(tripId, expense.id);
      toast.success("Expense deleted");
      if (editingExpenseId === expense.id) closeExpenseForm();
      refreshData();
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const formatExpenseDate = (date: string | null) => {
    if (!date) return null;
    // Dates are stored as date-only values; parse as UTC to avoid TZ shifts
    const parsed = new Date(date.substring(0, 10) + "T00:00:00.000Z");
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  const breakdownEntries = summary
    ? Object.entries(summary.breakdown).filter(([, amount]) => amount > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Budget &amp; Expenses
        </h2>
        <button
          type="button"
          onClick={showExpenseForm ? closeExpenseForm : openCreateExpenseForm}
          className="btn-primary"
        >
          {showExpenseForm ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      {/* Budget Overview */}
      <div className="bg-parchment dark:bg-navy-700/50 rounded-2xl border border-primary-100 dark:border-gold/20 p-6">
        {!isEditingBudget ? (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate dark:text-warm-gray/70 mb-1">
                  Trip Budget
                </p>
                {budget !== null ? (
                  <p className="text-3xl font-bold font-display text-charcoal dark:text-warm-gray">
                    {formatCurrency(budget)}
                    <span className="text-sm font-body font-normal text-slate dark:text-warm-gray/70 ml-2">
                      {displayCurrency}
                    </span>
                  </p>
                ) : (
                  <p className="text-slate dark:text-warm-gray/70">
                    No budget set for this trip
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={openBudgetEditor}
                  className="btn-secondary"
                >
                  {budget !== null ? "Edit Budget" : "Set Budget"}
                </button>
                {budget !== null && (
                  <button
                    type="button"
                    onClick={handleRemoveBudget}
                    disabled={isSavingBudget}
                    className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Progress / remaining indicator */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-2">
                <span
                  className={`text-lg font-semibold ${
                    isOverBudget
                      ? "text-red-600 dark:text-red-400"
                      : isNearBudget
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-charcoal dark:text-warm-gray"
                  }`}
                >
                  {formatCurrency(spent)} spent
                </span>
                {budget !== null && (
                  <span
                    className={`text-sm font-medium ${
                      isOverBudget
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate dark:text-warm-gray/70"
                    }`}
                  >
                    {remaining !== null && remaining >= 0
                      ? `${formatCurrency(remaining)} remaining`
                      : `${formatCurrency(Math.abs(remaining ?? 0))} over budget`}
                  </span>
                )}
              </div>
              {budget !== null && budget > 0 && (
                <div
                  className="h-3 bg-slate/10 dark:bg-navy-900 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Budget used"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${progressColor}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
              <p className="mt-2 text-xs text-slate dark:text-warm-gray/60">
                Includes activity, transportation, and lodging costs plus recorded
                expenses. Amounts are summed without currency conversion.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate dark:text-warm-gray/70 mb-3">
              {budget !== null ? "Edit Trip Budget" : "Set Trip Budget"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="budget-amount" className="label">
                  Amount
                </label>
                <input
                  id="budget-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. 2500"
                />
              </div>
              <div className="w-full sm:w-32">
                <label htmlFor="budget-currency" className="label">
                  Currency
                </label>
                <input
                  id="budget-currency"
                  type="text"
                  maxLength={3}
                  value={budgetCurrencyInput}
                  onChange={(e) =>
                    setBudgetCurrencyInput(e.target.value.toUpperCase())
                  }
                  className="input w-full uppercase"
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsEditingBudget(false)}
                className="btn-secondary"
                disabled={isSavingBudget}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                className="btn-primary"
                disabled={isSavingBudget}
              >
                {isSavingBudget ? "Saving..." : "Save Budget"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Totals */}
      {breakdownEntries.length > 0 && (
        <div>
          <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-3">
            Spending by Category
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {breakdownEntries.map(([category, amount]) => (
              <div
                key={category}
                className="bg-white dark:bg-navy-700/50 rounded-xl border border-primary-100 dark:border-gold/20 p-3"
              >
                <p className="text-xs font-medium text-slate dark:text-warm-gray/70 capitalize mb-1">
                  {category}
                </p>
                <p className="text-lg font-semibold text-charcoal dark:text-warm-gray">
                  {formatCurrency(amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Form */}
      {showExpenseForm && (
        <form
          onSubmit={handleSubmitExpense}
          className="bg-white dark:bg-navy-700/50 rounded-2xl border border-primary-100 dark:border-gold/20 p-6 space-y-4 animate-fade-in"
        >
          <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray">
            {editingExpenseId ? "Edit Expense" : "Add Expense"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="expense-description" className="label label-required">
                Description
              </label>
              <input
                id="expense-description"
                type="text"
                required
                maxLength={500}
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, description: e.target.value })
                }
                className="input w-full"
                placeholder="e.g. Dinner at trattoria"
              />
            </div>

            <div>
              <label htmlFor="expense-category" className="label">
                Category
              </label>
              <select
                id="expense-category"
                value={expenseForm.category}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isExpenseCategory(value)) {
                    setExpenseForm({ ...expenseForm, category: value });
                  }
                }}
                className="input w-full"
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {EXPENSE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="expense-amount" className="label label-required">
                  Amount
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="expense-currency" className="label">
                  Currency
                </label>
                <input
                  id="expense-currency"
                  type="text"
                  maxLength={3}
                  value={expenseForm.currency}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                  className="input w-full uppercase"
                  placeholder="USD"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expense-date" className="label">
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="input w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="expense-notes" className="label">
                Notes
              </label>
              <textarea
                id="expense-notes"
                rows={2}
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, notes: e.target.value })
                }
                className="input w-full"
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeExpenseForm}
              className="btn-secondary"
              disabled={isSavingExpense}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSavingExpense}>
              {isSavingExpense
                ? "Saving..."
                : editingExpenseId
                ? "Update Expense"
                : "Add Expense"}
            </button>
          </div>
        </form>
      )}

      {/* Expense List */}
      <div>
        <h3 className="font-body font-semibold text-lg text-charcoal dark:text-warm-gray mb-3">
          Expenses{expenses.length > 0 ? ` (${expenses.length})` : ""}
        </h3>

        {isExpensesLoading ? (
          <ListItemSkeleton count={3} />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon="💰"
            message="No expenses recorded yet"
            subMessage="Track your trip spending by adding expenses"
            actionLabel="Add Expense"
            onAction={openCreateExpenseForm}
          />
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-start justify-between gap-4 bg-white dark:bg-navy-700/50 rounded-xl border border-primary-100 dark:border-gold/20 p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-charcoal dark:text-warm-gray break-words">
                      {expense.description}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-navy-900 dark:text-gold capitalize">
                      {EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate dark:text-warm-gray/70 flex items-center gap-2 flex-wrap">
                    {expense.date && <span>{formatExpenseDate(expense.date)}</span>}
                    {expense.notes && (
                      <span className="truncate max-w-xs" title={expense.notes}>
                        {expense.notes}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold text-charcoal dark:text-warm-gray whitespace-nowrap">
                    {formatCurrency(expense.amount, expense.currency)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditExpenseForm(expense)}
                      className="p-1.5 rounded-lg text-slate hover:text-primary-600 dark:text-warm-gray/50 dark:hover:text-gold hover:bg-primary-50 dark:hover:bg-navy-700 transition-colors"
                      aria-label={`Edit ${expense.description}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(expense)}
                      className="p-1.5 rounded-lg text-slate hover:text-red-600 dark:text-warm-gray/50 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      aria-label={`Delete ${expense.description}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialogComponent />
    </div>
  );
}
