import customItemService from '../services/customItem.service';
import {
  createCustomItemSchema,
  updateCustomItemSchema,
  createCustomItemTypeSchema,
  updateCustomItemTypeSchema,
  bulkDeleteCustomItemsSchema,
  bulkUpdateCustomItemsSchema,
} from '../types/customItem.types';
import { createCrudController } from '../prisma/crudHelpers';
import { parseId } from '../http/parseId';

export const customItemController = createCrudController({
  service: customItemService,
  handlers: {
    // --- Items -------------------------------------------------------------
    createCustomItem: {
      method: 'createCustomItem',
      statusCode: 201,
      bodySchema: createCustomItemSchema,
    },
    getCustomItemsByTrip: {
      method: 'getCustomItemsByTrip',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
    getCustomItemById: {
      method: 'getCustomItemById',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    updateCustomItem: {
      method: 'updateCustomItem',
      bodySchema: updateCustomItemSchema,
      buildArgs: (userId, req, body) => [userId, parseId(req.params.id), body],
    },
    deleteCustomItem: {
      method: 'deleteCustomItem',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    bulkDeleteCustomItems: {
      method: 'bulkDeleteCustomItems',
      bodySchema: bulkDeleteCustomItemsSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },
    bulkUpdateCustomItems: {
      method: 'bulkUpdateCustomItems',
      bodySchema: bulkUpdateCustomItemsSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },

    // --- Type registry -----------------------------------------------------
    getTypes: {
      method: 'getTypes',
      buildArgs: (userId) => [userId],
    },
    createType: {
      method: 'createType',
      statusCode: 201,
      bodySchema: createCustomItemTypeSchema,
    },
    updateType: {
      method: 'updateType',
      bodySchema: updateCustomItemTypeSchema,
      buildArgs: (userId, req, body) => [userId, parseId(req.params.id), body],
    },
    deleteType: {
      method: 'deleteType',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
  },
});
