import emergencyInfoService from '../services/emergencyInfo.service';
import { updateTripEmergencyInfoSchema } from '../types/emergencyInfo.types';
import { createCrudController } from '../prisma/crudHelpers';
import { parseId } from '../http/parseId';

export const emergencyInfoController = createCrudController({
  service: emergencyInfoService,
  handlers: {
    getEmergencyCard: {
      method: 'getEmergencyCard',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
    upsertEmergencyInfo: {
      method: 'upsertEmergencyInfo',
      bodySchema: updateTripEmergencyInfoSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },
    deleteEmergencyInfo: {
      method: 'deleteEmergencyInfo',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
  },
});
