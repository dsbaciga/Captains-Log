import axios from 'axios';
import { z } from 'zod';
import config from '../config';
import logger from '../config/logger';
import { isAxiosError } from '../types/prisma-helpers';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// LLM RESPONSE SCHEMA (simple format the LLM outputs)
// =============================================================================

const VALID_LLM_TYPES = ['flight', 'hotel', 'rental_car', 'train', 'bus', 'activity', 'other'] as const;

const llmEntitySchema = z.object({
  type: z.string(),
  summary: z.string().optional().default(''),
  details: z.record(z.unknown()).optional().default({}),
});

const llmResponseSchema = z.object({
  entities: z.array(llmEntitySchema),
});

// =============================================================================
// APP ENTITY TYPES (what the app uses internally)
// =============================================================================

const VALID_ENTITY_TYPES = ['TRANSPORTATION', 'LODGING', 'ACTIVITY', 'LOCATION'] as const;
type EntityType = (typeof VALID_ENTITY_TYPES)[number];

/** Default confidence for LLM-extracted entities (high but not certain) */
const DEFAULT_ENTITY_CONFIDENCE = 0.8;

/** Map LLM simple types to app entity types and sub-types */
const LLM_TYPE_MAP: Record<string, { entityType: EntityType; subType: string }> = {
  flight:     { entityType: 'TRANSPORTATION', subType: 'flight' },
  train:      { entityType: 'TRANSPORTATION', subType: 'train' },
  bus:        { entityType: 'TRANSPORTATION', subType: 'bus' },
  rental_car: { entityType: 'TRANSPORTATION', subType: 'car' },
  ferry:      { entityType: 'TRANSPORTATION', subType: 'ferry' },
  hotel:      { entityType: 'LODGING', subType: 'hotel' },
  hostel:     { entityType: 'LODGING', subType: 'hostel' },
  airbnb:     { entityType: 'LODGING', subType: 'airbnb' },
  resort:     { entityType: 'LODGING', subType: 'resort' },
  activity:   { entityType: 'ACTIVITY', subType: '' },
  other:      { entityType: 'ACTIVITY', subType: '' },
};

interface ParsedEntity {
  entityType: EntityType;
  confidence: number;
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
  private overrides: { baseUrl: string; apiKey: string; model: string } | null = null;

  /**
   * Set LLM config overrides from DB settings.
   */
  setOverrides(creds: { baseUrl: string; apiKey: string; model: string }): void {
    this.overrides = (creds.apiKey && creds.baseUrl) ? creds : null;
  }

  private getLlmConfig(): { baseUrl: string; apiKey: string; model: string; maxTokens: number } {
    if (this.overrides) {
      // Minimum 8192 tokens — thinking models need headroom for reasoning before JSON output
      return { ...this.overrides, maxTokens: Math.max(this.llmConfig.maxTokens, 8192) };
    }
    return { ...this.llmConfig, maxTokens: Math.max(this.llmConfig.maxTokens, 8192) };
  }

  /**
   * Check if the LLM API is configured with required credentials
   */
  isConfigured(): boolean {
    const cfg = this.getLlmConfig();
    return !!(cfg.apiKey && cfg.baseUrl);
  }

  /**
   * Parse an email body and subject using an LLM to extract travel entities
   */
  async parseEmail(emailBody: string, subject: string): Promise<ParseResult> {
    if (!this.isConfigured()) {
      throw new Error('LLM API is not configured. Set LLM_API_KEY and LLM_BASE_URL, or configure in app settings.');
    }

    const systemPrompt = this.buildSystemPrompt();
    // Truncate very long emails — most travel info is in the first portion
    const truncatedBody = emailBody.length > 15000 ? emailBody.substring(0, 15000) : emailBody;
    const userMessage = `Parse this email and return ONLY a JSON object with extracted travel entities. No other text.

Subject: ${subject}

Body:
${truncatedBody}

Remember: respond with ONLY valid JSON like {"entities":[...]}. No explanations.`;

    const rawResponse = await this.callLLM(systemPrompt, userMessage);
    logger.debug(`[EmailParser] Raw LLM response (first 500 chars): ${rawResponse.substring(0, 500)}`);

    const parsed = this.extractJSON(rawResponse);
    const entities = this.validateAndNormalizeParsedEntities(parsed);
    logger.info(`[EmailParser] Parsed ${entities.length} entity(ies) from email "${subject}"`);

    return {
      entities,
      rawResponse,
    };
  }

