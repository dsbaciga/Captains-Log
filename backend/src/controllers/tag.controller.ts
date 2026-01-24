import { Request, Response } from 'express';
import { tagService } from '../services/tag.service';
import { createTagSchema, updateTagSchema, linkTagToTripSchema } from '../types/tag.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

export const tagController = {
  createTag: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const data = createTagSchema.parse(req.body);
    const tag = await tagService.createTag(userId, data);
    res.status(201).json(tag);
  }),

  getTagsByUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tags = await tagService.getTagsByUser(userId);
    res.json(tags);
  }),

  getTagById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tagId = parseId(req.params.id);
    const tag = await tagService.getTagById(userId, tagId);
    res.json(tag);
  }),

  updateTag: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tagId = parseId(req.params.id);
    const data = updateTagSchema.parse(req.body);
    const tag = await tagService.updateTag(userId, tagId, data);
    res.json(tag);
  }),

  deleteTag: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tagId = parseId(req.params.id);
    await tagService.deleteTag(userId, tagId);
    res.status(204).send();
  }),

  linkTagToTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const data = linkTagToTripSchema.parse(req.body);
    const link = await tagService.linkTagToTrip(userId, data);
    res.status(201).json(link);
  }),

  unlinkTagFromTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const tagId = parseId(req.params.tagId, 'tagId');
    await tagService.unlinkTagFromTrip(userId, tripId, tagId);
    res.status(204).send();
  }),

  getTagsByTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const tags = await tagService.getTagsByTrip(userId, tripId);
    res.json(tags);
  }),
};
