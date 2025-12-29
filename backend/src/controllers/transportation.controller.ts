import { Request, Response, NextFunction } from 'express';
import transportationService from '../services/transportation.service';
import {
  createTransportationSchema,
  updateTransportationSchema,
} from '../types/transportation.types';

class TransportationController {
  async createTransportation(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createTransportationSchema.parse(req.body);
      const transportation = await transportationService.createTransportation(
        req.user!.userId,
        validatedData
      );

      res.status(201).json(transportation);
    } catch (error) {
      next(error);
    }
  }

  async getTransportationByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseInt(req.params.tripId);
      const transportations = await transportationService.getTransportationByTrip(
        req.user!.userId,
        tripId
      );

      res.json(transportations);
    } catch (error) {
      next(error);
    }
  }

  async getTransportationById(req: Request, res: Response, next: NextFunction) {
    try {
      const transportationId = parseInt(req.params.id);
      const transportation = await transportationService.getTransportationById(
        req.user!.userId,
        transportationId
      );

      res.json(transportation);
    } catch (error) {
      next(error);
    }
  }

  async updateTransportation(req: Request, res: Response, next: NextFunction) {
    try {
      const transportationId = parseInt(req.params.id);
      const validatedData = updateTransportationSchema.parse(req.body);
      const transportation = await transportationService.updateTransportation(
        req.user!.userId,
        transportationId,
        validatedData
      );

      res.json(transportation);
    } catch (error) {
      next(error);
    }
  }

  async deleteTransportation(req: Request, res: Response, next: NextFunction) {
    try {
      const transportationId = parseInt(req.params.id);
      await transportationService.deleteTransportation(
        req.user!.userId,
        transportationId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async recalculateDistances(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = parseInt(req.params.tripId);
      const count = await transportationService.recalculateDistancesForTrip(
        req.user!.userId,
        tripId
      );

      res.json({
        status: 'success',
        message: `Recalculated distances for ${count} transportation records`,
        count,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TransportationController();
