import { Request, Response, NextFunction } from 'express';
import locationService from '../services/location.service';
import { createLocationSchema, updateLocationSchema, createLocationCategorySchema, updateLocationCategorySchema } from '../types/location.types';
import logger from '../config/logger';

export class LocationController {
  async createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const validatedData = createLocationSchema.parse(req.body);
      const location = await locationService.createLocation(req.user.userId, validatedData);

      logger.info(`Location created: ${location.id} by user ${req.user.userId}`);

      res.status(201).json({
        status: 'success',
        data: location,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLocationsByTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const tripId = parseInt(req.params.tripId);
      const locations = await locationService.getLocationsByTrip(req.user.userId, tripId);

      res.status(200).json({
        status: 'success',
        data: locations,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLocationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const locationId = parseInt(req.params.id);
      const location = await locationService.getLocationById(req.user.userId, locationId);

      res.status(200).json({
        status: 'success',
        data: location,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const locationId = parseInt(req.params.id);
      const validatedData = updateLocationSchema.parse(req.body);
      const location = await locationService.updateLocation(req.user.userId, locationId, validatedData);

      logger.info(`Location updated: ${location.id} by user ${req.user.userId}`);

      res.status(200).json({
        status: 'success',
        data: location,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const locationId = parseInt(req.params.id);
      const result = await locationService.deleteLocation(req.user.userId, locationId);

      logger.info(`Location deleted: ${locationId} by user ${req.user.userId}`);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Location Categories
  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const categories = await locationService.getCategories(req.user.userId);

      res.status(200).json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const validatedData = createLocationCategorySchema.parse(req.body);
      const category = await locationService.createCategory(req.user.userId, validatedData);

      res.status(201).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const categoryId = parseInt(req.params.id);
      const validatedData = updateLocationCategorySchema.parse(req.body);
      const category = await locationService.updateCategory(req.user.userId, categoryId, validatedData);

      res.status(200).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const categoryId = parseInt(req.params.id);
      const result = await locationService.deleteCategory(req.user.userId, categoryId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllVisitedLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }

      const locations = await locationService.getAllVisitedLocations(req.user.userId);

      res.status(200).json({
        status: 'success',
        data: locations,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new LocationController();
