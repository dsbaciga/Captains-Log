import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';
import appSettingsService from '../services/appSettings.service';

const updateEmailImportSettingsSchema = z.object({
  gmailClientId: z.string().nullable().optional(),
  gmailClientSecret: z.string().nullable().optional(),
  gmailRefreshToken: z.string().nullable().optional(),
  gmailInboxEmail: z.string().email().nullable().optional(),
  llmBaseUrl: z.string().url().nullable().optional(),
  llmApiKey: z.string().nullable().optional(),
  llmModel: z.string().nullable().optional(),
  emailImportEnabled: z.boolean().optional(),
  emailImportPollInterval: z.coerce.number().int().min(1).max(60).optional(),
});

export const appSettingsController = {
  getEmailImportSettings: asyncHandler(async (req: Request, res: Response) => {
    requireUserId(req);
    const settings = await appSettingsService.getEmailImportSettings();
    res.json({ status: 'success', data: settings });
  }),

  updateEmailImportSettings: asyncHandler(async (req: Request, res: Response) => {
    requireUserId(req);
    const data = updateEmailImportSettingsSchema.parse(req.body);
    await appSettingsService.updateEmailImportSettings(data);
    res.json({ status: 'success', message: 'Email import settings updated' });
  }),

  testLlmConnection: asyncHandler(async (req: Request, res: Response) => {
    requireUserId(req);
    const result = await appSettingsService.testLlmConnection();
    if (!result.success) {
      res.status(400).json({ status: 'error', message: result.message });
      return;
    }
    res.json({ status: 'success', message: result.message });
  }),

  testGmailConnection: asyncHandler(async (req: Request, res: Response) => {
    requireUserId(req);
    const result = await appSettingsService.testGmailConnection();
    if (!result.success) {
      res.status(400).json({ status: 'error', message: result.message });
      return;
    }
    res.json({ status: 'success', message: result.message });
  }),
};
