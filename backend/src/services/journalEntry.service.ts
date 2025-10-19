import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '../types/journalEntry.types';

class JournalEntryService {
  async createJournalEntry(userId: number, data: CreateJournalEntryInput) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    // Verify location belongs to trip if provided
    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: data.tripId },
      });

      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        tripId: data.tripId,
        locationId: data.locationId || null,
        title: data.title,
        content: data.content,
        entryDate: data.entryDate ? new Date(data.entryDate) : new Date(),
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return journalEntry;
  }

  async getJournalEntriesByTrip(userId: number, tripId: number) {
    // Verify user has access to trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    const entries = await prisma.journalEntry.findMany({
      where: { tripId },
      include: {
        locationAssignments: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return entries;
  }

  async getJournalEntryById(userId: number, entryId: number) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        trip: true,
        location: true,
      },
    });

    if (!entry) {
      throw new AppError('Journal entry not found', 404);
    }

    // Check trip access
    if (entry.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return entry;
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

    if (!entry) {
      throw new AppError('Journal entry not found', 404);
    }

    if (entry.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Verify location belongs to trip if provided
    if (data.locationId !== undefined && data.locationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tripId: entry.tripId },
      });

      if (!location) {
        throw new AppError('Location not found or does not belong to trip', 404);
      }
    }

    const updatedEntry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        locationId: data.locationId !== undefined ? data.locationId : undefined,
        title: data.title,
        content: data.content,
        entryDate:
          data.entryDate !== undefined
            ? new Date(data.entryDate)
            : undefined,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedEntry;
  }

  async deleteJournalEntry(userId: number, entryId: number) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { trip: true },
    });

    if (!entry) {
      throw new AppError('Journal entry not found', 404);
    }

    if (entry.trip.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.journalEntry.delete({
      where: { id: entryId },
    });

    return { success: true };
  }
}

export default new JournalEntryService();
