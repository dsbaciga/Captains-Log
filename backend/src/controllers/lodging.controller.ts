import { Request, Response, NextFunction } from 'express';
import lodgingService from '../services/lodging.service';
import {
  createLodgingSchema,
  updateLodgingSchema,
} from '../types/lodging.types';

class LodgingController {
  async createLodging(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createLodgingSchema.parse(req.body);
      const lodging = await lodgingService.createLodging(
        req.user!.userId,
        validatedData
      );

      res.status(201).json(lodging);
    } catch (error) {
      next(error);
    }
  }

  async getLodgingByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseInt(req.params.tripId);
      const lodgings = await lodgingService.getLodgingByTrip(
        req.user!.userId,
        tripId
      );

      res.json(lodgings);
    } catch (error) {
      next(error);
    }
  }

  async getLodgingById(req: Request, res: Response, next: NextFunction) {
    try {
      const lodgingId = parseInt(req.params.id);
      const lodging = await lodgingService.getLodgingById(
        req.user!.userId,
        lodgingId
      );

      res.json(lodging);
    } catch (error) {
      next(error);
    }
  }

  async updateLodging(req: Request, res: Response, next: NextFunction) {
    try {
      const lodgingId = parseInt(req.params.id);
      const validatedData = updateLodgingSchema.parse(req.body);
      const lodging = await lodgingService.updateLodging(
        req.user!.userId,
        lodgingId,
        validatedData
      );

      res.json(lodging);
    } catch (error) {
      next(error);
    }
  }

  async deleteLodging(req: Request, res: Response, next: NextFunction) {
    try {
      const lodgingId = parseInt(req.params.id);
      await lodgingService.deleteLodging(req.user!.userId, lodgingId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new LodgingController();
