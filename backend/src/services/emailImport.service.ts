import prisma from '../config/database';
import config from '../config';
import logger from '../config/logger';
import gmailService from './gmail.service';
import emailParserService from './emailParser.service';
import appSettingsService from './appSettings.service';
import transportationService from './transportation.service';
import lodgingService from './lodging.service';
import activityService from './activity.service';
import locationService from './location.service';
import { Prisma, PendingEntityStatus, PendingEntityType } from '@prisma/client';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';
import { createTransportationSchema } from '../types/transportation.types';
import { createLodgingSchema } from '../types/lodging.types';
import { createActivitySchema } from '../types/activity.types';
import { createLocationSchema } from '../types/location.types';

// =============================================================================
// PROCESSING LOCK
// =============================================================================

let processingLock: { active: boolean; startedAt: number } = { active: false, startedAt: 0 };
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes — accounts for slow LLM responses with retries

// =============================================================================
// HEALTH TRACKING
// =============================================================================

let lastSuccessfulPoll: Date | null = null;
let lastError: string | null = null;
let consecutiveFailures: number = 0;

// =============================================================================
// SERVICE
// =============================================================================

class EmailImportService {
  /**
   * Apply DB settings as overrides to gmail and emailParser services.
   * DB values take priority; env vars serve as fallback.
   */
  private async applyDbSettings(): Promise<void> {
    try {
      const raw = await appSettingsService.getRawEmailImportSettings();
      gmailService.setOverrides({
        clientId: raw.gmailClientId,
        clientSecret: raw.gmailClientSecret,
        refreshToken: raw.gmailRefreshToken,
      });
      emailParserService.setOverrides({
        baseUrl: raw.llmBaseUrl,
        apiKey: raw.llmApiKey,
        model: raw.llmModel,
      });
    } catch (err) {
      logger.warn('[EmailImport] Failed to load DB settings, using env vars only', { error: err });
    }
  }

  /**
   * Check if both Gmail and LLM parser are configured (async, checks DB settings)
   */
  async isConfigured(): Promise<boolean> {
    await this.applyDbSettings();
    return gmailService.isConfigured() && emailParserService.isConfigured();
  }

  /**
   * Get the current configuration status for the email import system
   */
  async getConfigurationStatus(): Promise<{
    gmailConfigured: boolean;
    llmConfigured: boolean;
    enabled: boolean;
    inboxEmail: string;
    lastSuccessfulPoll: Date | null;
    lastError: string | null;
    consecutiveFailures: number;
  }> {
    await this.applyDbSettings();
    const raw = await appSettingsService.getRawEmailImportSettings();
    return {
      gmailConfigured: gmailService.isConfigured(),
      llmConfigured: emailParserService.isConfigured(),
      enabled: raw.emailImportEnabled ?? config.emailImport.enabled,
      inboxEmail: raw.gmailInboxEmail ?? config.emailImport.gmail.inboxEmail,
      lastSuccessfulPoll,
      lastError,
      consecutiveFailures,
    };
  }

