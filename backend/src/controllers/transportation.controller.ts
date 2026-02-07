import { Request, Response } from 'express';
import { z } from 'zod';
import transportationService from '../services/transportation.service';
import {
  createTransportationSchema,
  updateTransportationSchema,
  bulkDeleteTransportationSchema,
  bulkUpdateTransportationSchema,
} from '../types/transportation.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const transportationController = {
  createTransportation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const data = createTransportationSchema.parse(req.body);
    const transportation = await transportationService.createTransportation(
      userId,
      data
    );
    res.status(201).json({
      status: 'success',
      data: transportation,
    });
  }),

  getAllTransportation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { page, limit } = paginationQuerySchema.parse(req.query);
    const result = await transportationService.getAllTransportation(
      userId,
      { page, limit }
    );
    res.json({
      status: 'success',
      data: {
        items: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }),

  getTransportationByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const transportations = await transportationService.getTransportationByTrip(
      userId,
      tripId
    );
    res.json({
      status: 'success',
      data: transportations,
    });
  }),

  getTransportationById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const transportationId = parseId(req.params.id);
    const transportation = await transportationService.getTransportationById(
      userId,
      transportationId
    );
    res.json({
      status: 'success',
      data: transportation,
    });
  }),

  updateTransportation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const transportationId = parseId(req.params.id);
    const data = updateTransportationSchema.parse(req.body);
    const transportation = await transportationService.updateTransportation(
      userId,
      transportationId,
      data
    );
    res.json({
      status: 'success',
      data: transportation,
    });
  }),

  deleteTransportation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const transportationId = parseId(req.params.id);
    const result = await transportationService.deleteTransportation(userId, transportationId);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  recalculateDistances: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const count = await transportationService.recalculateDistancesForTrip(
      userId,
      tripId
    );
    res.json({
      status: 'success',
      data: {
        message: `Recalculated distances for ${count} transportation records`,
        count,
      },
    });
  }),

  bulkDeleteTransportation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkDeleteTransportationSchema.parse(req.body);
    const result = await transportationService.bulkDeleteTransportation(userId, tripId, data);
    res.json({
      status: 'success',
      data: result,
    });
  }),

  bulkUpdateTransportation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = bulkUpdateTransportationSchema.parse(req.body);
    const result = await transportationService.bulkUpdateTransportation(userId, tripId, data);
    res.json({
      status: 'success',
      data: result,
    });
  }),
};
