import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateTripInput, UpdateTripInput, GetTripQuery, TripStatus, DuplicateTripInput } from '../types/trip.types';
import { companionService } from './companion.service';
import { buildConditionalUpdateData, tripDateTransformer, convertDecimals } from '../utils/serviceHelpers';

export class TripService {
  async createTrip(userId: number, data: CreateTripInput) {
    // Auto-set addToPlacesVisited if status is Completed
    const addToPlacesVisited = data.status === TripStatus.COMPLETED
      ? true
      : data.addToPlacesVisited || false;

    // Get user's timezone if trip timezone not specified
    let timezone = data.timezone;
    if (!timezone) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      });
      timezone = user?.timezone || 'UTC';
    }

    const trip = await prisma.trip.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate + 'T00:00:00.000Z') : null,
        endDate: data.endDate ? new Date(data.endDate + 'T00:00:00.000Z') : null,
        timezone,
        status: data.status,
        privacyLevel: data.privacyLevel,
        addToPlacesVisited,
      },
    });

    // Auto-add "Myself" companion to new trips
    const myselfCompanion = await companionService.getMyselfCompanion(userId);
    if (myselfCompanion) {
      await prisma.tripCompanion.create({
        data: {
          tripId: trip.id,
          companionId: myselfCompanion.id,
        },
      });
    }

    return convertDecimals(trip);
  }

  async getTrips(userId: number, query: GetTripQuery) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;
    const sortOption = query.sort || 'startDate-desc';

    const where: any = { userId };

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Search in title and description
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter by date range
    if (query.startDateFrom || query.startDateTo) {
      where.startDate = {};
      if (query.startDateFrom) {
        where.startDate.gte = new Date(query.startDateFrom + 'T00:00:00.000Z');
      }
      if (query.startDateTo) {
        where.startDate.lte = new Date(query.startDateTo + 'T23:59:59.999Z');
      }
    }

    // Filter by tags
    if (query.tags) {
      const tagIds = query.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (tagIds.length > 0) {
        where.tagAssignments = {
          some: {
            tagId: { in: tagIds }
          }
        };
      }
    }

    // Fetch all matching trips (without pagination) to sort properly
    const [allTrips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: {
          coverPhoto: true,
          tagAssignments: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              locations: true,
              photos: true,
              transportation: true,
              activities: true,
              lodging: true,
              journalEntries: true,
            },
          },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    // Apply sorting based on sort option
    let sortedTrips = [...allTrips];

    if (sortOption === 'startDate-desc') {
      // Smart sorting for default: newest first by start date
      // Active trips (Dream, Planning, Planned, In Progress) without dates go first
      // Then trips with dates (newest first)
      // Then Completed/Cancelled trips without dates go last
      sortedTrips.sort((a, b) => {
        const activeStatuses = [TripStatus.DREAM, TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.IN_PROGRESS];
        const aIsActive = activeStatuses.includes(a.status as any);
        const bIsActive = activeStatuses.includes(b.status as any);
        const aHasDate = !!a.startDate;
        const bHasDate = !!b.startDate;

        // Active trips without dates go first
        if (aIsActive && !aHasDate && bIsActive && !bHasDate) return 0;
        if (aIsActive && !aHasDate) return -1;
        if (bIsActive && !bHasDate) return 1;

        // Both have dates - sort by date (newest first)
        if (aHasDate && bHasDate) {
          return new Date(b.startDate!).getTime() - new Date(a.startDate!).getTime();
        }

        // One has date, other doesn't (but not active without date)
        // Trips with dates come before Completed/Cancelled trips without dates
        if (aHasDate && !bHasDate) return -1;
        if (!aHasDate && bHasDate) return 1;

        // Both don't have dates and aren't active - sort by status then createdAt
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (sortOption === 'startDate-asc') {
      // Oldest first - trips without dates go to the end
      sortedTrips.sort((a, b) => {
        const aHasDate = !!a.startDate;
        const bHasDate = !!b.startDate;

        if (!aHasDate && !bHasDate) return 0;
        if (!aHasDate) return 1;
        if (!bHasDate) return -1;

        return new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime();
      });
    } else if (sortOption === 'title-asc') {
      sortedTrips.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'title-desc') {
      sortedTrips.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortOption === 'status') {
      sortedTrips.sort((a, b) => a.status.localeCompare(b.status));
    }

    // Apply pagination after sorting
    const paginatedTrips = sortedTrips.slice(skip, skip + limit);

    return {
      trips: paginatedTrips.map((trip) => convertDecimals(trip)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Auto-update status for all trips in the system that have dates
   * Does not update trips that are Completed or Cancelled
   */
  async autoUpdateGlobalTripStatuses() {
    const trips = await prisma.trip.findMany({
      where: {
        startDate: { not: null },
        endDate: { not: null },
        status: {
          notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED],
        },
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    interface TripForStatusUpdate {
      id: number;
      status: string;
      startDate: Date | null;
      endDate: Date | null;
    }

    const updates = trips
      .map((trip: TripForStatusUpdate) => {
        if (!trip.startDate || !trip.endDate) return null;

        const startDate = new Date(trip.startDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(trip.endDate);
        endDate.setHours(0, 0, 0, 0);

        let newStatus: string | null = null;

        // If today is after end date, mark as Completed
        if (today > endDate && trip.status !== TripStatus.COMPLETED) {
          newStatus = TripStatus.COMPLETED;
        }
        // If today is within trip dates (inclusive), mark as In Progress
        else if (today >= startDate && today <= endDate && trip.status !== TripStatus.IN_PROGRESS) {
          newStatus = TripStatus.IN_PROGRESS;
        }

        if (newStatus) {
          return prisma.trip.update({
            where: { id: trip.id },
            data: {
              status: newStatus,
              addToPlacesVisited: newStatus === TripStatus.COMPLETED ? true : undefined,
            },
          });
        }

        return null;
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);

    if (updates.length > 0) {
      await Promise.all(updates);
      return updates.length;
    }
    return 0;
  }

  async getTripById(userId: number, tripId: number) {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          {
            collaborators: {
              some: { userId },
            },
          },
          { privacyLevel: 'Public' },
        ],
      },
      include: {
        coverPhoto: true,
        bannerPhoto: true,
        tagAssignments: {
          include: {
            tag: true,
          },
        },
        companionAssignments: {
          include: {
            companion: true,
          },
        },
      },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    return convertDecimals(trip);
  }

  async updateTrip(userId: number, tripId: number, data: UpdateTripInput) {
    // Verify ownership
    const existingTrip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!existingTrip) {
      throw new AppError('Trip not found or you do not have permission to edit it', 404);
    }

    // Auto-set addToPlacesVisited if status changed to Completed
    let addToPlacesVisited = data.addToPlacesVisited;
    if (data.status === TripStatus.COMPLETED && addToPlacesVisited === undefined) {
      addToPlacesVisited = true;
    }

    const updateData = buildConditionalUpdateData(
      { ...data, addToPlacesVisited },
      {
        transformers: {
          startDate: tripDateTransformer,
          endDate: tripDateTransformer,
        },
      }
    );

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
    });

    return convertDecimals(trip);
  }

  async deleteTrip(userId: number, tripId: number) {
    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or you do not have permission to delete it', 404);
    }

    await prisma.trip.delete({
      where: { id: tripId },
    });

    return { message: 'Trip deleted successfully' };
  }

  async updateCoverPhoto(userId: number, tripId: number, photoId: number | null) {
    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new AppError('Trip not found or you do not have permission to edit it', 404);
    }

    // If photoId is provided, verify the photo belongs to this trip
    if (photoId) {
      const photo = await prisma.photo.findFirst({
        where: { id: photoId, tripId },
      });

      if (!photo) {
        throw new AppError('Photo not found or does not belong to this trip', 404);
      }
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { coverPhotoId: photoId },
      include: {
        coverPhoto: true,
      },
    });

    return convertDecimals(updatedTrip);
  }

  async duplicateTrip(userId: number, sourceTripId: number, data: DuplicateTripInput) {
    // Verify ownership of source trip
    const sourceTrip = await prisma.trip.findFirst({
      where: { id: sourceTripId, userId },
      include: {
        tagAssignments: data.copyEntities?.tags ? { include: { tag: true } } : false,
        companionAssignments: data.copyEntities?.companions ? { include: { companion: true } } : false,
        locations: data.copyEntities?.locations ? {
          include: {
            category: true,
          },
        } : false,
        photos: data.copyEntities?.photos ? true : false,
        activities: data.copyEntities?.activities ? {
          include: {
            location: true,
          },
        } : false,
        transportation: data.copyEntities?.transportation ? {
          include: {
            startLocation: true,
            endLocation: true,
          },
        } : false,
        lodging: data.copyEntities?.lodging ? {
          include: {
            location: true,
          },
        } : false,
        journalEntries: data.copyEntities?.journalEntries ? true : false,
        photoAlbums: data.copyEntities?.photoAlbums ? {
          include: {
            photoAssignments: {
              include: {
                photo: true,
              },
            },
          },
        } : false,
        checklists: data.copyEntities?.checklists ? {
          include: {
            items: true,
          },
        } : false,
      },
    });

    if (!sourceTrip) {
      throw new AppError('Trip not found or you do not have permission to duplicate it', 404);
    }

    // Get user's timezone for new trip
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = sourceTrip.timezone || user?.timezone || 'UTC';

    // Create new trip with basic info (no dates, status = Dream)
    const newTrip = await prisma.trip.create({
      data: {
        userId,
        title: data.title,
        description: sourceTrip.description,
        timezone,
        status: TripStatus.DREAM,
        privacyLevel: sourceTrip.privacyLevel,
        addToPlacesVisited: false,
      },
    });

    // Maps to track old ID -> new ID for maintaining relationships
    const locationIdMap = new Map<number, number>();
    const photoIdMap = new Map<number, number>();
    const activityIdMap = new Map<number, number>();
    const transportationIdMap = new Map<number, number>();
    const lodgingIdMap = new Map<number, number>();
    const journalIdMap = new Map<number, number>();
    const albumIdMap = new Map<number, number>();

    // Copy locations (with parent-child hierarchy)
    if (data.copyEntities?.locations && sourceTrip.locations && Array.isArray(sourceTrip.locations)) {
      // First pass: copy locations without parent references
      const locationsWithoutParent = sourceTrip.locations.filter((loc: any) => !loc.parentId);
      for (const location of locationsWithoutParent) {
        const newLocation = await prisma.location.create({
          data: {
            tripId: newTrip.id,
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            categoryId: location.categoryId,
            visitDatetime: null, // Clear dates for duplicated trip
            visitDurationMinutes: location.visitDurationMinutes,
            notes: location.notes,
          },
        });
        locationIdMap.set(location.id, newLocation.id);
      }

      // Second pass: copy child locations with updated parent references
      const locationsWithParent = sourceTrip.locations.filter((loc: any) => loc.parentId);
      for (const location of locationsWithParent) {
        const newParentId = locationIdMap.get(location.parentId);
        const newLocation = await prisma.location.create({
          data: {
            tripId: newTrip.id,
            parentId: newParentId || null,
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            categoryId: location.categoryId,
            visitDatetime: null,
            visitDurationMinutes: location.visitDurationMinutes,
            notes: location.notes,
          },
        });
        locationIdMap.set(location.id, newLocation.id);
      }
    }

    // Copy photos
    if (data.copyEntities?.photos && sourceTrip.photos && Array.isArray(sourceTrip.photos)) {
      for (const photo of sourceTrip.photos) {
        const newPhoto = await prisma.photo.create({
          data: {
            tripId: newTrip.id,
            source: photo.source,
            immichAssetId: photo.immichAssetId,
            localPath: photo.localPath,
            thumbnailPath: photo.thumbnailPath,
            caption: photo.caption,
            latitude: photo.latitude,
            longitude: photo.longitude,
            takenAt: photo.takenAt,
          },
        });
        photoIdMap.set(photo.id, newPhoto.id);
      }
    }

    // Copy activities (with parent-child hierarchy)
    if (data.copyEntities?.activities && sourceTrip.activities && Array.isArray(sourceTrip.activities)) {
      // First pass: activities without parent
      const activitiesWithoutParent = sourceTrip.activities.filter((act: any) => !act.parentId);
      for (const activity of activitiesWithoutParent) {
        const newLocationId = activity.locationId ? locationIdMap.get(activity.locationId) : null;
        const newActivity = await prisma.activity.create({
          data: {
            tripId: newTrip.id,
            locationId: newLocationId || null,
            name: activity.name,
            description: activity.description,
            category: activity.category,
            allDay: activity.allDay,
            startTime: null, // Clear dates
            endTime: null,
            timezone: activity.timezone,
            cost: activity.cost,
            currency: activity.currency,
            bookingUrl: activity.bookingUrl,
            bookingReference: activity.bookingReference,
            notes: activity.notes,
            manualOrder: activity.manualOrder,
          },
        });
        activityIdMap.set(activity.id, newActivity.id);
      }

      // Second pass: child activities with updated parent references
      const activitiesWithParent = sourceTrip.activities.filter((act: any) => act.parentId);
      for (const activity of activitiesWithParent) {
        const newLocationId = activity.locationId ? locationIdMap.get(activity.locationId) : null;
        const newParentId = activityIdMap.get(activity.parentId);
        const newActivity = await prisma.activity.create({
          data: {
            tripId: newTrip.id,
            locationId: newLocationId || null,
            parentId: newParentId || null,
            name: activity.name,
            description: activity.description,
            category: activity.category,
            allDay: activity.allDay,
            startTime: null,
            endTime: null,
            timezone: activity.timezone,
            cost: activity.cost,
            currency: activity.currency,
            bookingUrl: activity.bookingUrl,
            bookingReference: activity.bookingReference,
            notes: activity.notes,
            manualOrder: activity.manualOrder,
          },
        });
        activityIdMap.set(activity.id, newActivity.id);
      }
    }

    // Copy transportation (preserve connection groups)
    if (data.copyEntities?.transportation && sourceTrip.transportation && Array.isArray(sourceTrip.transportation)) {
      for (const transport of sourceTrip.transportation) {
        const newStartLocationId = transport.startLocationId ? locationIdMap.get(transport.startLocationId) : null;
        const newEndLocationId = transport.endLocationId ? locationIdMap.get(transport.endLocationId) : null;

        const newTransport = await prisma.transportation.create({
          data: {
            tripId: newTrip.id,
            type: transport.type,
            startLocationId: newStartLocationId || null,
            startLocationText: transport.startLocationText,
            endLocationId: newEndLocationId || null,
            endLocationText: transport.endLocationText,
            scheduledStart: null, // Clear dates
            scheduledEnd: null,
            startTimezone: transport.startTimezone,
            endTimezone: transport.endTimezone,
            actualStart: null,
            actualEnd: null,
            company: transport.company,
            referenceNumber: transport.referenceNumber,
            seatNumber: transport.seatNumber,
            bookingReference: transport.bookingReference,
            bookingUrl: transport.bookingUrl,
            cost: transport.cost,
            currency: transport.currency,
            status: 'on_time',
            delayMinutes: null,
            notes: transport.notes,
            connectionGroupId: transport.connectionGroupId, // Preserve connection groups
            isAutoGenerated: transport.isAutoGenerated,
            calculatedDistance: transport.calculatedDistance,
            calculatedDuration: transport.calculatedDuration,
            distanceSource: transport.distanceSource,
          },
        });
        transportationIdMap.set(transport.id, newTransport.id);
      }
    }

    // Copy lodging
    if (data.copyEntities?.lodging && sourceTrip.lodging && Array.isArray(sourceTrip.lodging)) {
      for (const lodging of sourceTrip.lodging) {
        const newLocationId = lodging.locationId ? locationIdMap.get(lodging.locationId) : null;

        const newLodging = await prisma.lodging.create({
          data: {
            tripId: newTrip.id,
            locationId: newLocationId || null,
            type: lodging.type,
            name: lodging.name,
            address: lodging.address,
            checkInDate: new Date(), // Placeholder - user will update
            checkOutDate: new Date(),
            timezone: lodging.timezone,
            confirmationNumber: lodging.confirmationNumber,
            bookingUrl: lodging.bookingUrl,
            cost: lodging.cost,
            currency: lodging.currency,
            notes: lodging.notes,
          },
        });
        lodgingIdMap.set(lodging.id, newLodging.id);
      }
    }

    // Copy photo albums
    if (data.copyEntities?.photoAlbums && sourceTrip.photoAlbums && Array.isArray(sourceTrip.photoAlbums)) {
      for (const album of sourceTrip.photoAlbums) {
        const newLocationId = album.locationId ? locationIdMap.get(album.locationId) : null;
        const newActivityId = album.activityId ? activityIdMap.get(album.activityId) : null;
        const newLodgingId = album.lodgingId ? lodgingIdMap.get(album.lodgingId) : null;
        const newCoverPhotoId = album.coverPhotoId ? photoIdMap.get(album.coverPhotoId) : null;

        const newAlbum = await prisma.photoAlbum.create({
          data: {
            tripId: newTrip.id,
            name: album.name,
            description: album.description,
            locationId: newLocationId || null,
            activityId: newActivityId || null,
            lodgingId: newLodgingId || null,
            coverPhotoId: newCoverPhotoId || null,
          },
        });
        albumIdMap.set(album.id, newAlbum.id);

        // Copy photo album assignments
        if (album.photoAssignments && Array.isArray(album.photoAssignments)) {
          for (const assignment of album.photoAssignments) {
            const newPhotoId = photoIdMap.get(assignment.photoId);
            if (newPhotoId) {
              await prisma.photoAlbumAssignment.create({
                data: {
                  albumId: newAlbum.id,
                  photoId: newPhotoId,
                  sortOrder: assignment.sortOrder,
                },
              });
            }
          }
        }
      }
    }

    // Copy journal entries
    if (data.copyEntities?.journalEntries && sourceTrip.journalEntries && Array.isArray(sourceTrip.journalEntries)) {
      for (const journal of sourceTrip.journalEntries) {
        const newJournal = await prisma.journalEntry.create({
          data: {
            tripId: newTrip.id,
            date: null, // Clear dates
            title: journal.title,
            content: journal.content,
            entryType: journal.entryType,
            mood: journal.mood,
            weatherNotes: journal.weatherNotes,
          },
        });
        journalIdMap.set(journal.id, newJournal.id);
      }
    }

    // Copy tags
    if (data.copyEntities?.tags && sourceTrip.tagAssignments && Array.isArray(sourceTrip.tagAssignments)) {
      for (const tagAssignment of sourceTrip.tagAssignments) {
        await prisma.tripTagAssignment.create({
          data: {
            tripId: newTrip.id,
            tagId: tagAssignment.tagId,
          },
        });
      }
    }

    // Copy companions
    if (data.copyEntities?.companions && sourceTrip.companionAssignments && Array.isArray(sourceTrip.companionAssignments)) {
      for (const companionAssignment of sourceTrip.companionAssignments) {
        await prisma.tripCompanion.create({
          data: {
            tripId: newTrip.id,
            companionId: companionAssignment.companionId,
          },
        });
      }
    } else {
      // If not copying companions, add "Myself" companion by default
      const myselfCompanion = await companionService.getMyselfCompanion(userId);
      if (myselfCompanion) {
        await prisma.tripCompanion.create({
          data: {
            tripId: newTrip.id,
            companionId: myselfCompanion.id,
          },
        });
      }
    }

    // Copy checklists
    if (data.copyEntities?.checklists && sourceTrip.checklists && Array.isArray(sourceTrip.checklists)) {
      for (const checklist of sourceTrip.checklists) {
        const newChecklist = await prisma.checklist.create({
          data: {
            userId,
            tripId: newTrip.id,
            name: checklist.name,
            description: checklist.description,
            type: checklist.type,
            isDefault: checklist.isDefault,
            sortOrder: checklist.sortOrder,
          },
        });

        // Copy checklist items
        if (checklist.items && Array.isArray(checklist.items)) {
          for (const item of checklist.items) {
            await prisma.checklistItem.create({
              data: {
                checklistId: newChecklist.id,
                name: item.name,
                description: item.description,
                isChecked: false, // Reset checked state
                isDefault: item.isDefault,
                sortOrder: item.sortOrder,
                metadata: item.metadata,
              },
            });
          }
        }
      }
    }

    // Return the new trip with basic includes
    const duplicatedTrip = await prisma.trip.findUnique({
      where: { id: newTrip.id },
      include: {
        coverPhoto: true,
        bannerPhoto: true,
        tagAssignments: {
          include: {
            tag: true,
          },
        },
        companionAssignments: {
          include: {
            companion: true,
          },
        },
      },
    });

    return convertDecimals(duplicatedTrip);
  }
}

export default new TripService();
