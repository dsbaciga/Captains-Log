import axios from 'axios';
import config from '../config';
import logger from '../config/logger';
import { isAxiosError } from '../types/prisma-helpers';

// =============================================================================
// TYPES
// =============================================================================

interface ParsedEntity {
  entityType: 'TRANSPORTATION' | 'LODGING' | 'ACTIVITY' | 'LOCATION';
  confidence: number; // 0.0 to 1.0
  data: Record<string, unknown>;
  warnings?: string[];
}

interface ParseResult {
  entities: ParsedEntity[];
  rawResponse: string;
}

// =============================================================================
// SERVICE
// =============================================================================

class EmailParserService {
  private readonly llmConfig = config.emailImport.llm;

  /**
   * Check if the LLM API is configured with required credentials
   */
  isConfigured(): boolean {
    return !!(this.llmConfig.apiKey && this.llmConfig.baseUrl);
  }

  /**
   * Parse an email body and subject using an LLM to extract travel entities
   */
  async parseEmail(emailBody: string, subject: string): Promise<ParseResult> {
    if (!this.isConfigured()) {
      throw new Error('LLM API is not configured. Set LLM_API_KEY and LLM_BASE_URL.');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userMessage = `Subject: ${subject}\n\nBody:\n${emailBody}`;

    const rawResponse = await this.callLLM(systemPrompt, userMessage);

    const parsed = this.extractJSON(rawResponse);
    const entities = this.validateAndNormalizeParsedEntities(parsed);

    return {
      entities,
      rawResponse,
    };
  }

  /**
   * Build the system prompt that instructs the LLM how to extract travel entities
   */
  buildSystemPrompt(): string {
    return `You are a travel email parser. Your job is to extract structured travel information from emails (booking confirmations, itineraries, receipts, etc.) and return it as JSON.

Return a JSON object with a single key "entities" containing an array of extracted entities. Each entity has:
- "entityType": one of "TRANSPORTATION", "LODGING", "ACTIVITY", "LOCATION"
- "confidence": a number from 0.0 to 1.0
- "data": an object with fields specific to the entity type

Field schemas per entity type:

TRANSPORTATION:
- type (required, must be one of: flight, train, bus, car, ferry, bicycle, walk, other)
- fromLocationName (string)
- toLocationName (string)
- departureTime (ISO 8601 datetime string)
- arrivalTime (ISO 8601 datetime string)
- startTimezone (IANA timezone, e.g. "America/New_York")
- endTimezone (IANA timezone)
- carrier (string, e.g. airline or train company name)
- vehicleNumber (string, e.g. flight number "UA 1234")
- confirmationNumber (string)
- cost (number)
- currency (string, e.g. "USD")
- notes (string)

LODGING:
- type (required, must be one of: hotel, hostel, airbnb, vacation_rental, camping, resort, motel, bed_and_breakfast, apartment, friends_family, other)
- name (required, string, name of the hotel/property)
- address (string)
- checkInDate (ISO 8601 date or datetime string)
- checkOutDate (ISO 8601 date or datetime string)
- timezone (IANA timezone)
- confirmationNumber (string)
- cost (number)
- currency (string)
- bookingUrl (string)
- notes (string)

ACTIVITY:
- name (required, string)
- description (string)
- category (string)
- startTime (ISO 8601 datetime string)
- endTime (ISO 8601 datetime string)
- timezone (IANA timezone)
- cost (number)
- currency (string)
- bookingReference (string)
- bookingUrl (string)
- notes (string)

LOCATION:
- name (required, string)
- address (string)
- visitDatetime (ISO 8601 datetime string)
- notes (string)

Rules:
1. Extract ALL entities found in the email. A round-trip flight should produce 2 TRANSPORTATION entities (outbound and return).
2. Assign confidence scores: 1.0 for explicitly stated information, 0.8 for reasonably inferred information, 0.5 for uncertain/ambiguous information.
3. Do NOT hallucinate or invent information that is not present or reasonably inferable from the email.
4. If the email is not travel-related or contains no extractable travel entities, return {"entities": []}.
5. Output ONLY valid JSON. No explanations, no markdown, no extra text.`;
  }

  /**
   * Validate and normalize the raw parsed output from the LLM
   */
  validateAndNormalizeParsedEntities(raw: unknown): ParsedEntity[] {
    if (!raw || typeof raw !== 'object') {
      logger.warn('LLM returned non-object response');
      return [];
    }

    const obj = raw as Record<string, unknown>;
    const entities = obj.entities;

    if (!Array.isArray(entities)) {
      logger.warn('LLM response missing "entities" array');
      return [];
    }

    const validEntityTypes = new Set(['TRANSPORTATION', 'LODGING', 'ACTIVITY', 'LOCATION']);
    const result: ParsedEntity[] = [];

    for (const entity of entities) {
      if (!entity || typeof entity !== 'object') {
        logger.warn('Skipping non-object entity in LLM response');
        continue;
      }

      const e = entity as Record<string, unknown>;

      // Validate entityType
      const entityType = typeof e.entityType === 'string' ? e.entityType.toUpperCase() : '';
      if (!validEntityTypes.has(entityType)) {
        logger.warn(`Skipping entity with invalid entityType: ${e.entityType}`);
        continue;
      }

      // Validate confidence
      let confidence = typeof e.confidence === 'number' ? e.confidence : 0.5;
      confidence = Math.max(0, Math.min(1, confidence));

      // Validate data
      if (!e.data || typeof e.data !== 'object') {
        logger.warn(`Skipping entity with missing or invalid data field`);
        continue;
      }

      const data = { ...e.data } as Record<string, unknown>;
      const warnings: string[] = [];

      // Normalize type fields to lowercase
      if (typeof data.type === 'string') {
        data.type = data.type.toLowerCase();
      }

      // Add warnings for missing key fields per entity type
      switch (entityType) {
        case 'TRANSPORTATION':
          if (!data.type) {
            warnings.push('Missing required field: type');
          }
          break;

        case 'LODGING':
          if (!data.name) {
            warnings.push('Missing required field: name');
          }
          if (!data.type) {
            warnings.push('Missing required field: type');
          }
          if (!data.checkInDate) {
            warnings.push('Missing field: checkInDate');
          }
          if (!data.checkOutDate) {
            warnings.push('Missing field: checkOutDate');
          }
          break;

        case 'ACTIVITY':
          if (!data.name) {
            warnings.push('Missing required field: name');
          }
          break;

        case 'LOCATION':
          if (!data.name) {
            warnings.push('Missing required field: name');
          }
          break;
      }

      result.push({
        entityType: entityType as ParsedEntity['entityType'],
        confidence,
        data,
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    }

    return result;
  }

  /**
   * Call the LLM chat completions API with retry on 429 (rate limit)
   */
  private async callLLM(systemPrompt: string, userMessage: string, retries = 1): Promise<string> {
    const url = `${this.llmConfig.baseUrl}/chat/completions`;

    try {
      const response = await axios.post(
        url,
        {
          model: this.llmConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: this.llmConfig.maxTokens,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.llmConfig.apiKey}`,
          },
          timeout: 60000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('LLM returned empty or invalid response content');
      }

      return content;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 429 && retries > 0) {
        const retryAfter = parseInt(
          (error.response.headers?.['retry-after'] as string) || '2',
          10
        );
        const delay = Math.min(retryAfter * 1000, 10000);
        logger.warn(`LLM API rate limited (429). Retrying after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.callLLM(systemPrompt, userMessage, retries - 1);
      }

      if (isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const message = error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message;
        logger.error(`LLM API request failed (status: ${status}): ${message}`);
        throw new Error(`LLM API request failed with status ${status}`);
      }

      throw error;
    }
  }

  /**
   * Extract JSON from the LLM response string.
   * Tries direct JSON.parse first, then falls back to extracting from markdown code fences.
   */
  private extractJSON(raw: string): unknown {
    // Attempt direct parse
    try {
      return JSON.parse(raw);
    } catch {
      // Ignore and try fallback
    }

    // Attempt extraction from markdown code fences (```json ... ``` or ``` ... ```)
    const codeFenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeFenceMatch?.[1]) {
      try {
        return JSON.parse(codeFenceMatch[1]);
      } catch {
        // Ignore and fall through to error
      }
    }

    logger.error('Failed to parse LLM response as JSON', { rawResponse: raw.substring(0, 500) });
    throw new Error('Failed to parse LLM response as JSON');
  }
}

export default new EmailParserService();
