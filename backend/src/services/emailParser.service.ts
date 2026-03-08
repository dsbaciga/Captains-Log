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
  // Transportation
  flight:     { entityType: 'TRANSPORTATION', subType: 'flight' },
  train:      { entityType: 'TRANSPORTATION', subType: 'train' },
  bus:        { entityType: 'TRANSPORTATION', subType: 'bus' },
  rental_car: { entityType: 'TRANSPORTATION', subType: 'car' },
  car_rental: { entityType: 'TRANSPORTATION', subType: 'car' },
  car:        { entityType: 'TRANSPORTATION', subType: 'car' },
  rental:     { entityType: 'TRANSPORTATION', subType: 'car' },
  ferry:      { entityType: 'TRANSPORTATION', subType: 'ferry' },
  cruise:     { entityType: 'TRANSPORTATION', subType: 'ferry' },
  taxi:       { entityType: 'TRANSPORTATION', subType: 'car' },
  shuttle:    { entityType: 'TRANSPORTATION', subType: 'bus' },
  transfer:   { entityType: 'TRANSPORTATION', subType: 'car' },
  transportation: { entityType: 'TRANSPORTATION', subType: '' },
  // Lodging
  hotel:      { entityType: 'LODGING', subType: 'hotel' },
  hostel:     { entityType: 'LODGING', subType: 'hostel' },
  airbnb:     { entityType: 'LODGING', subType: 'airbnb' },
  resort:     { entityType: 'LODGING', subType: 'resort' },
  accommodation: { entityType: 'LODGING', subType: 'hotel' },
  lodging:    { entityType: 'LODGING', subType: 'hotel' },
  // Activity / Other
  activity:   { entityType: 'ACTIVITY', subType: '' },
  tour:       { entityType: 'ACTIVITY', subType: '' },
  event:      { entityType: 'ACTIVITY', subType: '' },
  excursion:  { entityType: 'ACTIVITY', subType: '' },
  reservation: { entityType: 'ACTIVITY', subType: '' },
  booking:    { entityType: 'ACTIVITY', subType: '' },
  other:      { entityType: 'ACTIVITY', subType: '' },
};

