import { Request, Response, NextFunction } from 'express';
import { tagService } from '../services/tag.service';
import { createTagSchema, updateTagSchema, linkTagToTripSchema } from '../types/tag.types';
import { requireUserId } from '../utils/controllerHelpers';

export const tagController = {
  async createTag(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const data = createTagSchema.parse(req.body);
      const tag = await tagService.createTag(userId, data);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  },

  async getTagsByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const tags = await tagService.getTagsByUser(userId);
      res.json(tags);
    } catch (error) {
      next(error);
    }
  },

  async getTagById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const tagId = parseInt(req.params.id);
      const tag = await tagService.getTagById(userId, tagId);
      res.json(tag);
    } catch (error) {
      next(error);
    }
  },

  async updateTag(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const tagId = parseInt(req.params.id);
      const data = updateTagSchema.parse(req.body);
      const tag = await tagService.updateTag(userId, tagId, data);
      res.json(tag);
    } catch (error) {
      next(error);
    }
  },

  async deleteTag(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const tagId = parseInt(req.params.id);
      await tagService.deleteTag(userId, tagId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async linkTagToTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const data = linkTagToTripSchema.parse(req.body);
      const link = await tagService.linkTagToTrip(userId, data);
      res.status(201).json(link);
    } catch (error) {
      next(error);
    }
  },

  async unlinkTagFromTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const tripId = parseInt(req.params.tripId);
      const tagId = parseInt(req.params.tagId);
      await tagService.unlinkTagFromTrip(userId, tripId, tagId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getTagsByTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserId(req);
      const tripId = parseInt(req.params.tripId);
      const tags = await tagService.getTagsByTrip(userId, tripId);
      res.json(tags);
    } catch (error) {
      next(error);
    }
  },
};
