import { z } from 'zod';
import prisma from '../config/database';
import { llmService, LlmError } from './llm.service';
import { verifyTripAccessWithPermission, verifyEntityAccessWithPermission } from '../utils/serviceHelpers';
import { AppError } from '../utils/errors';

const MOOD_OPTIONS = [
  'happy', 'excited', 'peaceful', 'nostalgic', 'tired',
  'frustrated', 'grateful', 'adventurous', 'reflective', 'anxious',
] as const;

const enhancementResponseSchema = z.object({
  title: z.string().optional(),
  mood: z.string().optional(),
});

class JournalEntryAiService {
  /**
   * Generate a narrative trip summary from all journal entries for a trip.
   * Returns the summary text — does not save it. Caller decides whether to persist.
   */
  async generateTripSummary(userId: number, tripId: number): Promise<string> {
    await verifyTripAccessWithPermission(userId, tripId, 'view');

    if (!llmService.isConfigured()) {
      throw new AppError('AI features are not configured. Set LLM_API_KEY to enable.', 503);
    }

    const [trip, entries] = await Promise.all([
      prisma.trip.findUnique({
        where: { id: tripId },
        select: { title: true, startDate: true, endDate: true },
      }),
      prisma.journalEntry.findMany({
        where: { tripId },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: { date: true, title: true, content: true, entryType: true },
      }),
    ]);

    if (!trip) throw new AppError('Trip not found', 404);
    if (entries.length === 0) {
      throw new AppError('No journal entries found for this trip', 400);
    }

    const entriesText = entries
      .map((e) => {
        const dateStr = e.date ? e.date.toISOString().split('T')[0] : 'undated';
        const heading = e.title ? `[${dateStr}] ${e.title}` : `[${dateStr}]`;
        return `${heading}\n${e.content}`;
      })
      .join('\n\n---\n\n');

    // Truncate to avoid excessive token usage
    const truncated = entriesText.length > 12000 ? entriesText.slice(0, 12000) + '\n\n[...truncated]' : entriesText;

    const systemPrompt = `You are a travel writer. Given a collection of journal entries from a trip, write a vivid, engaging narrative summary of the journey. Capture the highlights, key experiences, emotions, and memorable moments. Write in first person. Aim for 3–5 paragraphs.`;

    const dateRange = trip.startDate
      ? `Dates: ${trip.startDate.toISOString().split('T')[0]}${trip.endDate ? ` to ${trip.endDate.toISOString().split('T')[0]}` : ''}`
      : '';

    const userPrompt = `Trip: "${trip.title}"
${dateRange}

Journal entries:

${truncated}`;

    let summary: string;
    try {
      summary = await llmService.chat(systemPrompt, userPrompt, { maxTokens: 1024 });
    } catch (err) {
      if (err instanceof LlmError) {
        throw new AppError(`AI summary generation failed: ${err.message}`, 502);
      }
      throw err;
    }

    if (!summary) {
      throw new AppError('AI summary generation returned no content.', 502);
    }

    return summary;
  }

  /**
   * Suggest a title and/or mood for a single journal entry.
   * Only suggests title if the entry has none; only suggests mood if not already set.
   * Returns an empty object if nothing can be suggested or LLM is not configured.
   */
  async suggestEntryEnhancements(
    userId: number,
    entryId: number
  ): Promise<{ title?: string; mood?: string }> {
    await verifyEntityAccessWithPermission('journalEntry', entryId, userId, 'view');

    if (!llmService.isConfigured()) {
      throw new AppError('AI features are not configured. Set LLM_API_KEY to enable.', 503);
    }

    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      select: { title: true, content: true, mood: true },
    });

    if (!entry) throw new AppError('Journal entry not found', 404);

    // Nothing to suggest if both are already set
    if (entry.title && entry.mood) return {};

    const systemPrompt = `You are a helpful travel journaling assistant. Given a travel journal entry, respond ONLY with valid JSON containing:
- "title": a concise, evocative title (5–10 words) — omit if the entry already has a good one
- "mood": the single most fitting mood from this list: ${MOOD_OPTIONS.join(', ')} — omit if mood is already set

Example response: {"title": "Golden Hour at the Colosseum", "mood": "grateful"}`;

    const alreadyHasTitle = !!entry.title;
    const alreadyHasMood = !!entry.mood;

    const context: string[] = [];
    if (alreadyHasTitle) context.push(`Current title: "${entry.title}"`);
    if (alreadyHasMood) context.push(`Current mood: ${entry.mood} (do not suggest mood)`);

    const userPrompt = `${context.join('\n')}${context.length ? '\n\n' : ''}Journal entry:\n${entry.content}`;

    let raw: string;
    try {
      raw = await llmService.chat(systemPrompt, userPrompt, { maxTokens: 128, temperature: 0.5 });
    } catch (err) {
      if (err instanceof LlmError) {
        throw new AppError(`AI enhancement failed: ${err.message}`, 502);
      }
      throw err;
    }

    if (!raw) return {};

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return {};
      const parsed = enhancementResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (!parsed.success) return {};
      const result: { title?: string; mood?: string } = {};
      if (!alreadyHasTitle && parsed.data.title?.trim()) {
        result.title = parsed.data.title.trim();
      }
      if (!alreadyHasMood && parsed.data.mood && MOOD_OPTIONS.some((m) => m === parsed.data.mood)) {
        result.mood = parsed.data.mood;
      }
      return result;
    } catch {
      return {};
    }
  }
}

export const journalEntryAiService = new JournalEntryAiService();
