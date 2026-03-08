import axios from '../lib/axios';

export interface EmailImport {
  id: number;
  gmailMessageId: string;
  threadId: string | null;
  subject: string | null;
  fromAddress: string | null;
  forwardedBy: string | null;
  userId: number | null;
  status: 'FETCHED' | 'PARSING' | 'PARSED' | 'PARSE_FAILED' | 'NO_ENTITIES' | 'NO_USER';
  errorMessage: string | null;
  processedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { pendingEntities: number };
}

export interface PendingEntity {
  id: number;
  emailImportId: number;
  userId: number;
  entityType: 'TRANSPORTATION' | 'LODGING' | 'ACTIVITY' | 'LOCATION';
  parsedData: Record<string, unknown>;
  confidence: number | null;
  matchedTripId: number | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdEntityId: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  emailImport?: { subject: string | null; fromAddress: string | null };
  matchedTrip?: { id: number; title: string; startDate: string | null; endDate: string | null } | null;
}

export interface PendingEntitiesResponse {
  entities: PendingEntity[];
  total: number;
  page: number;
  totalPages: number;
}

export interface EmailImportStatus {
  gmailConfigured: boolean;
  llmConfigured: boolean;
  enabled: boolean;
  inboxEmail: string;
}

export interface EmailImportConfig {
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

const emailImportService = {
  async getStatus(): Promise<EmailImportStatus> {
    const response = await axios.get('/email-imports/status');
    return response.data;
  },

  async getEmailImports(
    page?: number,
    limit?: number
  ): Promise<{ imports: EmailImport[]; total: number; page: number; totalPages: number }> {
    const response = await axios.get('/email-imports', {
      params: { page, limit },
    });
    const data = response.data;
    return {
      imports: data.imports ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      totalPages: data.totalPages ?? 1,
    };
  },

  async getPendingEntities(
    filters?: { tripId?: number; status?: string; entityType?: string; page?: number; limit?: number }
  ): Promise<PendingEntitiesResponse> {
    const response = await axios.get('/email-imports/pending', {
      params: filters,
    });
    const data = response.data;
    // Handle both paginated response and plain array
    if (Array.isArray(data)) {
      return {
        entities: data,
        total: data.length,
        page: 1,
        totalPages: 1,
      };
    }
    return {
      entities: data.entities ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      totalPages: data.totalPages ?? 1,
    };
  },

  async getPendingCount(): Promise<number> {
    const response = await axios.get('/email-imports/pending/count');
    return response.data.count;
  },

  async acceptPendingEntity(
    id: number,
    options?: { tripId?: number; data?: Record<string, unknown> }
  ): Promise<unknown> {
    const response = await axios.post(`/email-imports/pending/${id}/accept`, options);
    return response.data;
  },

  async rejectPendingEntity(id: number): Promise<void> {
    await axios.post(`/email-imports/pending/${id}/reject`);
  },

  async updatePendingEntity(
    id: number,
    data: { parsedData?: Record<string, unknown>; matchedTripId?: number | null }
  ): Promise<PendingEntity> {
    const response = await axios.put(`/email-imports/pending/${id}`, data);
    return response.data;
  },

  async reparseEmailImport(id: number): Promise<{ parsed: number }> {
    const response = await axios.post(`/email-imports/${id}/reparse`);
    return response.data;
  },

  async triggerPoll(): Promise<{ processed: number; errors: number }> {
    const response = await axios.post('/email-imports/trigger');
    return response.data;
  },

  async getForwardingEmailSettings(): Promise<{ forwardingEmail: string | null }> {
    const response = await axios.get('/users/forwarding-email');
    return response.data;
  },

  async updateForwardingEmail(forwardingEmail: string | null): Promise<unknown> {
    const response = await axios.put('/users/forwarding-email', { forwardingEmail });
    return response.data;
  },

  async getEmailImportConfig(): Promise<EmailImportConfig> {
    const response = await axios.get('/app-settings/email-import');
    return response.data;
  },

  async updateEmailImportConfig(data: Partial<{
    gmailClientId: string | null;
    gmailClientSecret: string | null;
    gmailRefreshToken: string | null;
    gmailInboxEmail: string | null;
    llmBaseUrl: string | null;
    llmApiKey: string | null;
    llmModel: string | null;
    emailImportEnabled: boolean;
    emailImportPollInterval: number;
  }>): Promise<void> {
    await axios.put('/app-settings/email-import', data);
  },

  async testLlmConnection(): Promise<{ message: string }> {
    const response = await axios.post('/app-settings/email-import/test-llm');
    return response.data;
  },

  async testGmailConnection(): Promise<{ message: string }> {
    const response = await axios.post('/app-settings/email-import/test-gmail');
    return response.data;
  },
};

export default emailImportService;
