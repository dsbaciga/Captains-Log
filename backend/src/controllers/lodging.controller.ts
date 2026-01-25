import { Request, Response } from 'express';
import lodgingService from '../services/lodging.service';
import {
  createLodgingSchema,
  updateLodgingSchema,
  bulkDeleteLodgingSchema,
  bulkUpdateLodgingSchema,
} from '../types/lodging.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

export const lodgingController = {
  createLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const data = createLodgingSchema.parse(req.body);
    const lodging = await lodgingService.createLodging(userId, data);
    res.status(201).json(lodging);
  }),

  getLodgingByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const lodgings = await lodgingService.getLodgingByTrip(userId, tripId);
    res.json(lodgings);
  }),

  getLodgingById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const lodgingId = parseId(req.params.id);
    const lodging = await lodgingService.getLodgingById(userId, lodgingId);
    res.json(lodging);
  }),

  updateLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const lodgingId = parseId(req.params.id);
    const data = updateLodgingSchema.parse(req.body);
    const lodging = await lodgingService.updateLodging(userId, lodgingId, data);
    res.json(lodging);
  }),

  deleteLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const lodgingId = parseId(req.params.id);
    await lodgingService.deleteLodging(userId, lodgingId);
    res.status(204).send();
  }),

  bulkDeleteLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkDeleteLodgingSchema.parse(req.body);
    const result = await lodgingService.bulkDeleteLodging(userId, tripId, data);
    res.json(result);
  }),

  bulkUpdateLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkUpdateLodgingSchema.parse(req.body);
    const result = await lodgingService.bulkUpdateLodging(userId, tripId, data);
    res.json(result);
  }),
};
