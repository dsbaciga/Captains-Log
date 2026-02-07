import prisma from '../config/database';
import { BACKUP_VERSION, type BackupData } from '../types/backup.types';
import { maskDocumentNumber } from '../types/travelDocument.types';
import { AppError } from '../utils/errors';

/**
 * Create a complete backup of all user data
 */
export async function createBackup(userId: number): Promise<BackupData> {
  try {
    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        timezone: true,
        activityCategories: true,
        tripTypes: true,
        immichApiUrl: true,
        immichApiKey: true,
        weatherApiKey: true,
        aviationstackApiKey: true,
        openrouteserviceApiKey: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Fetch tags
    const tags = await prisma.tripTag.findMany({
      where: { userId },
      select: {
        name: true,
        color: true,
        textColor: true,
      },
    });

    // Fetch companions
    const companions = await prisma.travelCompanion.findMany({
      where: { userId },
      select: {
        name: true,
        email: true,
        phone: true,
        notes: true,
        relationship: true,
        isMyself: true,
        avatarUrl: true,
        dietaryPreferences: true,
      },
    });

    // Fetch custom location categories
    const locationCategories = await prisma.locationCategory.findMany({
      where: { userId },
      select: {
        name: true,
        icon: true,
        color: true,
        isDefault: true,
      },
    });

    // Fetch checklists (not trip-specific)
    const checklists = await prisma.checklist.findMany({
      where: {
        userId,
        tripId: null, // Only global checklists
      },
      include: {
        items: {
          select: {
            name: true,
            description: true,
            isChecked: true,
            isDefault: true,
            sortOrder: true,
            metadata: true,
            checkedAt: true,
          },
        },
      },
    });

    // Fetch travel documents (mask document numbers for security)
    const travelDocuments = await prisma.travelDocument.findMany({
      where: { userId },
      select: {
        type: true,
        issuingCountry: true,
        documentNumber: true,
        issueDate: true,
        expiryDate: true,
        name: true,
        notes: true,
        isPrimary: true,
        alertDaysBefore: true,
      },
    });

    // Fetch trip series
    const tripSeries = await prisma.tripSeries.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    // Fetch all trips with all related data
    const trips = await prisma.trip.findMany({
      where: { userId },
      include: {
        // Trip basic info
        locations: {
          include: {
            category: {
              select: {
                name: true,
                icon: true,
                color: true,
                isDefault: true,
              },
            },
            children: true,
          },
        },
        photos: {
          select: {
            id: true, // Needed for EntityLink lookup and album photo mapping
            source: true,
            immichAssetId: true,
            localPath: true,
            thumbnailPath: true,
            caption: true,
            latitude: true,
            longitude: true,
            takenAt: true,
          },
        },
        activities: {
          select: {
            id: true, // Needed for EntityLink lookup
            parentId: true,
            name: true,
            description: true,
            category: true,
            allDay: true,
            startTime: true,
            endTime: true,
            timezone: true,
            cost: true,
            currency: true,
            bookingUrl: true,
            bookingReference: true,
            notes: true,
            manualOrder: true,
          },
        },
        transportation: {
          include: {
            flightTracking: {
              select: {
                flightNumber: true,
                airlineCode: true,
                status: true,
                gate: true,
                terminal: true,
                baggageClaim: true,
              },
            },
          },
        },
        lodging: {
          select: {
            id: true, // Needed for EntityLink lookup
            type: true,
            name: true,
            address: true,
            checkInDate: true,
            checkOutDate: true,
            timezone: true,
            confirmationNumber: true,
            bookingUrl: true,
            cost: true,
            currency: true,
            notes: true,
          },
        },
        journalEntries: true,
        photoAlbums: {
          include: {
            photoAssignments: {
              select: {
                photoId: true,
                sortOrder: true,
              },
            },
          },
        },
        weatherData: {
          select: {
            locationId: true,
            date: true,
            temperatureHigh: true,
            temperatureLow: true,
            conditions: true,
            precipitation: true,
            humidity: true,
            windSpeed: true,
          },
        },
        tagAssignments: {
          include: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
        companionAssignments: {
          include: {
            companion: {
              select: {
                name: true,
              },
            },
          },
        },
        checklists: {
          include: {
            items: {
              select: {
                name: true,
                description: true,
                isChecked: true,
                isDefault: true,
                sortOrder: true,
                metadata: true,
                checkedAt: true,
              },
            },
          },
        },
        // EntityLinks - stores relationships between entities (photos↔locations, activities↔locations, etc.)
        entityLinks: {
          select: {
            sourceType: true,
            sourceId: true,
            targetType: true,
            targetId: true,
            relationship: true,
            sortOrder: true,
            notes: true,
          },
        },
        // Trip languages for language helper feature
        languages: {
          select: {
            languageCode: true,
            language: true,
          },
        },
      },
    });

    // Build backup data
    const backupData: BackupData = {
      version: BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      user: user as any,
      tags,
      companions,
      locationCategories,
      checklists: checklists.map((checklist) => ({
        name: checklist.name,
        description: checklist.description,
        type: checklist.type,
        isDefault: checklist.isDefault,
        sortOrder: checklist.sortOrder,
        items: checklist.items,
      })),
      // Trip series
      tripSeries: tripSeries.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
      // Travel documents with masked document numbers for security
      travelDocuments: travelDocuments.map((doc) => ({
        type: doc.type,
        issuingCountry: doc.issuingCountry,
        // Mask document number: show only last 4 characters
        documentNumber: maskDocumentNumber(doc.documentNumber),
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        name: doc.name,
        notes: doc.notes,
        isPrimary: doc.isPrimary,
        alertDaysBefore: doc.alertDaysBefore,
      })),
      trips: trips.map((trip) => ({
        // Trip basic info
        title: trip.title,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        timezone: trip.timezone,
        status: trip.status,
        tripType: trip.tripType,
        tripTypeEmoji: trip.tripTypeEmoji,
        privacyLevel: trip.privacyLevel,
        coverPhotoId: trip.coverPhotoId,
        bannerPhotoId: trip.bannerPhotoId,
        addToPlacesVisited: trip.addToPlacesVisited,
        seriesId: trip.seriesId,
        seriesOrder: trip.seriesOrder,

        // Related entities
        locations: trip.locations,
        photos: trip.photos,
        activities: trip.activities,
        transportation: trip.transportation.map((t) => ({
          type: t.type,
          startLocationId: t.startLocationId,
          startLocationText: t.startLocationText,
          endLocationId: t.endLocationId,
          endLocationText: t.endLocationText,
          scheduledStart: t.scheduledStart,
          scheduledEnd: t.scheduledEnd,
          startTimezone: t.startTimezone,
          endTimezone: t.endTimezone,
          actualStart: t.actualStart,
          actualEnd: t.actualEnd,
          company: t.company,
          referenceNumber: t.referenceNumber,
          seatNumber: t.seatNumber,
          bookingReference: t.bookingReference,
          bookingUrl: t.bookingUrl,
          cost: t.cost,
          currency: t.currency,
          status: t.status,
          delayMinutes: t.delayMinutes,
          notes: t.notes,
          connectionGroupId: t.connectionGroupId,
          isAutoGenerated: t.isAutoGenerated,
          calculatedDistance: t.calculatedDistance,
          calculatedDuration: t.calculatedDuration,
          distanceSource: t.distanceSource,
          flightTracking: t.flightTracking,
        })),
        lodging: trip.lodging,
        journalEntries: trip.journalEntries.map((j) => ({
          date: j.date,
          title: j.title,
          content: j.content,
          entryType: j.entryType,
          mood: j.mood,
          weatherNotes: j.weatherNotes,
        })),
        // Note: Location, Activity, and Lodging associations are now handled via EntityLinks
        photoAlbums: trip.photoAlbums.map((a) => ({
          name: a.name,
          description: a.description,
          coverPhotoId: a.coverPhotoId,
          photos: a.photoAssignments.map((p) => ({
            photoId: p.photoId,
            sortOrder: p.sortOrder,
          })),
        })),
        weatherData: trip.weatherData,
        tags: trip.tagAssignments.map((t) => t.tag.name),
        companions: trip.companionAssignments.map((c) => c.companion.name),
        checklists: trip.checklists.map((checklist) => ({
          name: checklist.name,
          description: checklist.description,
          type: checklist.type,
          isDefault: checklist.isDefault,
          sortOrder: checklist.sortOrder,
          items: checklist.items,
        })),
        // EntityLinks - stores relationships between entities
        entityLinks: trip.entityLinks,
        // Trip languages for language helper feature
        tripLanguages: trip.languages.map((tl) => ({
          languageCode: tl.languageCode,
          language: tl.language,
        })),
      })),
    };

    return backupData;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new AppError('Failed to create backup', 500);
  }
}

export default {
  createBackup,
};
