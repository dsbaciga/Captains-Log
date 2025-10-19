import { Request, Response, NextFunction } from 'express';
import tripService from '../services/trip.service';
import { createTripSchema, updateTripSchema, getTripQuerySchema } from '../types/trip.types';
import { z } from 'zod';
import logger from '../config/logger';

export class TripController {
  async createTrip(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
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

  async getTrips(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
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

  async getTripById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const tripId = parseInt(req.params.id);
      const trip = await tripService.getTripById(req.user.userId, tripId);

      res.status(200).json({
        status: 'success',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTrip(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const tripId = parseInt(req.params.id);
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

  async deleteTrip(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const tripId = parseInt(req.params.id);
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

  async updateCoverPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const tripId = parseInt(req.params.id);
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
}

export default new TripController();
