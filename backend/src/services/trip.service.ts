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

    // Build orderBy based on sort option (database-level sorting)
    let orderBy: any[];
    if (sortOption === 'startDate-desc') {
      // Newest first: nulls last, then by date desc, then by createdAt desc
      orderBy = [
        { startDate: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ];
    } else if (sortOption === 'startDate-asc') {
      // Oldest first: nulls last, then by date asc
      orderBy = [
        { startDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ];
    } else if (sortOption === 'title-asc') {
      orderBy = [{ title: 'asc' }];
    } else if (sortOption === 'title-desc') {
      orderBy = [{ title: 'desc' }];
    } else if (sortOption === 'status') {
      orderBy = [{ status: 'asc' }, { createdAt: 'desc' }];
    } else {
      // Default fallback
      orderBy = [{ startDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    }

    // Fetch trips with database-level pagination and sorting
    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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

    return {
      trips: trips.map((trip) => convertDecimals(trip)),
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
        // Note: Activity and Lodging locations are handled via EntityLink system (copied separately)
        activities: data.copyEntities?.activities ? true : false,
        transportation: data.copyEntities?.transportation ? {
          include: {
            startLocation: true,
            endLocation: true,
          },
        } : false,
        lodging: data.copyEntities?.lodging ? true : false,
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

    // Copy locations (with parent-child hierarchy) - requires sequential for parent references
    if (data.copyEntities?.locations && sourceTrip.locations && Array.isArray(sourceTrip.locations)) {
      // First pass: bulk insert locations without parent references
      const locationsWithoutParent = sourceTrip.locations.filter((loc: any) => !loc.parentId);
      if (locationsWithoutParent.length > 0) {
        await prisma.location.createMany({
          data: locationsWithoutParent.map((location: any) => ({
            tripId: newTrip.id,
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            categoryId: location.categoryId,
            visitDatetime: null,
            visitDurationMinutes: location.visitDurationMinutes,
            notes: location.notes,
          })),
        });
        // Query back to build ID map (match by name within the new trip)
        const newLocations = await prisma.location.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, name: true },
        });
        const newLocationsByName = new Map(newLocations.map(l => [l.name, l.id]));
        for (const location of locationsWithoutParent) {
          const newId = newLocationsByName.get(location.name);
          if (newId) locationIdMap.set(location.id, newId);
        }
      }

      // Second pass: child locations need sequential creation due to parent FK
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

    // Copy photos using bulk insert
    if (data.copyEntities?.photos && sourceTrip.photos && Array.isArray(sourceTrip.photos)) {
      const photos = sourceTrip.photos as any[];
      if (photos.length > 0) {
        await prisma.photo.createMany({
          data: photos.map((photo: any) => ({
            tripId: newTrip.id,
            source: photo.source,
            immichAssetId: photo.immichAssetId,
            localPath: photo.localPath,
            thumbnailPath: photo.thumbnailPath,
            caption: photo.caption,
            latitude: photo.latitude,
            longitude: photo.longitude,
            takenAt: photo.takenAt,
          })),
        });
        // Query back and build ID map using localPath/immichAssetId as unique identifiers
        const newPhotos = await prisma.photo.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, localPath: true, immichAssetId: true },
        });
        for (const oldPhoto of photos) {
          const newPhoto = newPhotos.find(
            (p) => p.localPath === oldPhoto.localPath && p.immichAssetId === oldPhoto.immichAssetId
          );
          if (newPhoto) photoIdMap.set(oldPhoto.id, newPhoto.id);
        }
      }
    }

    // Copy activities (with parent-child hierarchy)
    if (data.copyEntities?.activities && sourceTrip.activities && Array.isArray(sourceTrip.activities)) {
      // First pass: bulk insert activities without parent
      const activitiesWithoutParent = sourceTrip.activities.filter((act: any) => !act.parentId);
      if (activitiesWithoutParent.length > 0) {
        await prisma.activity.createMany({
          data: activitiesWithoutParent.map((activity: any) => ({
            tripId: newTrip.id,
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
          })),
        });
        // Query back to build ID map
        const newActivities = await prisma.activity.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, name: true },
        });
        const newActivitiesByName = new Map(newActivities.map(a => [a.name, a.id]));
        for (const activity of activitiesWithoutParent) {
          const newId = newActivitiesByName.get(activity.name);
          if (newId) activityIdMap.set(activity.id, newId);
        }
      }

      // Second pass: child activities need sequential creation due to parent FK
      const activitiesWithParent = sourceTrip.activities.filter((act: any) => act.parentId);
      for (const activity of activitiesWithParent) {
        const newParentId = activityIdMap.get(activity.parentId);
        const newActivity = await prisma.activity.create({
          data: {
            tripId: newTrip.id,
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

    // Copy transportation using bulk insert
    if (data.copyEntities?.transportation && sourceTrip.transportation && Array.isArray(sourceTrip.transportation)) {
      const transportations = sourceTrip.transportation as any[];
      if (transportations.length > 0) {
        await prisma.transportation.createMany({
          data: transportations.map((transport: any) => ({
            tripId: newTrip.id,
            type: transport.type,
            startLocationId: transport.startLocationId ? locationIdMap.get(transport.startLocationId) || null : null,
            startLocationText: transport.startLocationText,
            endLocationId: transport.endLocationId ? locationIdMap.get(transport.endLocationId) || null : null,
            endLocationText: transport.endLocationText,
            scheduledStart: null,
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
            connectionGroupId: transport.connectionGroupId,
            isAutoGenerated: transport.isAutoGenerated,
            calculatedDistance: transport.calculatedDistance,
            calculatedDuration: transport.calculatedDuration,
            distanceSource: transport.distanceSource,
          })),
        });
        // Query back and build ID map using type + referenceNumber + company as identifier
        const newTransports = await prisma.transportation.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, type: true, referenceNumber: true, company: true, startLocationText: true },
        });
        for (const oldTransport of transportations) {
          const newTransport = newTransports.find(
            (t) => t.type === oldTransport.type &&
                   t.referenceNumber === oldTransport.referenceNumber &&
                   t.company === oldTransport.company &&
                   t.startLocationText === oldTransport.startLocationText
          );
          if (newTransport) transportationIdMap.set(oldTransport.id, newTransport.id);
        }
      }
    }

    // Copy lodging using bulk insert
    if (data.copyEntities?.lodging && sourceTrip.lodging && Array.isArray(sourceTrip.lodging)) {
      const lodgings = sourceTrip.lodging as any[];
      if (lodgings.length > 0) {
        await prisma.lodging.createMany({
          data: lodgings.map((lodging: any) => ({
            tripId: newTrip.id,
            type: lodging.type,
            name: lodging.name,
            address: lodging.address,
            checkInDate: new Date(),
            checkOutDate: new Date(),
            timezone: lodging.timezone,
            confirmationNumber: lodging.confirmationNumber,
            bookingUrl: lodging.bookingUrl,
            cost: lodging.cost,
            currency: lodging.currency,
            notes: lodging.notes,
          })),
        });
        // Query back and build ID map
        const newLodgings = await prisma.lodging.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, name: true, address: true },
        });
        for (const oldLodging of lodgings) {
          const newLodging = newLodgings.find(
            (l) => l.name === oldLodging.name && l.address === oldLodging.address
          );
          if (newLodging) lodgingIdMap.set(oldLodging.id, newLodging.id);
        }
      }
    }

    // Copy journal entries using bulk insert
    if (data.copyEntities?.journalEntries && sourceTrip.journalEntries && Array.isArray(sourceTrip.journalEntries)) {
      const journals = sourceTrip.journalEntries as any[];
      if (journals.length > 0) {
        await prisma.journalEntry.createMany({
          data: journals.map((journal: any) => ({
            tripId: newTrip.id,
            date: null,
            title: journal.title,
            content: journal.content,
            entryType: journal.entryType,
            mood: journal.mood,
            weatherNotes: journal.weatherNotes,
          })),
        });
        // Query back and build ID map
        const newJournals = await prisma.journalEntry.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, title: true, entryType: true },
        });
        for (const oldJournal of journals) {
          const newJournal = newJournals.find(
            (j) => j.title === oldJournal.title && j.entryType === oldJournal.entryType
          );
          if (newJournal) journalIdMap.set(oldJournal.id, newJournal.id);
        }
      }
    }

    // Copy photo albums (need to process individually for photo assignments, but bulk insert assignments)
    if (data.copyEntities?.photoAlbums && sourceTrip.photoAlbums && Array.isArray(sourceTrip.photoAlbums)) {
      const albums = sourceTrip.photoAlbums as any[];
      if (albums.length > 0) {
        // Create albums without cover photos first
        await prisma.photoAlbum.createMany({
          data: albums.map((album: any) => ({
            tripId: newTrip.id,
            name: album.name,
            description: album.description,
            coverPhotoId: null, // Set later after we have the mapping
          })),
        });
        // Query back and build ID map
        const newAlbums = await prisma.photoAlbum.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, name: true },
        });
        for (const oldAlbum of albums) {
          const newAlbum = newAlbums.find((a) => a.name === oldAlbum.name);
          if (newAlbum) albumIdMap.set(oldAlbum.id, newAlbum.id);
        }

        // Update cover photos now that we have mappings
        const coverPhotoUpdates = albums
          .filter((album: any) => album.coverPhotoId && photoIdMap.get(album.coverPhotoId))
          .map((album: any) => {
            const newAlbumId = albumIdMap.get(album.id);
            const newCoverPhotoId = photoIdMap.get(album.coverPhotoId);
            if (newAlbumId && newCoverPhotoId) {
              return prisma.photoAlbum.update({
                where: { id: newAlbumId },
                data: { coverPhotoId: newCoverPhotoId },
              });
            }
            return null;
          })
          .filter((update): update is NonNullable<typeof update> => update !== null);
        if (coverPhotoUpdates.length > 0) {
          await Promise.all(coverPhotoUpdates);
        }

        // Bulk insert photo album assignments
        const allAssignments: { albumId: number; photoId: number; sortOrder: number | null }[] = [];
        for (const album of albums) {
          const newAlbumId = albumIdMap.get(album.id);
          if (newAlbumId && album.photoAssignments && Array.isArray(album.photoAssignments)) {
            for (const assignment of album.photoAssignments) {
              const newPhotoId = photoIdMap.get(assignment.photoId);
              if (newPhotoId) {
                allAssignments.push({
                  albumId: newAlbumId,
                  photoId: newPhotoId,
                  sortOrder: assignment.sortOrder,
                });
              }
            }
          }
        }
        if (allAssignments.length > 0) {
          await prisma.photoAlbumAssignment.createMany({ data: allAssignments });
        }
      }
    }

    // Copy tags using bulk insert
    if (data.copyEntities?.tags && sourceTrip.tagAssignments && Array.isArray(sourceTrip.tagAssignments)) {
      const tagAssignments = sourceTrip.tagAssignments as any[];
      if (tagAssignments.length > 0) {
        await prisma.tripTagAssignment.createMany({
          data: tagAssignments.map((ta: any) => ({
            tripId: newTrip.id,
            tagId: ta.tagId,
          })),
        });
      }
    }

    // Copy companions using bulk insert
    if (data.copyEntities?.companions && sourceTrip.companionAssignments && Array.isArray(sourceTrip.companionAssignments)) {
      const companionAssignments = sourceTrip.companionAssignments as any[];
      if (companionAssignments.length > 0) {
        await prisma.tripCompanion.createMany({
          data: companionAssignments.map((ca: any) => ({
            tripId: newTrip.id,
            companionId: ca.companionId,
          })),
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

    // Copy checklists (need sequential for parent-child relationship with items)
    if (data.copyEntities?.checklists && sourceTrip.checklists && Array.isArray(sourceTrip.checklists)) {
      const checklists = sourceTrip.checklists as any[];
      if (checklists.length > 0) {
        // Create all checklists first
        await prisma.checklist.createMany({
          data: checklists.map((checklist: any) => ({
            userId,
            tripId: newTrip.id,
            name: checklist.name,
            description: checklist.description,
            type: checklist.type,
            isDefault: checklist.isDefault,
            sortOrder: checklist.sortOrder,
          })),
        });
        // Query back new checklists
        const newChecklists = await prisma.checklist.findMany({
          where: { tripId: newTrip.id },
          select: { id: true, name: true },
        });
        const checklistIdMap = new Map(checklists.map((c: any) => {
          const newChecklist = newChecklists.find((nc) => nc.name === c.name);
          return [c.id, newChecklist?.id] as [number, number | undefined];
        }));

        // Bulk insert all checklist items
        const allItems: any[] = [];
        for (const checklist of checklists) {
          const newChecklistId = checklistIdMap.get(checklist.id);
          if (newChecklistId && checklist.items && Array.isArray(checklist.items)) {
            for (const item of checklist.items) {
              allItems.push({
                checklistId: newChecklistId,
                name: item.name,
                description: item.description,
                isChecked: false,
                isDefault: item.isDefault,
                sortOrder: item.sortOrder,
                metadata: item.metadata,
              });
            }
          }
        }
        if (allItems.length > 0) {
          await prisma.checklistItem.createMany({ data: allItems });
        }
      }
    }

    // Copy entity links using bulk insert (must be done after all entities are copied)
    const entityLinks = await prisma.entityLink.findMany({
      where: { tripId: sourceTripId },
    });

    // Helper function to map old IDs to new IDs based on entity type
    const getNewId = (entityType: string, oldId: number): number | null => {
      switch (entityType) {
        case 'LOCATION':
          return locationIdMap.get(oldId) || null;
        case 'PHOTO':
          return photoIdMap.get(oldId) || null;
        case 'ACTIVITY':
          return activityIdMap.get(oldId) || null;
        case 'TRANSPORTATION':
          return transportationIdMap.get(oldId) || null;
        case 'LODGING':
          return lodgingIdMap.get(oldId) || null;
        case 'JOURNAL_ENTRY':
          return journalIdMap.get(oldId) || null;
        case 'PHOTO_ALBUM':
          return albumIdMap.get(oldId) || null;
        default:
          return null;
      }
    };

    // Build array of valid entity links for bulk insert
    const validLinks = entityLinks
      .map((link) => {
        const newSourceId = getNewId(link.sourceType, link.sourceId);
        const newTargetId = getNewId(link.targetType, link.targetId);
        if (newSourceId && newTargetId) {
          return {
            tripId: newTrip.id,
            sourceType: link.sourceType,
            sourceId: newSourceId,
            targetType: link.targetType,
            targetId: newTargetId,
            relationship: link.relationship,
            sortOrder: link.sortOrder,
            notes: link.notes,
          };
        }
        return null;
      })
      .filter((link): link is NonNullable<typeof link> => link !== null);

    if (validLinks.length > 0) {
      await prisma.entityLink.createMany({ data: validLinks });
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
