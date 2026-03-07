import { Prisma } from '@prisma/client';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import prisma from '../config/database';
import config from '../config';
import logger from '../config/logger';
import gmailService from './gmail.service';

export interface EmailImportSettingsResponse {
  gmailClientId: string | null;
  gmailClientSecretSet: boolean;
  gmailRefreshTokenSet: boolean;
  gmailInboxEmail: string | null;
  llmBaseUrl: string | null;
  llmApiKeySet: boolean;
  llmModel: string | null;
  emailImportEnabled: boolean;
  emailImportPollInterval: number;
}

export interface LlmTestResult {
  success: boolean;
  message: string;
}

const llmChatResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().nullable().optional(),
      reasoning: z.string().nullable().optional(),
    }).optional(),
  })).optional(),
}).passthrough();

const llmErrorResponseSchema = z.object({
  error: z.object({
    message: z.string().optional(),
  }).optional(),
}).passthrough();

export interface EmailImportSettingsUpdate {
  gmailClientId?: string | null;
  gmailClientSecret?: string | null;
  gmailRefreshToken?: string | null;
  gmailInboxEmail?: string | null;
  llmBaseUrl?: string | null;
  llmApiKey?: string | null;
  llmModel?: string | null;
  emailImportEnabled?: boolean;
  emailImportPollInterval?: number;
}

export interface RawEmailImportSettings {
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRefreshToken: string;
  gmailInboxEmail: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  emailImportEnabled: boolean;
  emailImportPollInterval: number;
}

class AppSettingsService {
  private async getOrCreate() {
    const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return prisma.appSettings.create({ data: { id: 1 } });
  }

  async getEmailImportSettings(): Promise<EmailImportSettingsResponse> {
    const row = await this.getOrCreate();
    return {
      gmailClientId: row.gmailClientId ?? null,
      gmailClientSecretSet: !!(row.gmailClientSecret || config.emailImport.gmail.clientSecret),
      gmailRefreshTokenSet: !!(row.gmailRefreshToken || config.emailImport.gmail.refreshToken),
      gmailInboxEmail: row.gmailInboxEmail ?? config.emailImport.gmail.inboxEmail ?? null,
      llmBaseUrl: row.llmBaseUrl ?? config.emailImport.llm.baseUrl ?? null,
      llmApiKeySet: !!(row.llmApiKey || config.emailImport.llm.apiKey),
      llmModel: row.llmModel ?? config.emailImport.llm.model ?? null,
      emailImportEnabled: row.emailImportEnabled,
      emailImportPollInterval: row.emailImportPollInterval,
    };
  }

  async getRawEmailImportSettings(): Promise<RawEmailImportSettings> {
    const row = await this.getOrCreate();
    // DB takes priority over env vars
    return {
      gmailClientId: row.gmailClientId ?? config.emailImport.gmail.clientId ?? '',
      gmailClientSecret: row.gmailClientSecret ?? config.emailImport.gmail.clientSecret ?? '',
      gmailRefreshToken: row.gmailRefreshToken ?? config.emailImport.gmail.refreshToken ?? '',
      gmailInboxEmail: row.gmailInboxEmail ?? config.emailImport.gmail.inboxEmail ?? '',
      llmBaseUrl: row.llmBaseUrl ?? config.emailImport.llm.baseUrl ?? '',
      llmApiKey: row.llmApiKey ?? config.emailImport.llm.apiKey ?? '',
      llmModel: row.llmModel ?? config.emailImport.llm.model ?? '',
      emailImportEnabled: row.emailImportEnabled,
      emailImportPollInterval: row.emailImportPollInterval,
    };
  }