  /**
   * Main pipeline: poll Gmail for unread emails, parse them with the LLM,
   * and create PendingEntity records for user review.
   *
   * Uses a timestamped processing lock that auto-expires after 10 minutes.
   * Emails are processed sequentially with 500ms delay between LLM calls.
   */
  async pollAndProcessEmails(): Promise<{ processed: number; errors: number }> {
    // Check and acquire processing lock
    const now = Date.now();
    if (processingLock.active && now - processingLock.startedAt < LOCK_TIMEOUT_MS) {
      logger.warn('[EmailImport] Processing already in progress, skipping poll');
      return { processed: 0, errors: 0 };
    }

    // Acquire lock
    processingLock = { active: true, startedAt: now };

    let processed = 0;
    let errors = 0;

    try {
      // Apply DB settings before polling
      await this.applyDbSettings();

      const emails = await gmailService.fetchUnreadEmails(config.emailImport.maxEmailsPerPoll);

      if (emails.length === 0) {
        logger.info('[EmailImport] No unread emails found');
        return { processed: 0, errors: 0 };
      }

      logger.info(`[EmailImport] Processing ${emails.length} email(s)`);

      for (const email of emails) {
        try {
          // a. Check duplicate by gmailMessageId
          const existing = await prisma.emailImport.findUnique({
            where: { gmailMessageId: email.messageId },
          });

          if (existing) {
            logger.debug(`[EmailImport] Skipping duplicate message: ${email.messageId}`);
            continue;
          }

          // b. Create EmailImport record with status FETCHED
          const emailImport = await prisma.emailImport.create({
            data: {
              gmailMessageId: email.messageId,
              threadId: email.threadId ?? null,
              subject: email.subject ?? null,
              fromAddress: email.fromAddress ?? null,
              forwardedBy: email.forwardedBy ?? null,
              rawContent: email.bodyText ?? null,
              status: 'FETCHED',
              receivedAt: email.receivedAt ?? null,
            },
          });

          // c. Extract forwardedBy email, match user
          const forwardedByEmail = email.forwardedBy;
          let userId: number | null = null;

          if (forwardedByEmail) {
            userId = await this.matchUser(forwardedByEmail);
          }

          // Also try From address if no user matched via forwardedBy
          if (!userId && email.fromAddress) {
            const fromEmail = email.fromAddress.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (fromEmail) {
              userId = await this.matchUser(fromEmail[0]);
            }
          }

          // d. If no user found, set status NO_USER
          if (!userId) {
            await prisma.emailImport.update({
              where: { id: emailImport.id },
              data: { status: 'NO_USER', rawContent: null },
            });

            await gmailService.markAsRead(email.messageId).catch((err) =>
              logger.error('[EmailImport] Failed to mark message as read', { error: err })
            );

            logger.info(`[EmailImport] No user matched for email from: ${email.forwardedBy ?? email.fromAddress}`);
            continue;
          }

          // Update EmailImport with matched user
          await prisma.emailImport.update({
            where: { id: emailImport.id },
            data: { userId },
          });

          // e. Set status PARSING, send to LLM parser
          await prisma.emailImport.update({
            where: { id: emailImport.id },
            data: { status: 'PARSING' },
          });

          let parseResult;
          try {
            parseResult = await emailParserService.parseEmail(
              email.bodyText,
              email.subject
            );
          } catch (parseError) {
            // f. If parse fails, set PARSE_FAILED with error message
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            await prisma.emailImport.update({
              where: { id: emailImport.id },
              data: {
                status: 'PARSE_FAILED',
                errorMessage,
                processedAt: new Date(),
              },
            });

            logger.error(`[EmailImport] Parse failed for message ${email.messageId}`, { error: parseError });
            errors++;

            await gmailService.markAsRead(email.messageId).catch((err) =>
              logger.error('[EmailImport] Failed to mark message as read', { error: err })
            );

            // 500ms delay between LLM calls
            await this.delay(500);
            continue;
          }

          // g. If no entities, set NO_ENTITIES
          if (parseResult.entities.length === 0) {
            await prisma.emailImport.update({
              where: { id: emailImport.id },
              data: {
                status: 'NO_ENTITIES',
                processedAt: new Date(),
              },
            });

            logger.info(`[EmailImport] No entities found in message ${email.messageId}`);
          } else {
            // h. Entities found - set PARSED, create PendingEntity records
            await prisma.emailImport.update({
              where: { id: emailImport.id },
              data: {
                status: 'PARSED',
                processedAt: new Date(),
              },
            });

            // Create PendingEntity records for each parsed entity
            for (const entity of parseResult.entities) {
              // i. Try to match a trip by date overlap
              const matchedTripId = await this.matchTrip(userId, entity.data, entity.entityType);

              await prisma.pendingEntity.create({
                data: {
                  emailImportId: emailImport.id,
                  userId,
                  entityType: entity.entityType,
                  parsedData: { ...entity.data, ...(entity.warnings?.length ? { _warnings: entity.warnings } : {}) },
                  confidence: entity.confidence,
                  matchedTripId: matchedTripId,
                  status: 'PENDING',
                },
              });
            }

            logger.info(
              `[EmailImport] Created ${parseResult.entities.length} pending entity(ies) from message ${email.messageId}`
            );
          }

          // j. rawContent is preserved until all pending entities are resolved
          //    (accepted/rejected) to allow reparsing with improved prompts.
          //    Cleared in acceptPendingEntity/rejectPendingEntity when none remain.

          // k. Mark Gmail message as read
          await gmailService.markAsRead(email.messageId).catch((err) =>
            logger.error('[EmailImport] Failed to mark message as read', { error: err })
          );

          processed++;

          // 500ms delay between LLM calls
          await this.delay(500);
        } catch (emailError) {
          logger.error(`[EmailImport] Error processing email ${email.messageId}`, { error: emailError });
          errors++;
        }
      }

      logger.info(`[EmailImport] Poll complete. Processed: ${processed}, Errors: ${errors}`);
      lastSuccessfulPoll = new Date();
      consecutiveFailures = 0;
      lastError = null;
      return { processed, errors };
    } catch (err) {
      consecutiveFailures++;
      lastError = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      // Release lock
      processingLock = { active: false, startedAt: 0 };
    }
  }

