import { Request, Response } from 'express';
import checklistService from '../services/checklist.service';
import {
  CreateChecklistSchema,
  UpdateChecklistSchema,
  UpdateChecklistItemSchema,
  SelectiveChecklistOperationSchema,
} from '../types/checklist.types';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';
import { parseId } from '../utils/parseId';
import { AppError } from '../utils/errors';

export const checklistController = {
  /**
   * GET /api/checklists
   * Get all checklists for the authenticated user
   * Optional query param: tripId - filter by trip
   */
  getChecklists: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = req.query.tripId
      ? parseId(req.query.tripId as string, 'tripId')
      : undefined;

    const checklists = tripId
      ? await checklistService.getChecklistsByTripId(tripId, userId)
      : await checklistService.getChecklistsByUserId(userId);

    res.json({
      status: 'success',
      data: checklists,
    });
  }),

  /**
   * GET /api/checklists/:id
   * Get a single checklist by ID
   */
  getChecklistById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const checklistId = parseId(req.params.id);

    const checklist = await checklistService.getChecklistById(checklistId, userId);

    res.json({
      status: 'success',
      data: checklist,
    });
  }),

  /**
   * POST /api/checklists
   * Create a new checklist
   */
  createChecklist: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const validatedData = CreateChecklistSchema.parse(req.body);

    const checklist = await checklistService.createChecklist(userId, validatedData);

    res.status(201).json({
      status: 'success',
      data: checklist,
    });
  }),

  /**
   * PUT /api/checklists/:id
   * Update a checklist
   */
  updateChecklist: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const checklistId = parseId(req.params.id);
    const validatedData = UpdateChecklistSchema.parse(req.body);

    const checklist = await checklistService.updateChecklist(checklistId, userId, validatedData);

    res.json({
      status: 'success',
      data: checklist,
    });
  }),

  /**
   * DELETE /api/checklists/:id
   * Delete a checklist
   */
  deleteChecklist: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const checklistId = parseId(req.params.id);

    await checklistService.deleteChecklist(checklistId, userId);

    res.json({
      status: 'success',
      message: 'Checklist deleted successfully',
    });
  }),

  /**
   * POST /api/checklists/:id/items
   * Add an item to a checklist
   */
  addChecklistItem: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const checklistId = parseId(req.params.id);
    const { name, description, metadata } = req.body;

    if (!name) {
      throw new AppError('Item name is required', 400);
    }

    const item = await checklistService.addChecklistItem(checklistId, userId, {
      name,
      description,
      metadata,
    });

    res.status(201).json({
      status: 'success',
      data: item,
    });
  }),

  /**
   * PUT /api/checklists/items/:itemId
   * Update a checklist item
   */
  updateChecklistItem: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const itemId = parseId(req.params.itemId, 'itemId');
    const validatedData = UpdateChecklistItemSchema.parse(req.body);

    const item = await checklistService.updateChecklistItem(itemId, userId, validatedData);

    res.json({
      status: 'success',
      data: item,
    });
  }),

  /**
   * DELETE /api/checklists/items/:itemId
   * Delete a checklist item
   */
  deleteChecklistItem: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const itemId = parseId(req.params.itemId, 'itemId');

    await checklistService.deleteChecklistItem(itemId, userId);

    res.json({
      status: 'success',
      message: 'Checklist item deleted successfully',
    });
  }),

  /**
   * POST /api/checklists/initialize
   * Initialize default checklists for user
   */
  initializeDefaults: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    await checklistService.initializeDefaultChecklists(userId);

    res.json({
      status: 'success',
      message: 'Default checklists initialized',
    });
  }),

  /**
   * POST /api/checklists/auto-check
   * Auto-check items based on trip data
   */
  autoCheckFromTrips: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const result = await checklistService.autoCheckFromTrips(userId);

    res.json({
      status: 'success',
      data: result,
      message: `${result.updated} items automatically checked`,
    });
  }),

  /**
   * DELETE /api/checklists/defaults
   * Remove all default checklists
   */
  removeDefaults: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const result = await checklistService.removeDefaultChecklists(userId);

    res.json({
      status: 'success',
      data: result,
      message: `${result.removed} default checklists removed`,
    });
  }),

  /**
   * POST /api/checklists/defaults/restore
   * Restore missing default checklists
   */
  restoreDefaults: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const result = await checklistService.restoreDefaultChecklists(userId);

    res.json({
      status: 'success',
      data: result,
      message: `${result.restored} default checklists restored`,
    });
  }),

  /**
   * GET /api/checklists/defaults/status
   * Get status of default checklists (which ones exist, which are available)
   */
  getDefaultsStatus: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const status = await checklistService.getDefaultChecklistsStatus(userId);

    res.json({
      status: 'success',
      data: status,
    });
  }),

  /**
   * POST /api/checklists/defaults/add
   * Add specific default checklists
   */
  addDefaults: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const validatedData = SelectiveChecklistOperationSchema.parse(req.body);

    const result = await checklistService.addDefaultChecklists(userId, validatedData.types);

    res.json({
      status: 'success',
      data: result,
      message: `${result.added} default checklists added`,
    });
  }),

  /**
   * POST /api/checklists/defaults/remove
   * Remove specific default checklists by type
   */
  removeDefaultsByType: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const validatedData = SelectiveChecklistOperationSchema.parse(req.body);

    const result = await checklistService.removeDefaultChecklistsByType(userId, validatedData.types);

    res.json({
      status: 'success',
      data: result,
      message: `${result.removed} default checklists removed`,
    });
  }),
};
