import expenseService from '../services/expense.service';
import {
  createExpenseSchema,
  updateExpenseSchema,
} from '../types/expense.types';
import { createCrudController } from '../prisma/crudHelpers';
import { parseId } from '../http/parseId';

export const expenseController = createCrudController({
  service: expenseService,
  handlers: {
    createExpense: {
      method: 'createExpense',
      statusCode: 201,
      bodySchema: createExpenseSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },
    getExpensesByTrip: {
      method: 'getExpensesByTrip',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
    getExpenseById: {
      method: 'getExpenseById',
      buildArgs: (userId, req) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        parseId(req.params.id),
      ],
    },
    updateExpense: {
      method: 'updateExpense',
      bodySchema: updateExpenseSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        parseId(req.params.id),
        body,
      ],
    },
    deleteExpense: {
      method: 'deleteExpense',
      buildArgs: (userId, req) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        parseId(req.params.id),
      ],
    },
    getBudgetSummary: {
      method: 'getBudgetSummary',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
  },
});