  /**
   * Match a user by their email or forwarding email (case-insensitive).
   * Returns the user's ID if found, or null if not.
   */
  async matchUser(email: string): Promise<number | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          { forwardingEmail: { equals: normalizedEmail, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    return user ? user.id : null;
  }

  /**
   * Find trips where the entity dates overlap the trip's startDate-endDate.
   * When multiple trips match, pick the one with the tightest date range.
   * Skip trips with null dates.
   */
  async matchTrip(
    userId: number,
    entityData: Record<string, unknown>,
    entityType: string
  ): Promise<number | null> {
    // Extract relevant date field names based on entity type
    const dateFieldNames: string[] = [];
    switch (entityType) {
      case 'TRANSPORTATION':
        dateFieldNames.push('departureTime', 'arrivalTime');
        break;
      case 'LODGING':
        dateFieldNames.push('checkInDate', 'checkOutDate');
        break;
      case 'ACTIVITY':
        dateFieldNames.push('startTime');
        break;
      case 'LOCATION':
        dateFieldNames.push('visitDatetime');
        break;
    }

    const entityDates: Date[] = [];
    for (const field of dateFieldNames) {
      const value = entityData[field];
      if (typeof value === 'string') {
        entityDates.push(new Date(value));
      }
    }

    // Filter out invalid dates
    const validDates = entityDates.filter((d) => !isNaN(d.getTime()));

    if (validDates.length === 0) {
      logger.debug(`[EmailImport] No valid dates found in ${entityType} entity for trip matching`);
      return null;
    }

    // Get all trips for this user that have both start and end dates
    const trips = await prisma.trip.findMany({
      where: {
        userId,
        startDate: { not: null },
        endDate: { not: null },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    // Find trips where any entity date falls within the trip's date range
    const matchingTrips: { id: number; rangeMs: number }[] = [];

    for (const trip of trips) {
      if (!trip.startDate || !trip.endDate) continue;

      const tripStart = new Date(trip.startDate);
      const tripEnd = new Date(trip.endDate);

      if (isNaN(tripStart.getTime()) || isNaN(tripEnd.getTime())) continue;

      // Set trip end to end of day for inclusive matching
      tripEnd.setUTCHours(23, 59, 59, 999);

      const overlaps = validDates.some((date) => date >= tripStart && date <= tripEnd);

      if (overlaps) {
        const rangeMs = tripEnd.getTime() - tripStart.getTime();
        matchingTrips.push({ id: trip.id, rangeMs });
      }
    }

    if (matchingTrips.length === 0) {
      logger.debug(`[EmailImport] No trip date overlap found for ${entityType} entity (dates: ${validDates.map(d => d.toISOString()).join(', ')})`);
      return null;
    }

    // Pick the trip with the tightest date range
    matchingTrips.sort((a, b) => a.rangeMs - b.rangeMs);
    return matchingTrips[0].id;
  }

  /**
   * Get a paginated list of EmailImports for a user, ordered by createdAt desc.
   * Includes a count of pendingEntities for each import.
   */
  async getEmailImports(
    userId: number,
    page: number,
    limit: number
  ): Promise<{
    imports: Prisma.EmailImportGetPayload<{ include: { _count: { select: { pendingEntities: true } } } }>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [imports, total] = await Promise.all([
      prisma.emailImport.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { pendingEntities: true },
          },
        },
      }),
      prisma.emailImport.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      imports,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get pending entities for a user with optional filters.
   * Includes emailImport and matchedTrip info.
   */
  async getPendingEntities(
    userId: number,
    filters?: { tripId?: number; status?: string; entityType?: string },
    page: number = 1,
    limit: number = 50
  ) {
    const where: Prisma.PendingEntityWhereInput = { userId };

    if (filters?.tripId) {
      where.matchedTripId = filters.tripId;
    }
    if (filters?.status) {
      where.status = filters.status as PendingEntityStatus;
    }
    if (filters?.entityType) {
      where.entityType = filters.entityType as PendingEntityType;
    }

    const skip = (page - 1) * limit;

    const [entities, total] = await Promise.all([
      prisma.pendingEntity.findMany({
        where,
        include: {
          emailImport: {
            select: {
              id: true,
              subject: true,
              fromAddress: true,
              forwardedBy: true,
              status: true,
              receivedAt: true,
              createdAt: true,
            },
          },
          matchedTrip: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pendingEntity.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      entities,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get the count of PENDING status entities for a user
   */
  async getPendingCount(userId: number): Promise<number> {
    return prisma.pendingEntity.count({
      where: {
        userId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Re-parse a failed email import by running the LLM parser again on the stored rawContent.
   */
  async reparseEmailImport(userId: number, emailImportId: number): Promise<{ parsed: number }> {
    const emailImport = await prisma.emailImport.findFirst({
      where: { id: emailImportId, userId },
    });

    if (!emailImport) {
      throw new AppError('Email import not found', 404);
    }

    if (!emailImport.rawContent) {
      throw new AppError('Email content is no longer available for reparsing', 400);
    }

    await this.applyDbSettings();

    if (!emailParserService.isConfigured()) {
      throw new AppError('LLM is not configured', 400);
    }

    // Set status to PARSING
    await prisma.emailImport.update({
      where: { id: emailImportId },
      data: { status: 'PARSING', errorMessage: null },
    });

    try {
      const parseResult = await emailParserService.parseEmail(
        emailImport.rawContent,
        emailImport.subject ?? ''
      );

      if (parseResult.entities.length === 0) {
        await prisma.emailImport.update({
          where: { id: emailImportId },
          data: { status: 'NO_ENTITIES', processedAt: new Date() },
        });
        return { parsed: 0 };
      }

      // Delete any existing pending entities from previous parse attempts
      await prisma.pendingEntity.deleteMany({
        where: { emailImportId, status: 'PENDING' },
      });

      await prisma.emailImport.update({
        where: { id: emailImportId },
        data: { status: 'PARSED', errorMessage: null, processedAt: new Date() },
      });

      for (const entity of parseResult.entities) {
        const matchedTripId = await this.matchTrip(userId, entity.data, entity.entityType);

        await prisma.pendingEntity.create({
          data: {
            emailImportId,
            userId,
            entityType: entity.entityType,
            parsedData: { ...entity.data, ...(entity.warnings?.length ? { _warnings: entity.warnings } : {}) },
            confidence: entity.confidence,
            matchedTripId,
            status: 'PENDING',
          },
        });
      }

      // rawContent preserved for future reparsing — cleared when entities are resolved

      logger.info(`[EmailImport] Reparse successful for import ${emailImportId}: ${parseResult.entities.length} entities`);
      return { parsed: parseResult.entities.length };
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      await prisma.emailImport.update({
        where: { id: emailImportId },
        data: { status: 'PARSE_FAILED', errorMessage, processedAt: new Date() },
      });
      throw new AppError(`Reparse failed: ${errorMessage}`, 400);
    }
  }

  /**
   * Accept a pending entity: create the actual entity in the appropriate service
   * and update the PendingEntity record.
   */
  async acceptPendingEntity(
    userId: number,
    id: number,
    overrides?: { tripId?: number; data?: Record<string, unknown> }
  ): Promise<{ entity: Record<string, unknown>; type: string }> {
    const pendingEntity = await prisma.pendingEntity.findFirst({
      where: { id, userId },
    });

    if (!pendingEntity) {
      throw new AppError('Pending entity not found', 404);
    }

    // Return 409 if already ACCEPTED
    if (pendingEntity.status === 'ACCEPTED') {
      throw new AppError('Entity has already been accepted', 409);
    }

    if (pendingEntity.status !== 'PENDING') {
      throw new AppError('Entity is not in PENDING status', 400);
    }

    // Merge overrides.data into parsedData if provided
    const storedData = typeof pendingEntity.parsedData === 'object' && pendingEntity.parsedData !== null
      ? pendingEntity.parsedData as Record<string, unknown>
      : {};
    const parsedData = {
      ...storedData,
      ...overrides?.data,
    };

    // Determine tripId
    const tripId = overrides?.tripId ?? pendingEntity.matchedTripId;

    if (!tripId) {
      throw new AppError('No trip selected. Please specify a trip for this entity.', 400);
    }

    // Verify trip ownership
    if (tripId) {
      const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { id: true } });
      if (!trip) {
        throw new AppError('Trip not found or does not belong to you', 404);
      }
    }

    // Inject tripId into the data
    const entityData: Record<string, unknown> = { ...parsedData, tripId };

    // Custom validation for LODGING: the lodging service silently defaults
    // missing dates to new Date(), which creates bad data.
    if (pendingEntity.entityType === 'LODGING') {
      if (!entityData.checkInDate) {
        throw new AppError(
          'Lodging entity is missing checkInDate. Please provide a check-in date before accepting.',
          400
        );
      }
      if (!entityData.checkOutDate) {
        throw new AppError(
          'Lodging entity is missing checkOutDate. Please provide a check-out date before accepting.',
          400
        );
      }
    }

    // Call the appropriate service create method with Zod validation
    let createdEntity: unknown;
    const entityType = pendingEntity.entityType;

    try {
      switch (entityType) {
        case 'TRANSPORTATION': {
          const validated = createTransportationSchema.parse(entityData);
          createdEntity = await transportationService.createTransportation(userId, validated);
          break;
        }

        case 'LODGING': {
          const validated = createLodgingSchema.parse(entityData);
          createdEntity = await lodgingService.createLodging(userId, validated);
          break;
        }

        case 'ACTIVITY': {
          const validated = createActivitySchema.parse(entityData);
          createdEntity = await activityService.createActivity(userId, validated);
          break;
        }

        case 'LOCATION': {
          const validated = createLocationSchema.parse(entityData);
          createdEntity = await locationService.createLocation(userId, validated);
          break;
        }

        default:
          throw new AppError(`Unknown entity type: ${entityType}`, 400);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new AppError(`Validation failed for ${entityType}: ${details}`, 400);
      }
      throw err;
    }

    // Get the created entity's ID
    const entityObj = createdEntity as { id?: number };
    const createdEntityId = typeof entityObj.id === 'number' ? entityObj.id : null;

    // Update PendingEntity with status ACCEPTED
    await prisma.pendingEntity.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        createdEntityId,
        reviewedAt: new Date(),
      },
    });

    // Clear rawContent when no pending entities remain (PII protection)
    await this.clearRawContentIfResolved(pendingEntity.emailImportId);

    return { entity: createdEntity as Record<string, unknown>, type: entityType };
  }

  /**
   * Reject a pending entity
   */
  async rejectPendingEntity(userId: number, id: number): Promise<void> {
    const pendingEntity = await prisma.pendingEntity.findFirst({
      where: { id, userId },
    });

    if (!pendingEntity) {
      throw new AppError('Pending entity not found', 404);
    }

    if (pendingEntity.status !== 'PENDING') {
      throw new AppError('Entity is not in PENDING status', 400);
    }

    await prisma.pendingEntity.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
      },
    });

    // Clear rawContent when no pending entities remain (PII protection)
    await this.clearRawContentIfResolved(pendingEntity.emailImportId);
  }

  /**
   * Clear rawContent from an email import once all its pending entities are resolved.
   * This protects PII while still allowing reparsing when entities are still pending.
   */
  private async clearRawContentIfResolved(emailImportId: number): Promise<void> {
    const pendingCount = await prisma.pendingEntity.count({
      where: { emailImportId, status: 'PENDING' },
    });

    if (pendingCount === 0) {
      await prisma.emailImport.update({
        where: { id: emailImportId },
        data: { rawContent: null },
      });
      logger.debug(`[EmailImport] Cleared rawContent for import ${emailImportId} (all entities resolved)`);
    }
  }

  /**
   * Update parsed data or matched trip for a pending entity.
   * Only allows updates on PENDING entities.
   */
  async updatePendingEntity(
    userId: number,
    id: number,
    data: { parsedData?: Record<string, unknown>; matchedTripId?: number | null }
  ): Promise<Prisma.PendingEntityGetPayload<object>> {
    const pendingEntity = await prisma.pendingEntity.findFirst({
      where: { id, userId },
    });

    if (!pendingEntity) {
      throw new AppError('Pending entity not found', 404);
    }

    if (pendingEntity.status !== 'PENDING') {
      throw new AppError('Can only update entities in PENDING status', 400);
    }

    // Verify trip ownership if matchedTripId is provided
    if (data.matchedTripId) {
      const trip = await prisma.trip.findFirst({ where: { id: data.matchedTripId, userId }, select: { id: true } });
      if (!trip) {
        throw new AppError('Trip not found or does not belong to you', 404);
      }
    }

    const updateData: Prisma.PendingEntityUncheckedUpdateInput = {};

    if (data.parsedData !== undefined) {
      updateData.parsedData = data.parsedData as Prisma.InputJsonValue;
    }

    if (data.matchedTripId !== undefined) {
      updateData.matchedTripId = data.matchedTripId;
    }

    const updated = await prisma.pendingEntity.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Clear rawContent from EmailImports with PARSE_FAILED status older than N days.
   * This is a data hygiene operation to reduce stored PII.
   */
  async cleanupOldRecords(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.emailImport.updateMany({
      where: {
        status: 'PARSE_FAILED',
        createdAt: { lt: cutoffDate },
        rawContent: { not: null },
      },
      data: {
        rawContent: null,
      },
    });

    logger.info(`[EmailImport] Cleaned up rawContent from ${result.count} old PARSE_FAILED record(s)`);
    return result.count;
  }

  /**
   * Utility: delay for a given number of milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new EmailImportService();
