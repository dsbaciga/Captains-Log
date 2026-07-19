import axios from '../lib/axios';
import type {
  TripExpense,
  CreateExpenseInput,
  UpdateExpenseInput,
  BudgetSummary,
} from '../types/expense';

export const expenseService = {
  async createExpense(
    tripId: number,
    data: CreateExpenseInput
  ): Promise<TripExpense> {
    const response = await axios.post<TripExpense>(
      `/trips/${tripId}/expenses`,
      data
    );
    return response.data;
  },

  async getExpensesByTrip(tripId: number): Promise<TripExpense[]> {
    const response = await axios.get<TripExpense[]>(`/trips/${tripId}/expenses`);
    return response.data;
  },

  async getExpenseById(tripId: number, expenseId: number): Promise<TripExpense> {
    const response = await axios.get<TripExpense>(
      `/trips/${tripId}/expenses/${expenseId}`
    );
    return response.data;
  },

  async updateExpense(
    tripId: number,
    expenseId: number,
    data: UpdateExpenseInput
  ): Promise<TripExpense> {
    const response = await axios.put<TripExpense>(
      `/trips/${tripId}/expenses/${expenseId}`,
      data
    );
    return response.data;
  },

  async deleteExpense(tripId: number, expenseId: number): Promise<void> {
    await axios.delete(`/trips/${tripId}/expenses/${expenseId}`);
  },

  async getBudgetSummary(tripId: number): Promise<BudgetSummary> {
    const response = await axios.get<BudgetSummary>(
      `/trips/${tripId}/budget-summary`
    );
    return response.data;
  },
};

export default expenseService;
