import prisma from '../config/database';
import { AppError } from '../utils/errors';
import type { CreateTagInput, UpdateTagInput, LinkTagToTripInput } from '../types/tag.types';
import { verifyTripAccess } from '../utils/serviceHelpers';

export const tagService = {
  // Create a new tag
  async createTag(userId: number, data: CreateTagInput) {
    return await prisma.tripTag.create({
      data: {
        name: data.name,
        color: data.color,
        textColor: data.textColor,
        user: {
          connect: { id: userId },
        },
      },
    });
  },

  // Get all tags for a user
  async getTagsByUser(userId: number) {
    return await prisma.tripTag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  // Get a tag by ID
  async getTagById(userId: number, tagId: number) {
    const tag = await prisma.tripTag.findFirst({
      where: { id: tagId, userId },
      include: {
        assignments: {
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

    if (!tag) {
      throw new AppError('Tag not found', 404);
    }

    return tag;
  },

  // Update a tag
  async updateTag(userId: number, tagId: number, data: UpdateTagInput) {
    const tag = await prisma.tripTag.findFirst({
      where: { id: tagId, userId },
    });

    if (!tag) {
      throw new AppError('Tag not found', 404);
    }

    return await prisma.tripTag.update({
      where: { id: tagId },
      data,
    });
  },

  // Delete a tag
  async deleteTag(userId: number, tagId: number) {
    const tag = await prisma.tripTag.findFirst({
      where: { id: tagId, userId },
    });

    if (!tag) {
      throw new AppError('Tag not found', 404);
    }

    await prisma.tripTag.delete({
      where: { id: tagId },
    });
  },

  // Link a tag to a trip
  async linkTagToTrip(userId: number, data: LinkTagToTripInput) {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify user owns the tag
    const tag = await prisma.tripTag.findFirst({
      where: { id: data.tagId, userId },
    });

    if (!tag) {
      throw new AppError('Tag not found', 404);
    }

    // Check if link already exists
    const existingLink = await prisma.tripTagAssignment.findFirst({
      where: {
        tripId: data.tripId,
        tagId: data.tagId,
      },
    });

    if (existingLink) {
      throw new AppError('Tag already linked to this trip', 400);
    }

    return await prisma.tripTagAssignment.create({
      data: {
        tripId: data.tripId,
        tagId: data.tagId,
      },
    });
  },

  // Unlink a tag from a trip
  async unlinkTagFromTrip(userId: number, tripId: number, tagId: number) {
    // Verify user owns the trip
    await verifyTripAccess(userId, tripId);

    const link = await prisma.tripTagAssignment.findFirst({
      where: {
        tripId,
        tagId,
      },
    });

    if (!link) {
      throw new AppError('Tag not linked to this trip', 404);
    }

    await prisma.tripTagAssignment.delete({
      where: {
        tripId_tagId: {
          tripId,
          tagId,
        },
      },
    });
  },

  // Get all tags for a specific trip
  async getTagsByTrip(userId: number, tripId: number) {
    // Verify user owns the trip
    await verifyTripAccess(userId, tripId);

    const tripTags = await prisma.tripTagAssignment.findMany({
      where: { tripId },
      include: {
        tag: true,
      },
    }) as Array<{ tag: { id: number; name: string; userId: number; color: string | null; textColor: string | null } }>;

    return tripTags.map((tt) => tt.tag);
  },
};
