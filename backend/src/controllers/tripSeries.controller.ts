import { Request, Response } from 'express';
import tripSeriesService from '../services/tripSeries.service';
import {
  createTripSeriesSchema,
  updateTripSeriesSchema,
  addTripToSeriesSchema,
  reorderTripsInSeriesSchema,
} from '../types/tripSeries.types';
import logger from '../config/logger';
import { parseId } from '../utils/parseId';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';

export const tripSeriesController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const validatedData = createTripSeriesSchema.parse(req.body);
    const series = await tripSeriesService.create(userId, validatedData);

    logger.info(`Trip series created: ${series.id} by user ${userId}`);

    res.status(201).json({
      status: 'success',
      data: series,
    });
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const seriesList = await tripSeriesService.getAll(userId);

    res.status(200).json({
      status: 'success',
      data: seriesList,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const seriesId = parseId(req.params.id, 'seriesId');
    const series = await tripSeriesService.getById(userId, seriesId);

    res.status(200).json({
      status: 'success',
      data: series,
    });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const seriesId = parseId(req.params.id, 'seriesId');
    const validatedData = updateTripSeriesSchema.parse(req.body);
    const series = await tripSeriesService.update(userId, seriesId, validatedData);

    logger.info(`Trip series updated: ${seriesId} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      data: series,
    });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const seriesId = parseId(req.params.id, 'seriesId');
    const result = await tripSeriesService.delete(userId, seriesId);

    logger.info(`Trip series deleted: ${seriesId} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  addTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const seriesId = parseId(req.params.id, 'seriesId');
    const { tripId } = addTripToSeriesSchema.parse(req.body);
    const trip = await tripSeriesService.addTrip(userId, seriesId, tripId);

    logger.info(`Trip ${tripId} added to series ${seriesId} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      data: trip,
    });
  }),

  removeTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const seriesId = parseId(req.params.id, 'seriesId');
    const tripId = parseId(req.params.tripId, 'tripId');
    const result = await tripSeriesService.removeTrip(userId, seriesId, tripId);

    logger.info(`Trip ${tripId} removed from series ${seriesId} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  reorderTrips: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const seriesId = parseId(req.params.id, 'seriesId');
    const { tripIds } = reorderTripsInSeriesSchema.parse(req.body);
    const result = await tripSeriesService.reorderTrips(userId, seriesId, tripIds);

    logger.info(`Trips reordered in series ${seriesId} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),
};
