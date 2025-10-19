import { Request, Response, NextFunction } from 'express';
import { companionService } from '../services/companion.service';
import { createCompanionSchema, updateCompanionSchema, linkCompanionToTripSchema } from '../types/companion.types';

export const companionController = {
  async createCompanion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = createCompanionSchema.parse(req.body);
      const companion = await companionService.createCompanion(userId, data);
      res.status(201).json(companion);
    } catch (error) {
      next(error);
    }
  },

  async getCompanionsByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companions = await companionService.getCompanionsByUser(userId);
      res.json(companions);
    } catch (error) {
      next(error);
    }
  },

  async getCompanionById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companionId = parseInt(req.params.id);
      const companion = await companionService.getCompanionById(userId, companionId);
      res.json(companion);
    } catch (error) {
      next(error);
    }
  },

  async updateCompanion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companionId = parseInt(req.params.id);
      const data = updateCompanionSchema.parse(req.body);
      const companion = await companionService.updateCompanion(userId, companionId, data);
      res.json(companion);
    } catch (error) {
      next(error);
    }
  },

  async deleteCompanion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companionId = parseInt(req.params.id);
      await companionService.deleteCompanion(userId, companionId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async linkCompanionToTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = linkCompanionToTripSchema.parse(req.body);
      const link = await companionService.linkCompanionToTrip(userId, data);
      res.status(201).json(link);
    } catch (error) {
      next(error);
    }
  },

  async unlinkCompanionFromTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const companionId = parseInt(req.params.companionId);
      await companionService.unlinkCompanionFromTrip(userId, tripId, companionId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getCompanionsByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const companions = await companionService.getCompanionsByTrip(userId, tripId);
      res.json(companions);
    } catch (error) {
      next(error);
    }
  },
};
