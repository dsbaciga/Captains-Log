import { Request, Response, NextFunction } from 'express';
import { entityLinkService } from '../services/entityLink.service';
import {
  createEntityLinkSchema,
  bulkCreateEntityLinksSchema,
  deleteEntityLinkSchema,
  bulkLinkPhotosSchema,
  entityTypeEnum,
} from '../types/entityLink.types';

export const entityLinkController = {
  /**
   * Create a single link between two entities
   * POST /api/trips/:tripId/links
   */
  async createLink(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const data = createEntityLinkSchema.parse({ ...req.body, tripId });
      const link = await entityLinkService.createLink(userId, data);
      res.status(201).json(link);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk create links from one source to multiple targets
   * POST /api/trips/:tripId/links/bulk
   */
  async bulkCreateLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const data = bulkCreateEntityLinksSchema.parse({ ...req.body, tripId });
      const result = await entityLinkService.bulkCreateLinks(userId, data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk link multiple photos to a single target
   * POST /api/trips/:tripId/links/photos
   */
  async bulkLinkPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const data = bulkLinkPhotosSchema.parse({ ...req.body, tripId });
      const result = await entityLinkService.bulkLinkPhotos(userId, data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get links from a specific entity
   * GET /api/trips/:tripId/links/from/:entityType/:entityId
   */
  async getLinksFrom(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const sourceType = entityTypeEnum.parse(req.params.entityType);
      const sourceId = parseInt(req.params.entityId);
      const targetType = req.query.targetType
        ? entityTypeEnum.parse(req.query.targetType)
        : undefined;

      const links = await entityLinkService.getLinksFrom(userId, {
        tripId,
        sourceType,
        sourceId,
        targetType,
      });
      res.json(links);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get links to a specific entity
   * GET /api/trips/:tripId/links/to/:entityType/:entityId
   */
  async getLinksTo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const targetType = entityTypeEnum.parse(req.params.entityType);
      const targetId = parseInt(req.params.entityId);
      const sourceType = req.query.sourceType
        ? entityTypeEnum.parse(req.query.sourceType)
        : undefined;

      const links = await entityLinkService.getLinksTo(userId, {
        tripId,
        targetType,
        targetId,
        sourceType,
      });
      res.json(links);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all links for an entity (both directions)
   * GET /api/trips/:tripId/links/entity/:entityType/:entityId
   */
  async getAllLinksForEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const entityType = entityTypeEnum.parse(req.params.entityType);
      const entityId = parseInt(req.params.entityId);

      const result = await entityLinkService.getAllLinksForEntity(
        userId,
        tripId,
        entityType,
        entityId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get photos linked to an entity
   * GET /api/trips/:tripId/links/photos/:entityType/:entityId
   */
  async getPhotosForEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const entityType = entityTypeEnum.parse(req.params.entityType);
      const entityId = parseInt(req.params.entityId);

      const photos = await entityLinkService.getPhotosForEntity(
        userId,
        tripId,
        entityType,
        entityId
      );
      res.json(photos);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get link summary for entire trip
   * GET /api/trips/:tripId/links/summary
   */
  async getTripLinkSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);

      const summaryMap = await entityLinkService.getTripLinkSummary(userId, tripId);

      // Convert Map to object for JSON response
      const summary: Record<string, any> = {};
      summaryMap.forEach((value, key) => {
        summary[key] = value;
      });

      res.json(summary);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a specific link by source/target
   * DELETE /api/trips/:tripId/links
   */
  async deleteLink(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const data = deleteEntityLinkSchema.parse({ ...req.body, tripId });
      await entityLinkService.deleteLink(userId, data);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a link by ID
   * DELETE /api/trips/:tripId/links/:linkId
   */
  async deleteLinkById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const linkId = parseInt(req.params.linkId);
      await entityLinkService.deleteLinkById(userId, tripId, linkId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete all links for an entity
   * DELETE /api/trips/:tripId/links/entity/:entityType/:entityId
   */
  async deleteAllLinksForEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const entityType = entityTypeEnum.parse(req.params.entityType);
      const entityId = parseInt(req.params.entityId);

      const result = await entityLinkService.deleteAllLinksForEntity(
        userId,
        tripId,
        entityType,
        entityId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
