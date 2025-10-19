import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';
import type { CreateCompanionInput, UpdateCompanionInput, LinkCompanionToTripInput } from '../types/companion.types';

const prisma = new PrismaClient();

export const companionService = {
  // Create a new companion
  async createCompanion(userId: number, data: CreateCompanionInput) {
    return await prisma.travelCompanion.create({
      data: {
        ...data,
        userId,
      },
    });
  },

  // Get all companions for a user
  async getCompanionsByUser(userId: number) {
    return await prisma.travelCompanion.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tripAssignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  // Get a companion by ID
  async getCompanionById(userId: number, companionId: number) {
    const companion = await prisma.travelCompanion.findFirst({
      where: { id: companionId, userId },
      include: {
        tripAssignments: {
          include: {
            trip: {
              select: {
                id: true,
                title: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    if (!companion) {
      throw new AppError('Companion not found', 404);
    }

    return companion;
  },

  // Update a companion
  async updateCompanion(userId: number, companionId: number, data: UpdateCompanionInput) {
    const companion = await prisma.travelCompanion.findFirst({
      where: { id: companionId, userId },
    });

    if (!companion) {
      throw new AppError('Companion not found', 404);
    }

    return await prisma.travelCompanion.update({
      where: { id: companionId },
      data,
    });
  },

  // Delete a companion
  async deleteCompanion(userId: number, companionId: number) {
    const companion = await prisma.travelCompanion.findFirst({
      where: { id: companionId, userId },
    });

    if (!companion) {
      throw new AppError('Companion not found', 404);
    }

    await prisma.travelCompanion.delete({
      where: { id: companionId },
    });
  },

  // Link a companion to a trip
  async linkCompanionToTrip(userId: number, data: LinkCompanionToTripInput) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    // Verify user owns the companion
    const companion = await prisma.travelCompanion.findFirst({
      where: { id: data.companionId, userId },
    });

    if (!companion) {
      throw new AppError('Companion not found', 404);
    }

    // Check if link already exists
    const existingLink = await prisma.tripCompanion.findFirst({
      where: {
        tripId: data.tripId,
        companionId: data.companionId,
      },
    });

    if (existingLink) {
      throw new AppError('Companion already linked to this trip', 400);
    }

    return await prisma.tripCompanion.create({
      data: {
        tripId: data.tripId,
        companionId: data.companionId,
      },
    });
  },

  // Unlink a companion from a trip
  async unlinkCompanionFromTrip(userId: number, tripId: number, companionId: number) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    const link = await prisma.tripCompanion.findFirst({
      where: {
        tripId,
        companionId,
      },
    });

    if (!link) {
      throw new AppError('Companion not linked to this trip', 404);
    }

    await prisma.tripCompanion.delete({
      where: {
        tripId_companionId: {
          tripId,
          companionId,
        },
      },
    });
  },

  // Get all companions for a specific trip
  async getCompanionsByTrip(userId: number, tripId: number) {
    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or access denied', 404);
    }

    const tripCompanions = await prisma.tripCompanion.findMany({
      where: { tripId },
      include: {
        companion: true,
      },
    });

    return tripCompanions.map((tc) => tc.companion);
  },
};