  async updateEmailImportSettings(data: EmailImportSettingsUpdate): Promise<void> {
    // Build update object - only include fields that were explicitly provided
    const updateData: Prisma.AppSettingsUncheckedUpdateInput = {};
    if (data.gmailClientId !== undefined) updateData.gmailClientId = data.gmailClientId;
    if (data.gmailClientSecret !== undefined) updateData.gmailClientSecret = data.gmailClientSecret;
    if (data.gmailRefreshToken !== undefined) updateData.gmailRefreshToken = data.gmailRefreshToken;
    if (data.gmailInboxEmail !== undefined) updateData.gmailInboxEmail = data.gmailInboxEmail;
    if (data.llmBaseUrl !== undefined) updateData.llmBaseUrl = data.llmBaseUrl;
    if (data.llmApiKey !== undefined) updateData.llmApiKey = data.llmApiKey;
    if (data.llmModel !== undefined) updateData.llmModel = data.llmModel;
    if (data.emailImportEnabled !== undefined) updateData.emailImportEnabled = data.emailImportEnabled;
    if (data.emailImportPollInterval !== undefined) updateData.emailImportPollInterval = data.emailImportPollInterval;

    // For create, we need plain values (not Prisma field update operations)
    const createData: Prisma.AppSettingsUncheckedCreateInput = { id: 1 };
    if (data.gmailClientId !== undefined) createData.gmailClientId = data.gmailClientId;
    if (data.gmailClientSecret !== undefined) createData.gmailClientSecret = data.gmailClientSecret;
    if (data.gmailRefreshToken !== undefined) createData.gmailRefreshToken = data.gmailRefreshToken;
    if (data.gmailInboxEmail !== undefined) createData.gmailInboxEmail = data.gmailInboxEmail;
    if (data.llmBaseUrl !== undefined) createData.llmBaseUrl = data.llmBaseUrl;
    if (data.llmApiKey !== undefined) createData.llmApiKey = data.llmApiKey;
    if (data.llmModel !== undefined) createData.llmModel = data.llmModel;
    if (data.emailImportEnabled !== undefined) createData.emailImportEnabled = data.emailImportEnabled;
    if (data.emailImportPollInterval !== undefined) createData.emailImportPollInterval = data.emailImportPollInterval;

    await prisma.appSettings.upsert({
      where: { id: 1 },
      create: createData,
      update: updateData,
    });
  }

  async testGmailConnection(): Promise<LlmTestResult> {
    const raw = await this.getRawEmailImportSettings();

    // Apply overrides so gmailService uses DB credentials
    gmailService.setOverrides({
      clientId: raw.gmailClientId,
      clientSecret: raw.gmailClientSecret,
      refreshToken: raw.gmailRefreshToken,
    });

    if (!gmailService.isConfigured()) {
      return { success: false, message: 'Gmail credentials are not configured. Set Client ID, Client Secret, and Refresh Token.' };
    }

    try {
      const { gmail } = gmailService.getClient();
      // Try listing 1 message to verify OAuth credentials work
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
      });
      const total = response.data.resultSizeEstimate ?? 0;
      logger.info(`Gmail test connection successful. Messages in inbox: ~${total}`);
      return { success: true, message: `Gmail connection successful. Inbox has ~${total} messages.` };
    } catch (err: unknown) {
      let detail = 'Connection failed';
      if (err instanceof Error) {
        detail = err.message;
      }
      logger.warn(`Gmail test connection failed: ${detail}`);
      return { success: false, message: `Gmail connection failed: ${detail}` };
    }
  }

  async testLlmConnection(): Promise<LlmTestResult> {
    const raw = await this.getRawEmailImportSettings();
    const { llmBaseUrl: baseUrl, llmApiKey: apiKey, llmModel: model } = raw;

    if (!apiKey) {
      return { success: false, message: 'LLM API key is not configured' };
    }

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model,
          messages: [{ role: 'user', content: 'Respond with exactly the word "hello".' }],
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );
      logger.debug('LLM test raw response:', JSON.stringify(response.data));
      const parsed = llmChatResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.warn('LLM test returned unexpected response shape:', JSON.stringify(response.data));
        return { success: false, message: 'LLM returned an unexpected response format.' };
      }
      const message = parsed.data.choices?.[0]?.message;
      const reply = message?.content?.trim();
      const hasReasoning = !!(message?.reasoning);
      if (!reply && !hasReasoning) {
        logger.warn('LLM test returned empty content. Raw response:', JSON.stringify(response.data));
        return { success: false, message: 'LLM returned an empty response. Check your model name and API configuration.' };
      }
      const displayReply = reply ? reply : '(thinking model — reasoning received)';
      logger.info(`LLM test connection successful: ${displayReply}`);
      return { success: true, message: `LLM connection successful. Response: "${displayReply}"` };
    } catch (err: unknown) {
      let detail = 'Connection failed';
      if (err instanceof AxiosError) {
        const errParsed = llmErrorResponseSchema.safeParse(err.response?.data);
        detail = errParsed.success ? (errParsed.data.error?.message ?? err.message) : err.message;
      } else if (err instanceof Error) {
        detail = err.message;
      }
      logger.warn(`LLM test connection failed: ${detail}`);
      return { success: false, message: `LLM connection failed: ${detail}` };
    }
  }
}

export const appSettingsService = new AppSettingsService();
export default appSettingsService;
