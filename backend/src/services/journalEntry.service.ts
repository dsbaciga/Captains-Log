import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '../types/journalEntry.types';
import { verifyTripAccess, verifyEntityAccess, buildConditionalUpdateData } from '../utils/serviceHelpers';
import { fromZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';

class JournalEntryService {
  async createJournalEntry(userId: number, data: CreateJournalEntryInput) {
    // Verify user owns the trip and get trip timezone
    const trip = await verifyTripAccess(userId, data.tripId);

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

    // Create journal entry and all associations in a transaction
    const journalEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tripId: data.tripId,
          title: data.title || null,
          content: data.content,
          date: entryDate,
          entryType: data.entryType || 'daily', // Default to daily entry type
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
    await verifyTripAccess(userId, tripId);

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

    // Verify access
    await verifyEntityAccess(entry, userId, 'Journal entry');

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

    // Verify access
    const verifiedEntry = await verifyEntityAccess(entry, userId, 'Journal entry');

    // Verify locations belong to trip if provided
    if (data.locationIds && data.locationIds.length > 0) {
      const locations = await prisma.location.findMany({
        where: { id: { in: data.locationIds }, tripId: verifiedEntry.tripId },
      });

      if (locations.length !== data.locationIds.length) {
        throw new AppError('One or more locations not found or do not belong to trip', 404);
      }
    }

    // Verify activities belong to trip if provided
    if (data.activityIds && data.activityIds.length > 0) {
      const activities = await prisma.activity.findMany({
        where: { id: { in: data.activityIds }, tripId: verifiedEntry.tripId },
      });

      if (activities.length !== data.activityIds.length) {
        throw new AppError('One or more activities not found or do not belong to trip', 404);
      }
    }

    // Verify lodging belongs to trip if provided
    if (data.lodgingIds && data.lodgingIds.length > 0) {
      const lodgings = await prisma.lodging.findMany({
        where: { id: { in: data.lodgingIds }, tripId: verifiedEntry.tripId },
      });

      if (lodgings.length !== data.lodgingIds.length) {
        throw new AppError('One or more lodgings not found or do not belong to trip', 404);
      }
    }

    // Verify transportation belongs to trip if provided
    if (data.transportationIds && data.transportationIds.length > 0) {
      const transportations = await prisma.transportation.findMany({
        where: { id: { in: data.transportationIds }, tripId: verifiedEntry.tripId },
      });

      if (transportations.length !== data.transportationIds.length) {
        throw new AppError('One or more transportations not found or do not belong to trip', 404);
      }
    }

    // Update journal entry and sync all associations in a transaction
    const updatedEntry = await prisma.$transaction(async (tx) => {
      // Update the journal entry itself
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

      const updateData = buildConditionalUpdateData(
        { ...data, date: data.entryDate },
        {
          transformers: {
            title: (val) => val || null,
            date: entryDateTransformer,
          },
        }
      );

      await tx.journalEntry.update({
        where: { id: entryId },
        data: updateData,
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

    // Verify access
    await verifyEntityAccess(entry, userId, 'Journal entry');

    await prisma.journalEntry.delete({
      where: { id: entryId },
    });

    return { success: true };
  }
}

export default new JournalEntryService();
