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

    // Verify locations belong to trip if provided
    if (data.locationIds && data.locationIds.length > 0) {
      const locations = await prisma.location.findMany({
        where: { id: { in: data.locationIds }, tripId: data.tripId },
      });

      if (locations.length !== data.locationIds.length) {
        throw new AppError('One or more locations not found or do not belong to trip', 404);
      }
    }

    // Verify activities belong to trip if provided
    if (data.activityIds && data.activityIds.length > 0) {
      const activities = await prisma.activity.findMany({
        where: { id: { in: data.activityIds }, tripId: data.tripId },
      });

      if (activities.length !== data.activityIds.length) {
        throw new AppError('One or more activities not found or do not belong to trip', 404);
      }
    }

    // Verify lodging belongs to trip if provided
    if (data.lodgingIds && data.lodgingIds.length > 0) {
      const lodgings = await prisma.lodging.findMany({
        where: { id: { in: data.lodgingIds }, tripId: data.tripId },
      });

      if (lodgings.length !== data.lodgingIds.length) {
        throw new AppError('One or more lodgings not found or do not belong to trip', 404);
      }
    }

    // Verify transportation belongs to trip if provided
    if (data.transportationIds && data.transportationIds.length > 0) {
      const transportations = await prisma.transportation.findMany({
        where: { id: { in: data.transportationIds }, tripId: data.tripId },
      });

      if (transportations.length !== data.transportationIds.length) {
        throw new AppError('One or more transportations not found or do not belong to trip', 404);
      }
    }

    // Create journal entry and all associations in a transaction
    const journalEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tripId: data.tripId,
          title: data.title,
          content: data.content,
          entryDate: data.entryDate ? new Date(data.entryDate) : new Date(),
        },
      });

      // Create location associations
      if (data.locationIds && data.locationIds.length > 0) {
        await tx.journalLocation.createMany({
          data: data.locationIds.map((locationId) => ({
            journalId: entry.id,
            locationId,
          })),
        });
      }

      // Create activity associations
      if (data.activityIds && data.activityIds.length > 0) {
        await tx.journalActivity.createMany({
          data: data.activityIds.map((activityId) => ({
            journalId: entry.id,
            activityId,
          })),
        });
      }

      // Create lodging associations
      if (data.lodgingIds && data.lodgingIds.length > 0) {
        await tx.journalLodging.createMany({
          data: data.lodgingIds.map((lodgingId) => ({
            journalId: entry.id,
            lodgingId,
          })),
        });
      }

      // Create transportation associations
      if (data.transportationIds && data.transportationIds.length > 0) {
        await tx.journalTransportation.createMany({
          data: data.transportationIds.map((transportationId) => ({
            journalId: entry.id,
            transportationId,
          })),
        });
      }

      // Fetch the complete entry with all associations
      return tx.journalEntry.findUnique({
        where: { id: entry.id },
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
          activityAssignments: {
            include: {
              activity: {
                select: {
                  id: true,
                  name: true,
                  startTime: true,
                  category: true,
                },
              },
            },
          },
          lodgingAssignments: {
            include: {
              lodging: {
                select: {
                  id: true,
                  name: true,
                  checkInDate: true,
                  checkOutDate: true,
                },
              },
            },
          },
          transportationAssignments: {
            include: {
              transportation: {
                select: {
                  id: true,
                  type: true,
                  company: true,
                  referenceNumber: true,
                  scheduledStart: true,
                },
              },
            },
          },
        },
      });
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
        activityAssignments: {
          include: {
            activity: {
              select: {
                id: true,
                name: true,
                startTime: true,
                category: true,
              },
            },
          },
        },
        lodgingAssignments: {
          include: {
            lodging: {
              select: {
                id: true,
                name: true,
                checkInDate: true,
                checkOutDate: true,
              },
            },
          },
        },
        transportationAssignments: {
          include: {
            transportation: {
              select: {
                id: true,
                type: true,
                company: true,
                referenceNumber: true,
                scheduledStart: true,
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
        activityAssignments: {
          include: {
            activity: {
              select: {
                id: true,
                name: true,
                startTime: true,
                category: true,
              },
            },
          },
        },
        lodgingAssignments: {
          include: {
            lodging: {
              select: {
                id: true,
                name: true,
                checkInDate: true,
                checkOutDate: true,
              },
            },
          },
        },
        transportationAssignments: {
          include: {
            transportation: {
              select: {
                id: true,
                type: true,
                company: true,
                referenceNumber: true,
                scheduledStart: true,
              },
            },
          },
        },
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

    // Verify locations belong to trip if provided
    if (data.locationIds && data.locationIds.length > 0) {
      const locations = await prisma.location.findMany({
        where: { id: { in: data.locationIds }, tripId: entry.tripId },
      });

      if (locations.length !== data.locationIds.length) {
        throw new AppError('One or more locations not found or do not belong to trip', 404);
      }
    }

    // Verify activities belong to trip if provided
    if (data.activityIds && data.activityIds.length > 0) {
      const activities = await prisma.activity.findMany({
        where: { id: { in: data.activityIds }, tripId: entry.tripId },
      });

      if (activities.length !== data.activityIds.length) {
        throw new AppError('One or more activities not found or do not belong to trip', 404);
      }
    }

    // Verify lodging belongs to trip if provided
    if (data.lodgingIds && data.lodgingIds.length > 0) {
      const lodgings = await prisma.lodging.findMany({
        where: { id: { in: data.lodgingIds }, tripId: entry.tripId },
      });

      if (lodgings.length !== data.lodgingIds.length) {
        throw new AppError('One or more lodgings not found or do not belong to trip', 404);
      }
    }

    // Verify transportation belongs to trip if provided
    if (data.transportationIds && data.transportationIds.length > 0) {
      const transportations = await prisma.transportation.findMany({
        where: { id: { in: data.transportationIds }, tripId: entry.tripId },
      });

      if (transportations.length !== data.transportationIds.length) {
        throw new AppError('One or more transportations not found or do not belong to trip', 404);
      }
    }

    // Update journal entry and sync all associations in a transaction
    const updatedEntry = await prisma.$transaction(async (tx) => {
      // Update the journal entry itself
      await tx.journalEntry.update({
        where: { id: entryId },
        data: {
          title: data.title,
          content: data.content,
          entryDate:
            data.entryDate !== undefined
              ? new Date(data.entryDate)
              : undefined,
        },
      });

      // Sync location associations (delete old, create new)
      if (data.locationIds !== undefined) {
        await tx.journalLocation.deleteMany({
          where: { journalId: entryId },
        });

        if (data.locationIds.length > 0) {
          await tx.journalLocation.createMany({
            data: data.locationIds.map((locationId) => ({
              journalId: entryId,
              locationId,
            })),
          });
        }
      }

      // Sync activity associations (delete old, create new)
      if (data.activityIds !== undefined) {
        await tx.journalActivity.deleteMany({
          where: { journalId: entryId },
        });

        if (data.activityIds.length > 0) {
          await tx.journalActivity.createMany({
            data: data.activityIds.map((activityId) => ({
              journalId: entryId,
              activityId,
            })),
          });
        }
      }

      // Sync lodging associations (delete old, create new)
      if (data.lodgingIds !== undefined) {
        await tx.journalLodging.deleteMany({
          where: { journalId: entryId },
        });

        if (data.lodgingIds.length > 0) {
          await tx.journalLodging.createMany({
            data: data.lodgingIds.map((lodgingId) => ({
              journalId: entryId,
              lodgingId,
            })),
          });
        }
      }

      // Sync transportation associations (delete old, create new)
      if (data.transportationIds !== undefined) {
        await tx.journalTransportation.deleteMany({
          where: { journalId: entryId },
        });

        if (data.transportationIds.length > 0) {
          await tx.journalTransportation.createMany({
            data: data.transportationIds.map((transportationId) => ({
              journalId: entryId,
              transportationId,
            })),
          });
        }
      }

      // Fetch the complete entry with all associations
      return tx.journalEntry.findUnique({
        where: { id: entryId },
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
          activityAssignments: {
            include: {
              activity: {
                select: {
                  id: true,
                  name: true,
                  startTime: true,
                  category: true,
                },
              },
            },
          },
          lodgingAssignments: {
            include: {
              lodging: {
                select: {
                  id: true,
                  name: true,
                  checkInDate: true,
                  checkOutDate: true,
                },
              },
            },
          },
          transportationAssignments: {
            include: {
              transportation: {
                select: {
                  id: true,
                  type: true,
                  company: true,
                  referenceNumber: true,
                  scheduledStart: true,
                },
              },
            },
          },
        },
      });
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
