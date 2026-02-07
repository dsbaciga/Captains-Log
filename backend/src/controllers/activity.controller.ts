import activityService from '../services/activity.service';
import {
  createActivitySchema,
  updateActivitySchema,
  bulkDeleteActivitiesSchema,
  bulkUpdateActivitiesSchema,
} from '../types/activity.types';
import { createCrudController } from '../utils/crudHelpers';
import { parseId } from '../utils/parseId';

export const activityController = createCrudController({
  service: activityService,
  handlers: {
    createActivity: {
      method: 'createActivity',
      statusCode: 201,
      bodySchema: createActivitySchema,
    },
    getActivitiesByTrip: {
      method: 'getActivitiesByTrip',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
    getActivityById: {
      method: 'getActivityById',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    updateActivity: {
      method: 'updateActivity',
      bodySchema: updateActivitySchema,
      buildArgs: (userId, req, body) => [userId, parseId(req.params.id), body],
    },
    deleteActivity: {
      method: 'deleteActivity',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    bulkDeleteActivities: {
      method: 'bulkDeleteActivities',
      bodySchema: bulkDeleteActivitiesSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },
    bulkUpdateActivities: {
      method: 'bulkUpdateActivities',
      bodySchema: bulkUpdateActivitiesSchema,
      buildArgs: (userId, req, body) => [
        userId,
        parseId(req.params.tripId, 'tripId'),
        body,
      ],
    },
  },
});
