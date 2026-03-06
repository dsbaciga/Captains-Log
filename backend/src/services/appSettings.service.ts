import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import config from '../config';

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

  async updateEmailImportSettings(data: {
    gmailClientId?: string | null;
    gmailClientSecret?: string | null;
    gmailRefreshToken?: string | null;
    gmailInboxEmail?: string | null;
    llmBaseUrl?: string | null;
    llmApiKey?: string | null;
    llmModel?: string | null;
    emailImportEnabled?: boolean;
    emailImportPollInterval?: number;
  }): Promise<void> {
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
}

export const appSettingsService = new AppSettingsService();
export default appSettingsService;
