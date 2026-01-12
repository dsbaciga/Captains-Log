import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { BackupData, BACKUP_VERSION, RestoreOptions } from '../types/backup.types';
import { AppError } from '../utils/errors';

/**
 * Restore user data from a backup
 */
export async function restoreFromBackup(
  userId: number,
  backupData: BackupData,
  options: RestoreOptions = { clearExistingData: true, importPhotos: true }
): Promise<{ success: boolean; message: string; stats: any }> {
  // Validate backup version
  if (backupData.version !== BACKUP_VERSION) {
    throw new AppError(
      `Incompatible backup version. Expected ${BACKUP_VERSION}, got ${backupData.version}`,
      400
    );
  }

  const stats = {
    tripsImported: 0,
    locationsImported: 0,
    photosImported: 0,
    activitiesImported: 0,
    transportationImported: 0,
    lodgingImported: 0,
    journalEntriesImported: 0,
    tagsImported: 0,
    companionsImported: 0,
  };

  try {
    // Use a transaction to ensure atomicity
    await prisma.$transaction(
      async (tx: any) => {
        // Step 1: Clear existing data if requested
        if (options.clearExistingData) {
          await clearUserData(userId, tx);
        }

        // Step 2: Update user settings
        await tx.user.update({
          where: { id: userId },
          data: {
            timezone: backupData.user.timezone,
            activityCategories: backupData.user.activityCategories as Prisma.JsonArray,
            immichApiUrl: backupData.user.immichApiUrl,
            immichApiKey: backupData.user.immichApiKey,
            weatherApiKey: backupData.user.weatherApiKey,
          },
        });

        // Step 3: Import tags
        const tagMap = new Map<string, number>(); // old name -> new ID
        for (const tag of backupData.tags) {
          const created = await tx.tripTag.create({
            data: {
              userId,
              name: tag.name,
              color: tag.color,
              textColor: tag.textColor,
            },
          });
          tagMap.set(tag.name, created.id);
          stats.tagsImported++;
        }

        // Step 4: Import companions
        const companionMap = new Map<string, number>(); // old name -> new ID
        for (const companion of backupData.companions) {
          const created = await tx.travelCompanion.create({
            data: {
              userId,
              name: companion.name,
              email: companion.email,
              phone: companion.phone,
              notes: companion.notes,
              relationship: companion.relationship,
              isMyself: companion.isMyself,
              avatarUrl: companion.avatarUrl,
            },
          });
          companionMap.set(companion.name, created.id);
          stats.companionsImported++;
        }

        // Step 5: Import custom location categories
        const locationCategoryMap = new Map<string, number>(); // old name -> new ID
        for (const category of backupData.locationCategories) {
          const created = await tx.locationCategory.create({
            data: {
              userId,
              name: category.name,
              icon: category.icon,
              color: category.color,
              isDefault: category.isDefault,
            },
          });
          locationCategoryMap.set(category.name, created.id);
        }

        // Step 6: Import global checklists
        for (const checklist of backupData.checklists) {
          await tx.checklist.create({
            data: {
              userId,
              name: checklist.name,
              description: checklist.description,
              type: checklist.type,
              isDefault: checklist.isDefault,
              sortOrder: checklist.sortOrder,
              items: {
                create: checklist.items,
              },
            },
          });
        }

        // Step 7: Import trips with all related data
        for (const tripData of backupData.trips) {
          // Create the trip
          const trip = await tx.trip.create({
            data: {
              userId,
              title: tripData.title,
              description: tripData.description,
              startDate: tripData.startDate ? new Date(tripData.startDate) : null,
              endDate: tripData.endDate ? new Date(tripData.endDate) : null,
              timezone: tripData.timezone,
              status: tripData.status,
              privacyLevel: tripData.privacyLevel,
              addToPlacesVisited: tripData.addToPlacesVisited,
            },
          });
          stats.tripsImported++;

          // Import locations (build ID mapping)
          const locationMap = new Map<number, number>(); // old ID -> new ID
          for (const locationData of tripData.locations || []) {
            // Find category ID if category exists
            let categoryId = null;
            if (locationData.category) {
              categoryId = locationCategoryMap.get(locationData.category.name) || null;
            }

            const location = await tx.location.create({
              data: {
                tripId: trip.id,
                parentId: null, // Set later in second pass
                name: locationData.name,
                address: locationData.address,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                categoryId,
                visitDatetime: locationData.visitDatetime ? new Date(locationData.visitDatetime) : null,
                visitDurationMinutes: locationData.visitDurationMinutes,
                notes: locationData.notes,
              },
            });
            locationMap.set(locationData.id, location.id);
            stats.locationsImported++;
          }

          // Second pass: update parent location IDs
          for (const locationData of tripData.locations || []) {
            if (locationData.parentId) {
              const newLocationId = locationMap.get(locationData.id);
              const newParentId = locationMap.get(locationData.parentId);
              if (newLocationId && newParentId) {
                await tx.location.update({
                  where: { id: newLocationId },
                  data: { parentId: newParentId },
                });
              }
            }
          }

          // Import photos
          const photoMap = new Map<number, number>(); // old ID -> new ID
          if (options.importPhotos) {
            for (const photoData of tripData.photos || []) {
              const photo = await tx.photo.create({
                data: {
                  tripId: trip.id,
                  source: photoData.source,
                  immichAssetId: photoData.immichAssetId,
                  localPath: photoData.localPath,
                  thumbnailPath: photoData.thumbnailPath,
                  caption: photoData.caption,
                  latitude: photoData.latitude,
                  longitude: photoData.longitude,
                  takenAt: photoData.takenAt ? new Date(photoData.takenAt) : null,
                },
              });
              photoMap.set(photoData.id, photo.id);
              stats.photosImported++;
            }
          }

          // Import activities (build ID mapping)
          const activityMap = new Map<number, number>(); // old ID -> new ID
          for (const activityData of tripData.activities || []) {
            const activity = await tx.activity.create({
              data: {
                tripId: trip.id,
                locationId: activityData.locationId ? locationMap.get(activityData.locationId) : null,
                parentId: null, // Set later in second pass
                name: activityData.name,
                description: activityData.description,
                category: activityData.category,
                allDay: activityData.allDay,
                startTime: activityData.startTime ? new Date(activityData.startTime) : null,
                endTime: activityData.endTime ? new Date(activityData.endTime) : null,
                timezone: activityData.timezone,
                cost: activityData.cost,
                currency: activityData.currency,
                bookingUrl: activityData.bookingUrl,
                bookingReference: activityData.bookingReference,
                notes: activityData.notes,
                manualOrder: activityData.manualOrder,
              },
            });
            activityMap.set(activityData.id, activity.id);
            stats.activitiesImported++;
          }

          // Second pass: update parent activity IDs
          for (const activityData of tripData.activities || []) {
            if (activityData.parentId) {
              const newActivityId = activityMap.get(activityData.id);
              const newParentId = activityMap.get(activityData.parentId);
              if (newActivityId && newParentId) {
                await tx.activity.update({
                  where: { id: newActivityId },
                  data: { parentId: newParentId },
                });
              }
            }
          }

          // Import transportation
          const transportationMap = new Map<number, number>(); // old ID -> new ID
          for (const transportData of tripData.transportation || []) {
            const transportation = await tx.transportation.create({
              data: {
                tripId: trip.id,
                type: transportData.type,
                startLocationId: transportData.startLocationId
                  ? locationMap.get(transportData.startLocationId)
                  : null,
                startLocationText: transportData.startLocationText,
                endLocationId: transportData.endLocationId
                  ? locationMap.get(transportData.endLocationId)
                  : null,
                endLocationText: transportData.endLocationText,
                scheduledStart: transportData.scheduledStart ? new Date(transportData.scheduledStart) : null,
                scheduledEnd: transportData.scheduledEnd ? new Date(transportData.scheduledEnd) : null,
                startTimezone: transportData.startTimezone,
                endTimezone: transportData.endTimezone,
                actualStart: transportData.actualStart ? new Date(transportData.actualStart) : null,
                actualEnd: transportData.actualEnd ? new Date(transportData.actualEnd) : null,
                company: transportData.company,
                referenceNumber: transportData.referenceNumber,
                seatNumber: transportData.seatNumber,
                bookingReference: transportData.bookingReference,
                bookingUrl: transportData.bookingUrl,
                cost: transportData.cost,
                currency: transportData.currency,
                status: transportData.status,
                delayMinutes: transportData.delayMinutes,
                notes: transportData.notes,
                connectionGroupId: transportData.connectionGroupId,
                isAutoGenerated: transportData.isAutoGenerated,
                calculatedDistance: transportData.calculatedDistance,
                calculatedDuration: transportData.calculatedDuration,
                distanceSource: transportData.distanceSource,
              },
            });
            transportationMap.set(transportData.id, transportation.id);
            stats.transportationImported++;

            // Import flight tracking if exists
            if (transportData.flightTracking) {
              await tx.flightTracking.create({
                data: {
                  transportationId: transportation.id,
                  flightNumber: transportData.flightTracking.flightNumber,
                  airlineCode: transportData.flightTracking.airlineCode,
                  status: transportData.flightTracking.status,
                  gate: transportData.flightTracking.gate,
                  terminal: transportData.flightTracking.terminal,
                  baggageClaim: transportData.flightTracking.baggageClaim,
                },
              });
            }
          }

          // Import lodging
          const lodgingMap = new Map<number, number>(); // old ID -> new ID
          for (const lodgingData of tripData.lodging || []) {
            const lodging = await tx.lodging.create({
              data: {
                tripId: trip.id,
                locationId: lodgingData.locationId ? locationMap.get(lodgingData.locationId) : null,
                type: lodgingData.type,
                name: lodgingData.name,
                address: lodgingData.address,
                checkInDate: new Date(lodgingData.checkInDate),
                checkOutDate: new Date(lodgingData.checkOutDate),
                timezone: lodgingData.timezone,
                confirmationNumber: lodgingData.confirmationNumber,
                bookingUrl: lodgingData.bookingUrl,
                cost: lodgingData.cost,
                currency: lodgingData.currency,
                notes: lodgingData.notes,
              },
            });
            lodgingMap.set(lodgingData.id, lodging.id);
            stats.lodgingImported++;
          }

          // Import journal entries
          for (const journalData of tripData.journalEntries || []) {
            const journal = await tx.journalEntry.create({
              data: {
                tripId: trip.id,
                date: journalData.date ? new Date(journalData.date) : null,
                title: journalData.title,
                content: journalData.content,
                entryType: journalData.entryType,
                mood: journalData.mood,
                weatherNotes: journalData.weatherNotes,
              },
            });
            stats.journalEntriesImported++;

            // Link photos
            if (journalData.photoIds && options.importPhotos) {
              for (const oldPhotoId of journalData.photoIds) {
                const newPhotoId = photoMap.get(oldPhotoId);
                if (newPhotoId) {
                  await tx.journalPhoto.create({
                    data: {
                      journalId: journal.id,
                      photoId: newPhotoId,
                    },
                  });
                }
              }
            }

            // Link locations
            if (journalData.locationIds) {
              for (const oldLocationId of journalData.locationIds) {
                const newLocationId = locationMap.get(oldLocationId);
                if (newLocationId) {
                  await tx.journalLocation.create({
                    data: {
                      journalId: journal.id,
                      locationId: newLocationId,
                    },
                  });
                }
              }
            }

            // Link activities
            if (journalData.activityIds) {
              for (const oldActivityId of journalData.activityIds) {
                const newActivityId = activityMap.get(oldActivityId);
                if (newActivityId) {
                  await tx.journalActivity.create({
                    data: {
                      journalId: journal.id,
                      activityId: newActivityId,
                    },
                  });
                }
              }
            }

            // Link lodging
            if (journalData.lodgingIds) {
              for (const oldLodgingId of journalData.lodgingIds) {
                const newLodgingId = lodgingMap.get(oldLodgingId);
                if (newLodgingId) {
                  await tx.journalLodging.create({
                    data: {
                      journalId: journal.id,
                      lodgingId: newLodgingId,
                    },
                  });
                }
              }
            }

            // Link transportation
            if (journalData.transportationIds) {
              for (const oldTransportId of journalData.transportationIds) {
                const newTransportId = transportationMap.get(oldTransportId);
                if (newTransportId) {
                  await tx.journalTransportation.create({
                    data: {
                      journalId: journal.id,
                      transportationId: newTransportId,
                    },
                  });
                }
              }
            }
          }

          // Import photo albums
          for (const albumData of tripData.photoAlbums || []) {
            const album = await tx.photoAlbum.create({
              data: {
                tripId: trip.id,
                name: albumData.name,
                description: albumData.description,
                locationId: albumData.locationId ? locationMap.get(albumData.locationId) : null,
                activityId: albumData.activityId ? activityMap.get(albumData.activityId) : null,
                lodgingId: albumData.lodgingId ? lodgingMap.get(albumData.lodgingId) : null,
                coverPhotoId: albumData.coverPhotoId ? photoMap.get(albumData.coverPhotoId) : null,
              },
            });

            // Link photos to album
            if (albumData.photos && options.importPhotos) {
              for (const photoRef of albumData.photos) {
                const newPhotoId = photoMap.get(photoRef.photoId);
                if (newPhotoId) {
                  await tx.photoAlbumAssignment.create({
                    data: {
                      albumId: album.id,
                      photoId: newPhotoId,
                      sortOrder: photoRef.sortOrder,
                    },
                  });
                }
              }
            }
          }

          // Import weather data
          for (const weatherData of tripData.weatherData || []) {
            await tx.weatherData.create({
              data: {
                tripId: trip.id,
                locationId: weatherData.locationId ? locationMap.get(weatherData.locationId) : null,
                date: new Date(weatherData.date),
                temperatureHigh: weatherData.temperatureHigh,
                temperatureLow: weatherData.temperatureLow,
                conditions: weatherData.conditions,
                precipitation: weatherData.precipitation,
                humidity: weatherData.humidity,
                windSpeed: weatherData.windSpeed,
              },
            });
          }

          // Link tags to trip
          if (tripData.tags) {
            for (const tagName of tripData.tags) {
              const tagId = tagMap.get(tagName);
              if (tagId) {
                await tx.tripTagAssignment.create({
                  data: {
                    tripId: trip.id,
                    tagId,
                  },
                });
              }
            }
          }

          // Link companions to trip
          if (tripData.companions) {
            for (const companionName of tripData.companions) {
              const companionId = companionMap.get(companionName);
              if (companionId) {
                await tx.tripCompanion.create({
                  data: {
                    tripId: trip.id,
                    companionId,
                  },
                });
              }
            }
          }

          // Import trip-specific checklists
          for (const checklistData of tripData.checklists || []) {
            await tx.checklist.create({
              data: {
                userId,
                tripId: trip.id,
                name: checklistData.name,
                description: checklistData.description,
                type: checklistData.type,
                isDefault: checklistData.isDefault,
                sortOrder: checklistData.sortOrder,
                items: {
                  create: checklistData.items,
                },
              },
            });
          }
        }
      },
      {
        maxWait: 60000, // 60 seconds
        timeout: 300000, // 5 minutes
      }
    );

    return {
      success: true,
      message: 'Data restored successfully',
      stats,
    };
  } catch (error) {
    console.error('Error restoring from backup:', error);
    throw new AppError('Failed to restore from backup: ' + (error as Error).message, 500);
  }
}

/**
 * Clear all user data (for restore with clearExistingData option)
 */
async function clearUserData(userId: number, tx: Prisma.TransactionClient) {
  // Delete all trips (cascades to most related entities)
  await tx.trip.deleteMany({
    where: { userId },
  });

  // Delete tags
  await tx.tripTag.deleteMany({
    where: { userId },
  });

  // Delete companions
  await tx.travelCompanion.deleteMany({
    where: { userId },
  });

  // Delete custom location categories
  await tx.locationCategory.deleteMany({
    where: { userId },
  });

  // Delete global checklists
  await tx.checklist.deleteMany({
    where: {
      userId,
      tripId: null,
    },
  });
}

export default {
  restoreFromBackup,
};
