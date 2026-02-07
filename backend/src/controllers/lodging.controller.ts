import lodgingService from '../services/lodging.service';
import {
  createLodgingSchema,
  updateLodgingSchema,
  bulkDeleteLodgingSchema,
  bulkUpdateLodgingSchema,
} from '../types/lodging.types';
import { createCrudController } from '../utils/crudHelpers';
import { parseId } from '../utils/parseId';

export const lodgingController = createCrudController({
  service: lodgingService,
  handlers: {
    createLodging: {
      method: 'createLodging',
      statusCode: 201,
      bodySchema: createLodgingSchema,
    },
    getLodgingByTrip: {
      method: 'getLodgingByTrip',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
    getLodgingById: {
      method: 'getLodgingById',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    updateLodging: {
      method: 'updateLodging',
      bodySchema: updateLodgingSchema,
      buildArgs: (userId, req, body) => [userId, parseId(req.params.id), body],
    },
    deleteLodging: {
      method: 'deleteLodging',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    bulkDeleteLodging: {
      method: 'bulkDeleteLodging',
      bodySchema: bulkDeleteLodgingSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },
    bulkUpdateLodging: {
      method: 'bulkUpdateLodging',
      bodySchema: bulkUpdateLodgingSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },
  },
});
