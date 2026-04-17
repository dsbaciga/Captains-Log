import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';
import { pdfImportService } from '../services/pdfImport.service';
import {
  acceptPendingEntitySchema,
  updatePendingEntitySchema,
  listPdfImportsQuerySchema,
  listPendingEntitiesQuerySchema,
} from '../types/pdfImport.types';

export const pdfImportController = {
  uploadPdf: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const file = req.file;
    if (!file) throw new Error('No file uploaded');
    const hintTripId = req.body.tripId ? parseInt(req.body.tripId) : undefined;
    const record = await pdfImportService.uploadAndProcess(userId, file, hintTripId);
    res.status(201).json({ status: 'success', data: record });
  }),

  getPdfImports: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { status, limit, offset } = listPdfImportsQuerySchema.parse(req.query);
    const records = await pdfImportService.getPdfImports(userId, status, limit, offset);
    res.json({ status: 'success', data: records });
  }),

  getPdfImportById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    const record = await pdfImportService.getPdfImportById(userId, id);
    res.json({ status: 'success', data: record });
  }),

  getPendingEntities: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const opts = listPendingEntitiesQuerySchema.parse(req.query);
    const entities = await pdfImportService.getPendingEntities(userId, opts);
    res.json({ status: 'success', data: entities });
  }),

  getPendingCount: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const count = await pdfImportService.getPendingCount(userId);
    res.json({ status: 'success', data: { count } });
  }),

  updatePendingEntity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    const input = updatePendingEntitySchema.parse(req.body);
    const updated = await pdfImportService.updatePendingEntity(userId, id, input);
    res.json({ status: 'success', data: updated });
  }),

  acceptPendingEntity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    const { tripId, overrides } = acceptPendingEntitySchema.parse(req.body);
    const result = await pdfImportService.acceptPendingEntity(userId, id, tripId, overrides);
    res.json({ status: 'success', data: result });
  }),

  rejectPendingEntity: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    await pdfImportService.rejectPendingEntity(userId, id);
    res.json({ status: 'success', data: { message: 'Entity rejected' } });
  }),

  reparseImport: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    await pdfImportService.reparseImport(userId, id);
    res.json({ status: 'success', data: { message: 'Reparse started' } });
  }),

  deletePdfImport: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = parseId(req.params.id);
    await pdfImportService.deletePdfImport(userId, id);
    res.json({ status: 'success', data: { message: 'PDF import deleted' } });
  }),
};
