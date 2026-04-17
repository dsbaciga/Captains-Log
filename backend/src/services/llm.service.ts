import axios from 'axios';
import { config } from '../config';
import logger from '../config/logger';

interface LlmOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Thrown when the LLM call itself fails (network, timeout, 4xx/5xx, malformed response).
 * Distinct from "not configured" (returns '') and "empty content" (returns '') so callers
 * can mark jobs as failed rather than silently reporting no results.
 */
export class LlmError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'LlmError';
  }
}

class LlmService {
  isConfigured(): boolean {
    return config.llm.enabled && config.llm.apiKey !== '';
  }

  async chat(
    systemPrompt: string,
    userPrompt: string,
    options: LlmOptions = {}
  ): Promise<string> {
    if (!this.isConfigured()) {
      logger.warn('LLM not configured — AI features disabled. Set LLM_API_KEY to enable.');
      return '';
    }

    try {
      const response = await axios.post(
        `${config.llm.baseUrl}/chat/completions`,
        {
          model: config.llm.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: options.maxTokens ?? config.llm.maxTokens,
          temperature: options.temperature ?? 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${config.llm.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content: unknown = response.data?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        logger.error('LLM request failed', { status, message: error.message });
        throw new LlmError(`LLM request failed: ${error.message}`, status);
      }
      logger.error('LLM request failed', error);
      throw new LlmError(error instanceof Error ? error.message : 'Unknown LLM error');
    }
  }
}

export const llmService = new LlmService();
