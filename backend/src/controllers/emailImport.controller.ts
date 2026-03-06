import { Request, Response } from 'express';
import emailImportService from '../services/emailImport.service';
import {
  acceptPendingEntitySchema,
  updatePendingEntitySchema,
  emailImportsQuerySchema,
  pendingEntitiesQuerySchema,
} from '../types/emailImport.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';
import logger from '../config/logger';

/** Rate limit: track last trigger time per user */
const lastTriggerByUser = new Map<number, number>();

export const emailImportController = {
  /**
   * Get paginated list of email imports
   * GET /api/email-imports
   */
  getEmailImports: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const query = emailImportsQuerySchema.parse(req.query);

    const result = await emailImportService.getEmailImports(userId, query.page, query.limit);

    res.json({
      status: 'success',
      data: result,
    });
  }),

  /**
   * Get email import configuration status
   * GET /api/email-imports/status
   */
  getStatus: asyncHandler(async (req: Request, res: Response) => {
    requireUserId(req);

    const status = await emailImportService.getConfigurationStatus();

    res.json({
      status: 'success',
      data: status,
    });
  }),

  /**
   * Get filtered list of pending entities
   * GET /api/email-imports/pending
   */
  getPendingEntities: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { page, limit, ...filters } = pendingEntitiesQuerySchema.parse(req.query);

    const entities = await emailImportService.getPendingEntities(userId, filters, page, limit);

    res.json({
      status: 'success',
      data: entities,
    });
  }),

  /**
   * Get count of pending entities
   * GET /api/email-imports/pending/count
   */
  getPendingCount: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const count = await emailImportService.getPendingCount(userId);

    res.json({
      status: 'success',
      data: { count },
    });
  }),

  /**
   * Accept a pending entity and create the corresponding trip entity
   * POST /api/email-imports/pending/:id/accept
   */
  acceptPendingEntity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    const body = acceptPendingEntitySchema.parse(req.body);

    if (body.data) {
      const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...safeData } = body.data as Record<string, unknown>;
      body.data = safeData;
    }

    const result = await emailImportService.acceptPendingEntity(userId, id, body);
    logger.info(`Pending entity ${id} accepted by user ${userId}`);

    res.json({
      status: 'success',
      data: result,
    });
  }),

  /**
   * Reject a pending entity
   * POST /api/email-imports/pending/:id/reject
   */
  rejectPendingEntity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);

    await emailImportService.rejectPendingEntity(userId, id);
    logger.info(`Pending entity ${id} rejected by user ${userId}`);

    res.json({
      status: 'success',
      message: 'Entity rejected',
    });
  }),

  /**
   * Update a pending entity's parsed data or matched trip
   * PUT /api/email-imports/pending/:id
   */
  updatePendingEntity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    const body = updatePendingEntitySchema.parse(req.body);

    if (body.parsedData) {
      const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...safeData } = body.parsedData as Record<string, unknown>;
      body.parsedData = safeData;
    }

    const result = await emailImportService.updatePendingEntity(userId, id, body);

    res.json({
      status: 'success',
      data: result,
    });
  }),

  /**
   * Trigger an email poll and process new emails
   * POST /api/email-imports/trigger
   */
  triggerPoll: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const now = Date.now();
    const lastTrigger = lastTriggerByUser.get(userId);
    if (lastTrigger && now - lastTrigger < 60_000) {
      const secondsRemaining = Math.ceil((60_000 - (now - lastTrigger)) / 1000);
      res.status(429).json({
        status: 'error',
        message: `Rate limited. Please wait ${secondsRemaining} seconds before triggering again.`,
      });
      return;
    }

    lastTriggerByUser.set(userId, now);

    // Clean up old entries periodically
    if (lastTriggerByUser.size > 100) {
      const cutoff = Date.now() - 60000;
      for (const [uid, time] of lastTriggerByUser) {
        if (time < cutoff) lastTriggerByUser.delete(uid);
      }
    }

    const result = await emailImportService.pollAndProcessEmails();
    logger.info(`Manual email poll triggered by user ${userId}`);

    res.json({
      status: 'success',
      data: result,
    });
  }),
};
