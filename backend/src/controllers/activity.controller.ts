import { Request, Response } from 'express';
import activityService from '../services/activity.service';
import {
  createActivitySchema,
  updateActivitySchema,
  bulkDeleteActivitiesSchema,
  bulkUpdateActivitiesSchema,
} from '../types/activity.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

export const activityController = {
  createActivity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const data = createActivitySchema.parse(req.body);
    const activity = await activityService.createActivity(userId, data);
    res.status(201).json({
      status: 'success',
      data: activity,
    });
  }),

  getActivitiesByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const activities = await activityService.getActivitiesByTrip(userId, tripId);
    res.json({
      status: 'success',
      data: activities,
    });
  }),

  getActivityById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const activityId = parseId(req.params.id);
    const activity = await activityService.getActivityById(userId, activityId);
    res.json({
      status: 'success',
      data: activity,
    });
  }),

  updateActivity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const activityId = parseId(req.params.id);
    const data = updateActivitySchema.parse(req.body);
    const activity = await activityService.updateActivity(
      userId,
      activityId,
      data
    );
    res.json({
      status: 'success',
      data: activity,
    });
  }),

  deleteActivity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const activityId = parseId(req.params.id);
    const result = await activityService.deleteActivity(userId, activityId);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  bulkDeleteActivities: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkDeleteActivitiesSchema.parse(req.body);
    const result = await activityService.bulkDeleteActivities(userId, tripId, data);
    res.json({
      status: 'success',
      data: result,
    });
  }),

  bulkUpdateActivities: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkUpdateActivitiesSchema.parse(req.body);
    const result = await activityService.bulkUpdateActivities(userId, tripId, data);
    res.json({
      status: 'success',
      data: result,
    });
  }),
};
