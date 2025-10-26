import { Request, Response, NextFunction } from 'express';
import checklistService from '../services/checklist.service';
import {
  CreateChecklistSchema,
  UpdateChecklistSchema,
  UpdateChecklistItemSchema,
  SelectiveChecklistOperationSchema,
} from '../types/checklist.types';
import { z } from 'zod';

class ChecklistController {
  /**
   * GET /api/checklists
   * Get all checklists for the authenticated user
   */
  async getChecklists(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const checklists = await checklistService.getChecklistsByUserId(userId);

      res.json({
        status: 'success',
        data: checklists,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/checklists/:id
   * Get a single checklist by ID
   */
  async getChecklistById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const checklistId = parseInt(req.params.id);

      const checklist = await checklistService.getChecklistById(checklistId, userId);

      res.json({
        status: 'success',
        data: checklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/checklists
   * Create a new checklist
   */
  async createChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const validatedData = CreateChecklistSchema.parse(req.body);

      const checklist = await checklistService.createChecklist(userId, validatedData);

      res.status(201).json({
        status: 'success',
        data: checklist,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * PUT /api/checklists/:id
   * Update a checklist
   */
  async updateChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const checklistId = parseInt(req.params.id);
      const validatedData = UpdateChecklistSchema.parse(req.body);

      const checklist = await checklistService.updateChecklist(checklistId, userId, validatedData);

      res.json({
        status: 'success',
        data: checklist,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * DELETE /api/checklists/:id
   * Delete a checklist
   */
  async deleteChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const checklistId = parseInt(req.params.id);

      await checklistService.deleteChecklist(checklistId, userId);

      res.json({
        status: 'success',
        message: 'Checklist deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/checklists/:id/items
   * Add an item to a checklist
   */
  async addChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const checklistId = parseInt(req.params.id);
      const { name, description, metadata } = req.body;

      if (!name) {
        res.status(400).json({
          status: 'error',
          message: 'Item name is required',
        });
        return;
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/checklists/items/:itemId
   * Update a checklist item
   */
  async updateChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const itemId = parseInt(req.params.itemId);
      const validatedData = UpdateChecklistItemSchema.parse(req.body);

      const item = await checklistService.updateChecklistItem(itemId, userId, validatedData);

      res.json({
        status: 'success',
        data: item,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * DELETE /api/checklists/items/:itemId
   * Delete a checklist item
   */
  async deleteChecklistItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const itemId = parseInt(req.params.itemId);

      await checklistService.deleteChecklistItem(itemId, userId);

      res.json({
        status: 'success',
        message: 'Checklist item deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/checklists/initialize
   * Initialize default checklists for user
   */
  async initializeDefaults(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      await checklistService.initializeDefaultChecklists(userId);

      res.json({
        status: 'success',
        message: 'Default checklists initialized',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/checklists/auto-check
   * Auto-check items based on trip data
   */
  async autoCheckFromTrips(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const result = await checklistService.autoCheckFromTrips(userId);

      res.json({
        status: 'success',
        data: result,
        message: `${result.updated} items automatically checked`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/checklists/defaults
   * Remove all default checklists
   */
  async removeDefaults(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const result = await checklistService.removeDefaultChecklists(userId);

      res.json({
        status: 'success',
        data: result,
        message: `${result.removed} default checklists removed`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/checklists/defaults/restore
   * Restore missing default checklists
   */
  async restoreDefaults(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const result = await checklistService.restoreDefaultChecklists(userId);

      res.json({
        status: 'success',
        data: result,
        message: `${result.restored} default checklists restored`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/checklists/defaults/status
   * Get status of default checklists (which ones exist, which are available)
   */
  async getDefaultsStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const status = await checklistService.getDefaultChecklistsStatus(userId);

      res.json({
        status: 'success',
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/checklists/defaults/add
   * Add specific default checklists
   */
  async addDefaults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const validatedData = SelectiveChecklistOperationSchema.parse(req.body);

      const result = await checklistService.addDefaultChecklists(userId, validatedData.types);

      res.json({
        status: 'success',
        data: result,
        message: `${result.added} default checklists added`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/checklists/defaults/remove
   * Remove specific default checklists by type
   */
  async removeDefaultsByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const validatedData = SelectiveChecklistOperationSchema.parse(req.body);

      const result = await checklistService.removeDefaultChecklistsByType(userId, validatedData.types);

      res.json({
        status: 'success',
        data: result,
        message: `${result.removed} default checklists removed`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  }
}

export default new ChecklistController();
