import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '../types/journalEntry.types';
import { verifyTripAccess, verifyEntityAccess, buildConditionalUpdateData, convertDecimals, cleanupEntityLinks } from '../utils/serviceHelpers';
import { fromZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';

class JournalEntryService {
  async createJournalEntry(userId: number, data: CreateJournalEntryInput) {
    // Verify user owns the trip and get trip timezone
    const trip = await verifyTripAccess(userId, data.tripId);

    // Parse entry date with trip timezone
    let entryDate: Date;
    if (data.entryDate) {
      // If trip has timezone, convert from that timezone to UTC for storage
      if (trip.timezone) {
        try {
          // Parse the ISO string and interpret it as being in the trip's timezone
          const parsedDate = parseISO(data.entryDate);
          entryDate = fromZonedTime(parsedDate, trip.timezone);
        } catch (error) {
          console.error('Error parsing date with timezone:', error);
          entryDate = new Date(data.entryDate);
        }
      } else {
        entryDate = new Date(data.entryDate);
      }
    } else {
      entryDate = new Date();
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        tripId: data.tripId,
        title: data.title || null,
        content: data.content,
        date: entryDate,
        entryType: data.entryType || 'daily',
      },
    });

    return convertDecimals(journalEntry);
  }

  async getJournalEntriesByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    await verifyTripAccess(userId, tripId);

    const entries = await prisma.journalEntry.findMany({
      where: { tripId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return convertDecimals(entries);
  }

  async getJournalEntryById(userId: number, entryId: number) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        trip: true,
      },
    });

    // Verify access
    await verifyEntityAccess(entry, userId, 'Journal entry');

    return convertDecimals(entry);
  }

  async updateJournalEntry(
    userId: number,
    entryId: number,
    data: UpdateJournalEntryInput
  ) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { trip: true },
    });

    // Verify access
    await verifyEntityAccess(entry, userId, 'Journal entry');

    // Create date transformer that handles timezone conversion
    const entryDateTransformer = (dateStr: string | null) => {
      if (!dateStr) return null;

      // Parse date with trip timezone if available
      if (entry?.trip?.timezone) {
        try {
          const parsedDate = parseISO(dateStr);
          return fromZonedTime(parsedDate, entry.trip.timezone);
        } catch (error) {
          console.error('Error parsing date with timezone:', error);
          return new Date(dateStr);
        }
      } else {
        return new Date(dateStr);
      }
    };

    // Extract only the fields that are valid for JournalEntry model
    const { title, content, entryDate } = data;
    const updateData = buildConditionalUpdateData(
      { title, content, date: entryDate },
      {
        transformers: {
          title: (val) => val || null,
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
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { trip: true },
    });

    // Verify access
    const verifiedEntry = await verifyEntityAccess(entry, userId, 'Journal entry');

    // Clean up entity links before deleting
    await cleanupEntityLinks(verifiedEntry.tripId, 'JOURNAL_ENTRY', entryId);

    await prisma.journalEntry.delete({
      where: { id: entryId },
    });

    return { success: true };
  }
}

export default new JournalEntryService();