  /**
   * Build the system prompt that instructs the LLM how to extract travel entities
   */
  buildSystemPrompt(): string {
    return `You are a JSON API. You receive emails and respond with ONLY a JSON object. Never respond with natural language. Never explain or summarize. Your entire output must be valid JSON.

Format: {"entities":[{"type":"flight","summary":"AA 1234 DFW-LAX","details":{...}}]}

Types: flight, hotel, rental_car, train, bus, activity, other
Details: include dates, times, locations, confirmation numbers, costs, flight numbers, names — whatever you find.
Ignore: baggage policies, liability notices, passenger protection regulations, terms and conditions, legal disclaimers. Only extract actual trip/booking details.
No travel info? Return: {"entities":[]}`;
  }

  /**
   * Validate and normalize the raw parsed output from the LLM
   */
  validateAndNormalizeParsedEntities(raw: unknown): ParsedEntity[] {
    const parsed = llmResponseSchema.safeParse(raw);
    if (!parsed.success) {
      logger.warn('LLM response failed schema validation', { errors: parsed.error.issues });
      return [];
    }

    const result: ParsedEntity[] = [];

    for (const entity of parsed.data.entities) {
      const llmType = entity.type.toLowerCase().trim();
      let mapping = LLM_TYPE_MAP[llmType];

      // Fuzzy match: try to find a type that starts with the LLM value or contains it
      if (!mapping) {
        const fuzzyKey = Object.keys(LLM_TYPE_MAP).find(
          (key) => key.startsWith(llmType) || llmType.startsWith(key)
        );
        if (fuzzyKey) {
          mapping = LLM_TYPE_MAP[fuzzyKey];
          logger.info(`[EmailParser] Fuzzy matched LLM type "${entity.type}" to "${fuzzyKey}"`);
        }
      }

      if (!mapping) {
        logger.warn(`[EmailParser] Skipping entity with unknown type: "${entity.type}"`);
        continue;
      }

      const { entityType, subType } = mapping;
      const details = entity.details;
      const warnings: string[] = [];

      // Build the data object by mapping LLM details to app entity fields
      const data: Record<string, unknown> = { ...details };

      // Set the sub-type (flight, hotel, train, etc.)
      if (subType) {
        data.type = subType;
      }

      // Include the summary as notes if no notes field exists
      if (entity.summary && !data.notes) {
        data.notes = entity.summary;
      }

      // Map common LLM detail field names to app field names
      this.normalizeFieldNames(entityType, data);

      result.push({
        entityType,
        confidence: DEFAULT_ENTITY_CONFIDENCE,
        data,
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    }

    return result;
  }

  /**
   * Normalize field names from free-form LLM output to the app's expected field names.
   */
  private normalizeFieldNames(entityType: EntityType, data: Record<string, unknown>): void {
    // Common flight field mappings
    if (entityType === 'TRANSPORTATION') {
      if (data.from && !data.fromLocationName) {
        data.fromLocationName = data.from;
        delete data.from;
      }
      if (data.to && !data.toLocationName) {
        data.toLocationName = data.to;
        delete data.to;
      }
      if (data.airline && !data.carrier) {
        data.carrier = data.airline;
        delete data.airline;
      }
      if (data.flightNumber && !data.vehicleNumber) {
        data.vehicleNumber = data.flightNumber;
        delete data.flightNumber;
      }
      if (data.departure && !data.departureTime) {
        data.departureTime = data.departure;
        delete data.departure;
      }
      if (data.arrival && !data.arrivalTime) {
        data.arrivalTime = data.arrival;
        delete data.arrival;
      }
      if (data.confirmation && !data.confirmationNumber) {
        data.confirmationNumber = data.confirmation;
        delete data.confirmation;
      }
    }

    // Common lodging field mappings
    if (entityType === 'LODGING') {
      if (data.checkIn && !data.checkInDate) {
        data.checkInDate = data.checkIn;
        delete data.checkIn;
      }
      if (data.checkOut && !data.checkOutDate) {
        data.checkOutDate = data.checkOut;
        delete data.checkOut;
      }
      if (data.hotelName && !data.name) {
        data.name = data.hotelName;
        delete data.hotelName;
      }
      if (data.confirmation && !data.confirmationNumber) {
        data.confirmationNumber = data.confirmation;
        delete data.confirmation;
      }
    }

    // Common activity field mappings
    if (entityType === 'ACTIVITY') {
      if (data.activityName && !data.name) {
        data.name = data.activityName;
        delete data.activityName;
      }
      if (data.booking && !data.bookingReference) {
        data.bookingReference = data.booking;
        delete data.booking;
      }
    }
  }

  /**
   * Call the LLM chat completions API with retry on 429 (rate limit)
   */
  private async callLLM(systemPrompt: string, userMessage: string, retries = 1): Promise<string> {
    const cfg = this.getLlmConfig();
    const url = `${cfg.baseUrl}/chat/completions`;

    try {
      const response = await axios.post(
        url,
        {
          model: cfg.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: cfg.maxTokens,
          temperature: 0.1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          timeout: 120000,
        }
      );

      const message = response.data?.choices?.[0]?.message;
      const content = message?.content;
      const reasoning = message?.reasoning;

      if (typeof content === 'string' && content.trim()) {
        return content;
      }

      // For thinking models: reasoning may contain the JSON if content is empty
      if (typeof reasoning === 'string' && reasoning.trim()) {
        logger.info('[EmailParser] Content empty but reasoning present (thinking model). Extracting JSON from reasoning.');
        return reasoning;
      }

      logger.error('[EmailParser] LLM returned empty content and no reasoning', {
        rawResponse: JSON.stringify(response.data).substring(0, 500),
      });
      throw new Error('LLM returned empty or invalid response content');
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 429 && retries > 0) {
        const retryAfterHeader = error.response.headers?.['retry-after'];
        // Default 2s retry if no Retry-After header — conservative for rate-limited APIs
        const retryAfter = parseInt(
          typeof retryAfterHeader === 'string' ? retryAfterHeader : '2',
          10
        );
        const delay = Math.min(retryAfter * 1000, 10000);
        logger.warn(`LLM API rate limited (429). Retrying after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.callLLM(systemPrompt, userMessage, retries - 1);
      }

      if (isAxiosError(error)) {
        const status = error.response?.status ?? 'unknown';
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
        // Ignore and try next fallback
      }
    }

    // Attempt to find a JSON object anywhere in the response text
    const jsonObjectMatch = raw.match(/\{[\s\S]*"entities"\s*:\s*\[[\s\S]*\]/);
    if (jsonObjectMatch?.[0]) {
      // Find the matching closing brace
      const jsonStr = this.extractBalancedJson(jsonObjectMatch[0]);
      if (jsonStr) {
        try {
          return JSON.parse(jsonStr);
        } catch {
          // Ignore and fall through to error
        }
      }
    }

    logger.error('Failed to parse LLM response as JSON', { rawResponse: raw.substring(0, 500) });
    throw new Error('Failed to parse LLM response as JSON');
  }

  /**
   * Extract a balanced JSON object string starting from the first '{'.
   */
  private extractBalancedJson(text: string): string | null {
    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return text.substring(start, i + 1);
        }
      }
    }

    return null;
  }
}

export default new EmailParserService();
