import { Request, Response } from 'express';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';
import appSettingsService from '../services/appSettings.service';
import logger from '../config/logger';

interface LlmChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface LlmErrorResponse {
  error?: { message?: string };
}

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
    const raw = await appSettingsService.getRawEmailImportSettings();
    const baseUrl = raw.llmBaseUrl;
    const apiKey = raw.llmApiKey;
    const model = raw.llmModel;

    if (!apiKey) {
      res.status(400).json({ status: 'error', message: 'LLM API key is not configured' });
      return;
    }

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model,
          messages: [{ role: 'user', content: 'Say "ok" in one word.' }],
          max_tokens: 5,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      const llmData = response.data as LlmChatResponse;
      const reply = llmData.choices?.[0]?.message?.content;
      if (!reply) {
        res.status(400).json({ status: 'error', message: 'LLM returned an empty response' });
        return;
      }
      logger.info(`LLM test connection successful: ${reply}`);
      res.json({ status: 'success', message: `LLM connection successful. Response: "${reply}"` });
    } catch (err: unknown) {
      let detail = 'Connection failed';
      if (err instanceof AxiosError) {
        const errData = err.response?.data as LlmErrorResponse | undefined;
        detail = errData?.error?.message || err.message;
      } else if (err instanceof Error) {
        detail = err.message;
      }
      logger.warn(`LLM test connection failed: ${detail}`);
      res.status(400).json({ status: 'error', message: `LLM connection failed: ${detail}` });
    }
  }),
};
