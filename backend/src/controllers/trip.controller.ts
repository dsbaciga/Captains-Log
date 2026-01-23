import { Request, Response, NextFunction } from 'express';
import tripService from '../services/trip.service';
import tripValidatorService from '../services/tripValidator.service';
import { createTripSchema, updateTripSchema, getTripQuerySchema, duplicateTripSchema } from '../types/trip.types';
import { z } from 'zod';
import logger from '../config/logger';
import { parseId } from '../utils/parseId';

export class TripController {
  async createTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const validatedData = createTripSchema.parse(req.body);
      const trip = await tripService.createTrip(req.user.userId, validatedData);

      logger.info(`Trip created: ${trip.id} by user ${req.user.userId}`);

      res.status(201).json({
        status: 'success',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const validatedQuery = getTripQuerySchema.parse(req.query);
      const result = await tripService.getTrips(req.user.userId, validatedQuery);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTripById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const tripId = parseId(req.params.id, 'tripId');
      const trip = await tripService.getTripById(req.user.userId, tripId);

      res.status(200).json({
        status: 'success',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const tripId = parseId(req.params.id, 'tripId');
      const validatedData = updateTripSchema.parse(req.body);
      const trip = await tripService.updateTrip(req.user.userId, tripId, validatedData);

      logger.info(`Trip updated: ${trip.id} by user ${req.user.userId}`);

      res.status(200).json({
        status: 'success',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const tripId = parseId(req.params.id, 'tripId');
      const result = await tripService.deleteTrip(req.user.userId, tripId);

      logger.info(`Trip deleted: ${tripId} by user ${req.user.userId}`);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCoverPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const tripId = parseId(req.params.id, 'tripId');
      const schema = z.object({
        photoId: z.number().nullable(),
      });
      const { photoId } = schema.parse(req.body);

      const trip = await tripService.updateCoverPhoto(req.user.userId, tripId, photoId);

      logger.info(`Cover photo updated for trip ${tripId} by user ${req.user.userId}`);

      res.status(200).json({
        status: 'success',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async validateTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const tripId = parseId(req.params.id, 'tripId');
      const validation = await tripValidatorService.validateTrip(tripId);

      logger.info(`Trip validation performed for trip ${tripId}`);

      res.status(200).json({
        status: 'success',
        data: validation,
      });
    } catch (error) {
      next(error);
    }
  }

  async duplicateTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const tripId = parseId(req.params.id, 'tripId');
      const validatedData = duplicateTripSchema.parse(req.body);
      const trip = await tripService.duplicateTrip(req.user.userId, tripId, validatedData);

      logger.info(`Trip duplicated: ${tripId} -> ${trip.id} by user ${req.user.userId}`);

      res.status(201).json({
        status: 'success',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TripController();
