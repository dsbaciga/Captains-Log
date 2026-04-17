import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';
import { journalEntryAiService } from '../services/journalEntryAi.service';
import { aiSuggestionService } from '../services/aiSuggestion.service';

const VALID_STRATEGIES = z.enum(['gps', 'temporal', 'name', 'llm']);
type SuggestionStrategy = z.infer<typeof VALID_STRATEGIES>;

const isValidStrategy = (s: string): s is SuggestionStrategy =>
  VALID_STRATEGIES.options.includes(s as SuggestionStrategy);

const linkSuggestionsQuerySchema = z.object({
  strategies: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',').map((s) => s.trim()).filter(isValidStrategy);
    }),
  minConfidence: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
});

export const aiController = {
  /**
   * GET /api/trips/:tripId/ai/link-suggestions
   * Returns suggested EntityLink pairs based on GPS, temporal, name, and optionally LLM strategies.
   */
  getLinkSuggestions: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const { strategies, minConfidence } = linkSuggestionsQuerySchema.parse(req.query);

    const result = await aiSuggestionService.getLinkSuggestions(userId, tripId, {
      strategies,
      minConfidence,
    });

    res.json({ status: 'success', data: result });
  }),

  /**
   * POST /api/trips/:tripId/ai/journal-summary
   * Generates a narrative trip summary from all journal entries. Does not auto-save.
   */
  generateJournalSummary: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');

    const summary = await journalEntryAiService.generateTripSummary(userId, tripId);

    res.json({ status: 'success', data: { summary } });
  }),

  /**
   * POST /api/journal/:id/ai-enhance
   * Suggests title and/or mood for a single journal entry.
   */
  enhanceJournalEntry: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const entryId = parseId(req.params.id);

    const suggestions = await journalEntryAiService.suggestEntryEnhancements(userId, entryId);

    res.json({ status: 'success', data: suggestions });
  }),
};
