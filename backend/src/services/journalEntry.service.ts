import prisma from '../config/database';
import {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '../types/journalEntry.types';
import {
  verifyTripAccessWithPermission,
  verifyEntityAccessWithPermission,
} from '../services/_shared/tripAccess';
import { buildConditionalUpdateData } from '../services/_shared/prismaUpdateData';
import { convertDecimals } from '../services/_shared/decimalConversion';
import { cleanupEntityLinks } from '../services/_shared/entityLinkCleanup';

/**
 * A journal entry's `date` is a `@db.Date` column — a calendar day, not an
 * instant. It must be stored at UTC midnight so it reads back as the same day
 * in every timezone; converting it through the trip's zone (as this once did)
 * pushed the date back a day for any trip east of UTC and drifted it further on
 * each edit. Take the YYYY-MM-DD portion of whatever the client sends (a plain
 * date, or a legacy datetime-local string) and pin it to UTC midnight.
 */
function parseEntryDate(input: string): Date {
  const datePortion = input.split('T')[0];
  const pinned = new Date(`${datePortion}T00:00:00.000Z`);
  // Fall back to permissive parsing if the input wasn't a date we recognise.
  return Number.isNaN(pinned.getTime()) ? new Date(input) : pinned;
}

class JournalEntryService {
  async createJournalEntry(userId: number, data: CreateJournalEntryInput) {
    // Verify user has edit permission on the trip
    await verifyTripAccessWithPermission(userId, data.tripId, 'edit');

    // `date` is accepted as an alias for `entryDate` so the input shape can
    // round-trip the `date` field the API returns on read.
    const entryDateInput = data.entryDate ?? data.date;

    // The entry date is a calendar day, stored at UTC midnight (see parseEntryDate).
    const entryDate = entryDateInput ? parseEntryDate(entryDateInput) : new Date();

    const journalEntry = await prisma.journalEntry.create({
      data: {
        tripId: data.tripId,
        title: data.title || null,
        content: data.content,
        date: entryDate,
        entryType: data.entryType || 'daily',
        mood: data.mood || null,
        weatherNotes: data.weatherNotes || null,
      },
    });

    return convertDecimals(journalEntry);
  }

  async getJournalEntriesByTrip(userId: number, tripId: number) {
    // Verify user has view permission on the trip
    await verifyTripAccessWithPermission(userId, tripId, 'view');

    const entries = await prisma.journalEntry.findMany({
      where: { tripId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return convertDecimals(entries);
  }

  async getJournalEntryById(userId: number, entryId: number) {
    // Verify user has view permission on the journal entry's trip
    await verifyEntityAccessWithPermission('journalEntry', entryId, userId, 'view');

    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        trip: true,
      },
    });

    return convertDecimals(entry);
  }

  async updateJournalEntry(
    userId: number,
    entryId: number,
    data: UpdateJournalEntryInput
  ) {
    // Verify user has edit permission on the journal entry's trip
    await verifyEntityAccessWithPermission('journalEntry', entryId, userId, 'edit');

    // The entry date is a calendar day, pinned to UTC midnight (see parseEntryDate).
    const entryDateTransformer = (dateStr: string | null) =>
      dateStr ? parseEntryDate(dateStr) : null;

    // Extract only the fields that are valid for JournalEntry model.
    // `date` is accepted as an alias for `entryDate`; when both are omitted the
    // date is left unchanged, and `entryDate` takes precedence if both are sent.
    const { title, content, entryDate, date, mood, weatherNotes } = data;
    const dateInput = entryDate !== undefined ? entryDate : date;
    const updateData = buildConditionalUpdateData(
      { title, content, date: dateInput, mood, weatherNotes },
      {
        transformers: {
          title: (val: string | null) => val || null,
          date: entryDateTransformer,
        },
      }
    );

    const updatedEntry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: updateData,
    });

    return convertDecimals(updatedEntry);
  }

  async deleteJournalEntry(userId: number, entryId: number) {
    // Verify user has edit permission on the journal entry's trip
    const { entity: entry } = await verifyEntityAccessWithPermission<{ tripId: number }>(
      'journalEntry',
      entryId,
      userId,
      'edit'
    );

    // Clean up entity links and delete atomically in a transaction
    await prisma.$transaction(async (tx) => {
      await cleanupEntityLinks(entry.tripId, 'JOURNAL_ENTRY', entryId, tx);
      await tx.journalEntry.delete({
        where: { id: entryId },
      });
    });

    return { success: true };
  }
}

export default new JournalEntryService();
