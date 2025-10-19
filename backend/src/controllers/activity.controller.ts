import { Request, Response } from 'express';
import activityService from '../services/activity.service';
import {
  createActivitySchema,
  updateActivitySchema,
} from '../types/activity.types';
import { asyncHandler } from '../utils/asyncHandler';

export const activityController = {
  createActivity: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = createActivitySchema.parse(req.body);
    const activity = await activityService.createActivity(userId, data);
    res.status(201).json(activity);
  }),

  getActivitiesByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tripId = parseInt(req.params.tripId);
    const activities = await activityService.getActivitiesByTrip(userId, tripId);
    res.json(activities);
  }),

  getActivityById: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const activityId = parseInt(req.params.id);
    const activity = await activityService.getActivityById(userId, activityId);
    res.json(activity);
  }),

  updateActivity: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const activityId = parseInt(req.params.id);
    const data = updateActivitySchema.parse(req.body);
    const activity = await activityService.updateActivity(
      userId,
      activityId,
      data
    );
    res.json(activity);
  }),

  deleteActivity: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const activityId = parseInt(req.params.id);
    await activityService.deleteActivity(userId, activityId);
    res.status(204).send();
  }),
};
