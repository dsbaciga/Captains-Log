import { PDFParse } from 'pdf-parse';
import { readFile } from 'fs/promises';
import { llmService } from './llm.service';
import logger from '../config/logger';
import { z } from 'zod';

const MAX_TEXT_CHARS = 30000;

const normalizedEntitySchema = z.object({
  type: z.enum(['TRANSPORTATION', 'LODGING', 'ACTIVITY', 'LOCATION']),
  confidence: z.number().min(0).max(1).default(0.8),
  data: z.record(z.unknown()),
});

const llmResponseSchema = z.object({
  entities: z.array(normalizedEntitySchema),
});

export type NormalizedEntity = z.infer<typeof normalizedEntitySchema>;

class PdfParserService {
  isConfigured(): boolean {
    return llmService.isConfigured();
  }

  async extractText(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText({ first: 50 });
      const text = result.text || '';
      return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
    } finally {
      await parser.destroy();
    }
  }

  async parseDocument(text: string, filename: string): Promise<{ entities: NormalizedEntity[] }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = `Booking document filename: "${filename}"\n\nDocument text:\n${text}`;

    const raw = await llmService.chat(systemPrompt, userPrompt, { maxTokens: 2048, temperature: 0.1 });
    if (!raw) return { entities: [] };

    return this.parseResponse(raw);
  }

  private buildSystemPrompt(): string {
    return `You are a travel booking parser. Given the text of a booking confirmation PDF, extract all travel entities found in the document.

Respond ONLY with valid JSON in this exact format:
{
  "entities": [
    {
      "type": "TRANSPORTATION",
      "confidence": 0.95,
      "data": {
        "type": "flight",
        "carrier": "United Airlines",
        "vehicleNumber": "UA123",
        "fromLocationName": "New York JFK",
        "toLocationName": "Los Angeles LAX",
        "departureTime": "2026-05-15T08:30:00",
        "arrivalTime": "2026-05-15T11:45:00",
        "confirmationNumber": "ABC123",
        "notes": "Seat 24A"
      }
    },
    {
      "type": "LODGING",
      "confidence": 0.92,
      "data": {
        "type": "hotel",
        "name": "Marriott Downtown",
        "address": "123 Main St, Los Angeles, CA",
        "checkInDate": "2026-05-15",
        "checkOutDate": "2026-05-18",
        "confirmationNumber": "HOTEL456",
        "notes": "King room, non-smoking"
      }
    },
    {
      "type": "ACTIVITY",
      "confidence": 0.85,
      "data": {
        "name": "Disneyland Tour",
        "description": "Full day park entry",
        "startTime": "2026-05-16T09:00:00",
        "bookingReference": "DL789",
        "notes": "2 adults"
      }
    },
    {
      "type": "LOCATION",
      "confidence": 0.80,
      "data": {
        "name": "Los Angeles",
        "address": "Los Angeles, CA, USA"
      }
    }
  ]
}

Rules:
- Only extract entities clearly present in the document
- Use ISO 8601 date/time format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
- For TRANSPORTATION type field use one of: flight, train, bus, car, ferry, bicycle, walk, other
- For LODGING type field use one of: hotel, hostel, airbnb, vacation_rental, camping, resort, motel, bed_and_breakfast, apartment, friends_family, other
- If no entities found, return {"entities": []}
- Do not invent data not present in the document`;
  }

  private parseResponse(raw: string): { entities: NormalizedEntity[] } {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { entities: [] };
      const parsed = llmResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (!parsed.success) {
        logger.warn('PDF parser LLM response failed schema validation', parsed.error);
        return { entities: [] };
      }
      return { entities: parsed.data.entities };
    } catch (err) {
      logger.warn('PDF parser failed to parse LLM response', err);
      return { entities: [] };
    }
  }
}

export const pdfParserService = new PdfParserService();
