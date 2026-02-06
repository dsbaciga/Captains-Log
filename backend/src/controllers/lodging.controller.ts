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
    res.status(201).json({
      status: 'success',
      data: lodging,
    });
  }),

  getLodgingByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const lodgings = await lodgingService.getLodgingByTrip(userId, tripId);
    res.json({
      status: 'success',
      data: lodgings,
    });
  }),

  getLodgingById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const lodgingId = parseId(req.params.id);
    const lodging = await lodgingService.getLodgingById(userId, lodgingId);
    res.json({
      status: 'success',
      data: lodging,
    });
  }),

  updateLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const lodgingId = parseId(req.params.id);
    const data = updateLodgingSchema.parse(req.body);
    const lodging = await lodgingService.updateLodging(userId, lodgingId, data);
    res.json({
      status: 'success',
      data: lodging,
    });
  }),

  deleteLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const lodgingId = parseId(req.params.id);
    const result = await lodgingService.deleteLodging(userId, lodgingId);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  bulkDeleteLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkDeleteLodgingSchema.parse(req.body);
    const result = await lodgingService.bulkDeleteLodging(userId, tripId, data);
    res.json({
      status: 'success',
      data: result,
    });
  }),

  bulkUpdateLodging: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkUpdateLodgingSchema.parse(req.body);
    const result = await lodgingService.bulkUpdateLodging(userId, tripId, data);
    res.json({
      status: 'success',
      data: result,
    });
  }),
};
