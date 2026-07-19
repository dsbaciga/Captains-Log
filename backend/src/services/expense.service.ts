import prisma from '../config/database';
import { AppError } from '../errors/errors';
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  BudgetSummary,
  ExpenseCategory,
} from '../types/expense.types';
import {
  verifyTripAccessWithPermission,
  convertDecimals,
  tripDateTransformer,
} from '../services/_shared/serviceHelpers';
import { Prisma } from '@prisma/client';

/**
 * Verifies the expense exists and belongs to the given trip.
 * (TripExpense is not part of the generic VerifiableEntityType helpers,
 * so ownership is checked against the trip directly.)
 */
async function verifyExpenseInTrip(expenseId: number, tripId: number) {
  const expense = await prisma.tripExpense.findFirst({
    where: { id: expenseId, tripId },
  });

  if (!expense) {
    throw new AppError('Expense not found or does not belong to trip', 404);
  }

  return expense;
}

/** Sums a list of nullable Prisma Decimals as a plain number. */
function sumDecimals(values: Array<Prisma.Decimal | null>): number {
  return values.reduce((sum, value) => sum + (value ? Number(value) : 0), 0);
}

class ExpenseService {
  async createExpense(userId: number, tripId: number, data: CreateExpenseInput) {
    // Verify user has edit permission on the trip
    await verifyTripAccessWithPermission(userId, tripId, 'edit');

    const expense = await prisma.tripExpense.create({
      data: {
        tripId,
        description: data.description,
        category: data.category,
        amount: data.amount,
        currency: data.currency || null,
        date: data.date ? tripDateTransformer(data.date) : null,
        notes: data.notes || null,
      },
    });

    return convertDecimals(expense);
  }

  async getExpensesByTrip(userId: number, tripId: number) {
    // Verify user has view permission on the trip
    await verifyTripAccessWithPermission(userId, tripId, 'view');

    const expenses = await prisma.tripExpense.findMany({
      where: { tripId },
      orderBy: [{ date: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });

    return convertDecimals(expenses);
  }

  async getExpenseById(userId: number, tripId: number, expenseId: number) {
    // Verify user has view permission on the trip
    await verifyTripAccessWithPermission(userId, tripId, 'view');

    const expense = await verifyExpenseInTrip(expenseId, tripId);

    return convertDecimals(expense);
  }

  async updateExpense(
    userId: number,
    tripId: number,
    expenseId: number,
    data: UpdateExpenseInput
  ) {
    // Verify user has edit permission on the trip
    await verifyTripAccessWithPermission(userId, tripId, 'edit');
    await verifyExpenseInTrip(expenseId, tripId);

    // Build the update object field-by-field so it satisfies Prisma's types
    // directly (only defined fields are applied; description is required in
    // the DB so a null/empty value is ignored rather than clearing it)
    const updateData: Prisma.TripExpenseUncheckedUpdateInput = {};
    if (data.description) {
      updateData.description = data.description;
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.amount !== undefined) {
      updateData.amount = data.amount;
    }
    if (data.currency !== undefined) {
      updateData.currency = data.currency || null;
    }
    if (data.date !== undefined) {
      updateData.date = data.date ? tripDateTransformer(data.date) : null;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes || null;
    }

    const updatedExpense = await prisma.tripExpense.update({
      where: { id: expenseId },
      data: updateData,
    });

    return convertDecimals(updatedExpense);
  }

  async deleteExpense(userId: number, tripId: number, expenseId: number) {
    // Verify user has edit permission on the trip
    await verifyTripAccessWithPermission(userId, tripId, 'edit');
    await verifyExpenseInTrip(expenseId, tripId);

    await prisma.tripExpense.delete({ where: { id: expenseId } });

    return { success: true };
  }

  /**
   * Computes the budget summary for a trip.
   *
   * Breakdown buckets:
   * - lodging / transportation / activities: the `cost` fields of those
   *   entities plus any expenses recorded with the matching category
   * - food: expenses with category 'food'
   * - other: all remaining expense categories (shopping, other)
   *
   * Currency limitation: amounts are summed as-is with NO foreign-exchange
   * conversion. If costs/expenses are recorded in mixed currencies the totals
   * are simple numeric sums, reported under a single display currency
   * (trip.budgetCurrency if set, else the most common currency among costed
   * items, else 'USD').
   */
  async getBudgetSummary(userId: number, tripId: number): Promise<BudgetSummary> {
    // Verify user has view permission on the trip
    await verifyTripAccessWithPermission(userId, tripId, 'view');

    const [trip, activities, transportation, lodging, expenses] = await Promise.all([
      prisma.trip.findUnique({
        where: { id: tripId },
        select: { budget: true, budgetCurrency: true },
      }),
      prisma.activity.findMany({
        where: { tripId, cost: { not: null } },
        select: { cost: true, currency: true },
      }),
      prisma.transportation.findMany({
        where: { tripId, cost: { not: null } },
        select: { cost: true, currency: true },
      }),
      prisma.lodging.findMany({
        where: { tripId, cost: { not: null } },
        select: { cost: true, currency: true },
      }),
      prisma.tripExpense.findMany({
        where: { tripId },
        select: { amount: true, currency: true, category: true },
      }),
    ]);

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    const breakdown = {
      lodging: sumDecimals(lodging.map((l) => l.cost)),
      transportation: sumDecimals(transportation.map((t) => t.cost)),
      activities: sumDecimals(activities.map((a) => a.cost)),
      food: 0,
      other: 0,
    };

    // Route each expense to its bucket: entity-style categories join the
    // matching entity bucket, food is its own bucket, everything else
    // (shopping, other) rolls into "other".
    for (const expense of expenses) {
      const amount = Number(expense.amount);
      const category = expense.category as ExpenseCategory;
      if (category === 'lodging' || category === 'transportation' || category === 'activities' || category === 'food') {
        breakdown[category] += amount;
      } else {
        breakdown.other += amount;
      }
    }

    const spent =
      breakdown.lodging +
      breakdown.transportation +
      breakdown.activities +
      breakdown.food +
      breakdown.other;

    // Display currency: trip budget currency, else the most common currency
    // among costed items, else USD. Note: no FX conversion is performed.
    let currency = trip.budgetCurrency;
    if (!currency) {
      const currencyCounts = new Map<string, number>();
      const costedCurrencies = [
        ...activities.map((a) => a.currency),
        ...transportation.map((t) => t.currency),
        ...lodging.map((l) => l.currency),
        ...expenses.map((e) => e.currency),
      ];
      for (const code of costedCurrencies) {
        if (code) {
          currencyCounts.set(code, (currencyCounts.get(code) ?? 0) + 1);
        }
      }
      for (const [code, count] of currencyCounts) {
        if (!currency || count > (currencyCounts.get(currency) ?? 0)) {
          currency = code;
        }
      }
    }

    return {
      budget: trip.budget !== null ? Number(trip.budget) : null,
      currency: currency ?? 'USD',
      spent: Math.round(spent * 100) / 100,
      breakdown: {
        lodging: Math.round(breakdown.lodging * 100) / 100,
        transportation: Math.round(breakdown.transportation * 100) / 100,
        activities: Math.round(breakdown.activities * 100) / 100,
        food: Math.round(breakdown.food * 100) / 100,
        other: Math.round(breakdown.other * 100) / 100,
      },
    };
  }
}

export default new ExpenseService();