/** Types that should be silently ignored (not real travel entities) */
const IGNORED_LLM_TYPES = new Set([
  'organization', 'org', 'company', 'person', 'contact', 'email',
  'phone', 'website', 'url', 'policy', 'insurance', 'payment',
  'tip', 'tips', 'note', 'notes', 'disclaimer', 'terms',
  'address', 'location', 'place',
]);

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
      return { ...this.overrides, maxTokens: this.llmConfig.maxTokens };
    }
    return { ...this.llmConfig };
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
    const cleanedBody = this.cleanEmailBody(emailBody);
    logger.debug(`[EmailParser] Email body size: ${emailBody.length} -> cleaned: ${cleanedBody.length}`);
    const userMessage = `Subject: ${subject}

${cleanedBody}`;

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
    return `You are a travel email parser. You read emails and output JSON.

CRITICAL: Your response must be ONLY a JSON object. No text before or after. No markdown. No explanations.

## YOUR TASK

Read the email. Find travel bookings (flights, hotels, car rentals, trains, buses, activities). Extract the details into structured JSON.

## OUTPUT FORMAT

You must respond with exactly this JSON structure:

{"entities":[{"type":"TYPE","summary":"SHORT DESCRIPTION","details":{FIELDS}}]}

If the email has no travel bookings, respond with exactly:

{"entities":[]}

## ALLOWED TYPES

Use ONLY these values for "type":
- "flight" — for airplane bookings
- "hotel" — for hotel, hostel, resort, vacation rental, Airbnb bookings
- "rental_car" — for car rental bookings
- "train" — for train bookings
- "bus" — for bus bookings
- "activity" — for tours, events, excursions, restaurant reservations
- "other" — for any other travel booking

Do NOT use any other type value. Do NOT use "lodging", "accommodation", "car", "transfer", or "transportation".

## FIELDS BY TYPE

For "flight":
{"flightNumber":"XX 1234","airline":"Airline Name","from":"AIRPORT_CODE","to":"AIRPORT_CODE","departure":"YYYY-MM-DDTHH:MM","arrival":"YYYY-MM-DDTHH:MM","confirmationNumber":"CODE","cost":"$0.00","seatClass":"economy"}

For "hotel":
{"hotelName":"Hotel Name","checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","confirmationNumber":"CODE","cost":"$0.00","address":"Full Address","roomType":"room type"}

For "rental_car":
{"confirmationNumber":"CODE","pickupDate":"YYYY-MM-DD","pickupTime":"HH:MM","dropoffDate":"YYYY-MM-DD","dropoffTime":"HH:MM","pickupLocation":"Location Name","dropoffLocation":"Location Name","carType":"Car Model","transmission":"Automatic","totalCost":"$0.00","company":"Company Name"}

For "train" or "bus":
{"from":"Station/City","to":"Station/City","departure":"YYYY-MM-DDTHH:MM","arrival":"YYYY-MM-DDTHH:MM","confirmationNumber":"CODE","cost":"$0.00","operator":"Company Name","seatClass":"class"}

For "activity":
{"name":"Activity Name","date":"YYYY-MM-DD","time":"HH:MM","location":"Location Name","confirmationNumber":"CODE","cost":"$0.00"}

## RULES

1. ONE entity per booking. If the email has 2 separate flights, return 2 entities.
2. Use the EXACT field names shown above. Use camelCase.
3. Dates must be YYYY-MM-DD format. Times must be HH:MM (24-hour) format.
4. Include the currency symbol with costs (e.g., "$350.00", "€200.00").
5. The "summary" should be a short one-line description, e.g., "AA 1234 DFW-LAX Jun 15" or "Marriott Downtown Jun 15-18".
6. Only include fields where you found data. Do not guess or make up values.
7. The email may contain raw HTML with <table>, <tr>, <td> tags. Read through the HTML to find the booking data.

## IGNORE THESE

Skip and do not extract: legal text, terms and conditions, privacy policies, insurance offers, travel tips, baggage rules, marketing promotions, loyalty program ads, unsubscribe links.

## EXAMPLES

Input email subject: "Your Flight Confirmation - American Airlines"
Correct output:
{"entities":[{"type":"flight","summary":"AA 587 JFK-LAX Mar 20","details":{"flightNumber":"AA 587","airline":"American Airlines","from":"JFK","to":"LAX","departure":"2026-03-20T14:30","arrival":"2026-03-20T17:45","confirmationNumber":"XHGT42","cost":"$312.00","seatClass":"economy"}}]}

Input email subject: "Booking Confirmation - Hilton Garden Inn"
Correct output:
{"entities":[{"type":"hotel","summary":"Hilton Garden Inn Downtown 2 nights Mar 20-22","details":{"hotelName":"Hilton Garden Inn Downtown","checkIn":"2026-03-20","checkOut":"2026-03-22","confirmationNumber":"934811","cost":"$289.00","address":"123 Main Street, Los Angeles, CA 90012","roomType":"King Standard"}}]}

Input email subject: "Your Enterprise Reservation"
Correct output:
{"entities":[{"type":"rental_car","summary":"Enterprise #HJ4921 LAX Mar 20-25","details":{"confirmationNumber":"HJ4921","pickupDate":"2026-03-20","pickupTime":"18:00","dropoffDate":"2026-03-25","dropoffTime":"10:00","pickupLocation":"Los Angeles Airport, LAX","dropoffLocation":"Los Angeles Airport, LAX","carType":"Toyota Camry or similar","transmission":"Automatic","totalCost":"$245.00","company":"Enterprise"}}]}

Input email subject: "Weekly Newsletter from TravelBlog"
Correct output:
{"entities":[]}

Remember: Output ONLY valid JSON. No other text.`;
  }

  /**
   * Clean email body for LLM parsing.
   * Strips unnecessary HTML bloat (styles, scripts, images, tracking pixels)
   * while preserving the content structure that helps the LLM extract data.
   */
  private cleanEmailBody(body: string): string {
    let cleaned = body;

    // If it looks like HTML, strip the bloat but keep structure
    if (cleaned.includes('<') && cleaned.includes('>')) {
      // Remove <head> section entirely (styles, meta tags, etc.)
      cleaned = cleaned.replace(/<head[\s\S]*?<\/head>/gi, '');
      // Remove <style> tags and contents
      cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
      // Remove <script> tags and contents
      cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
      // Remove HTML comments
      cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
      // Remove tracking pixels and tiny images
      cleaned = cleaned.replace(/<img[^>]*(?:width\s*=\s*["']?1|height\s*=\s*["']?1|tracking|pixel|beacon)[^>]*>/gi, '');
      // Remove all other img tags (not useful for text extraction)
      cleaned = cleaned.replace(/<img[^>]*>/gi, '');
      // Remove inline styles from remaining tags (reduce token waste)
      cleaned = cleaned.replace(/\s+style\s*=\s*"[^"]*"/gi, '');
      cleaned = cleaned.replace(/\s+style\s*=\s*'[^']*'/gi, '');
      // Remove class attributes
      cleaned = cleaned.replace(/\s+class\s*=\s*"[^"]*"/gi, '');
      cleaned = cleaned.replace(/\s+class\s*=\s*'[^']*'/gi, '');
      // Remove width/height/align/valign/bgcolor/border attributes
      cleaned = cleaned.replace(/\s+(?:width|height|align|valign|bgcolor|border|cellpadding|cellspacing)\s*=\s*"[^"]*"/gi, '');
      cleaned = cleaned.replace(/\s+(?:width|height|align|valign|bgcolor|border|cellpadding|cellspacing)\s*=\s*'[^']*'/gi, '');
      // Collapse multiple whitespace/newlines
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
    }

    // Final truncation after cleaning
    const MAX_BODY = 30000;
    if (cleaned.length > MAX_BODY) {
      cleaned = cleaned.substring(0, MAX_BODY);
    }

    return cleaned.trim();
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
        if (IGNORED_LLM_TYPES.has(llmType)) {
          logger.debug(`[EmailParser] Ignoring non-travel entity type: "${entity.type}"`);
        } else {
          logger.warn(`[EmailParser] Skipping entity with unknown type: "${entity.type}"`);
        }
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
      if (data.confirmation_number && !data.confirmationNumber) {
        data.confirmationNumber = data.confirmation_number;
        delete data.confirmation_number;
      }
      // Rental car specific mappings
      if (data.pickupLocation && !data.fromLocationName) {
        data.fromLocationName = data.pickupLocation;
        delete data.pickupLocation;
      }
      if (data.pickup_location && !data.fromLocationName) {
        data.fromLocationName = data.pickup_location;
        delete data.pickup_location;
      }
      if (data.dropoffLocation && !data.toLocationName) {
        data.toLocationName = data.dropoffLocation;
        delete data.dropoffLocation;
      }
      if (data.dropoff_location && !data.toLocationName) {
        data.toLocationName = data.dropoff_location;
        delete data.dropoff_location;
      }
      if (data.pickupDate && !data.departureTime) {
        // Combine date and time if both exist
        const time = data.pickupTime || data.pickup_time;
        data.departureTime = time ? `${data.pickupDate} ${time}` : data.pickupDate;
        delete data.pickupDate;
        delete data.pickupTime;
        delete data.pickup_time;
      }
      if (data.pickup_date && !data.departureTime) {
        const time = data.pickup_time || data.pickupTime;
        data.departureTime = time ? `${data.pickup_date} ${time}` : data.pickup_date;
        delete data.pickup_date;
        delete data.pickup_time;
        delete data.pickupTime;
      }
      if (data.dropoffDate && !data.arrivalTime) {
        const time = data.dropoffTime || data.dropoff_time;
        data.arrivalTime = time ? `${data.dropoffDate} ${time}` : data.dropoffDate;
        delete data.dropoffDate;
        delete data.dropoffTime;
        delete data.dropoff_time;
      }
      if (data.dropoff_date && !data.arrivalTime) {
        const time = data.dropoff_time || data.dropoffTime;
        data.arrivalTime = time ? `${data.dropoff_date} ${time}` : data.dropoff_date;
        delete data.dropoff_date;
        delete data.dropoff_time;
        delete data.dropoffTime;
      }
      if (data.company && !data.carrier) {
        data.carrier = data.company;
        delete data.company;
      }
      if (data.totalCost && !data.cost) {
        data.cost = data.totalCost;
        delete data.totalCost;
      }
      if (data.total_cost && !data.cost) {
        data.cost = data.total_cost;
        delete data.total_cost;
      }
      if (data.carType && !data.vehicleType) {
        data.vehicleType = data.carType;
        delete data.carType;
      }
      if (data.car_type && !data.vehicleType) {
        data.vehicleType = data.car_type;
        delete data.car_type;
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
