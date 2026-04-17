import { unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, sep } from 'path';
import { randomUUID } from 'crypto';
import prisma from '../config/database';
import { config } from '../config';
import logger from '../config/logger';
import { AppError } from '../utils/errors';
import { pdfParserService } from './pdfParser.service';
import activityService from './activity.service';
import lodgingService from './lodging.service';
import transportationService from './transportation.service';
import locationService from './location.service';
import type { UpdatePendingEntityInput } from '../types/pdfImport.types';
import {
  PdfImportStatus,
  PendingEntityType,
  PendingEntityStatus,
} from '@prisma/client';

// multer file shape
interface MulterFile {
  originalname: string;
  buffer?: Buffer;
  path?: string;
  size: number;
  mimetype: string;
}

const TRANSPORTATION_TYPES = ['flight', 'train', 'bus', 'car', 'ferry', 'bicycle', 'walk', 'other'] as const;
type TransportationTypeLiteral = (typeof TRANSPORTATION_TYPES)[number];

const LODGING_TYPES = ['hotel', 'hostel', 'airbnb', 'vacation_rental', 'camping', 'resort', 'motel', 'bed_and_breakfast', 'apartment', 'friends_family', 'other'] as const;
type LodgingTypeLiteral = (typeof LODGING_TYPES)[number];

function normalizeTransportationType(raw: unknown): TransportationTypeLiteral {
  if (typeof raw === 'string' && (TRANSPORTATION_TYPES as readonly string[]).includes(raw)) {
    return raw as TransportationTypeLiteral;
  }
  return 'other';
}

function normalizeLodgingType(raw: unknown): LodgingTypeLiteral {
  if (typeof raw === 'string' && (LODGING_TYPES as readonly string[]).includes(raw)) {
    return raw as LodgingTypeLiteral;
  }
  return 'other';
}

/** Extracts an optional string from parsed LLM data, returning undefined for non-strings. */
function optStr(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}

/**
 * Validate that storedPath does not escape the uploads directory.
 * Both sides are resolved to absolute paths so prefix-containment is sound
 * regardless of whether UPLOAD_DIR is configured as a relative or absolute path.
 */
function resolveStoredPath(storedPath: string): string {
  const uploadsDir = resolve(config.upload.dir);
  const absolute = resolve(uploadsDir, storedPath);
  if (absolute !== uploadsDir && !absolute.startsWith(uploadsDir + sep)) {
    throw new AppError('Invalid stored path', 400);
  }
  return absolute;
}

class PdfImportService {
  /**
   * Validates PDF magic bytes (%PDF) and uploads/processes the file.
   * Returns immediately after creating the DB record — processing is async.
   */
  async uploadAndProcess(
    userId: number,
    file: MulterFile,
    hintTripId?: number
  ) {
    if (!pdfParserService.isConfigured()) {
      throw new AppError('LLM not configured — cannot process PDFs. Set LLM_API_KEY to enable.', 503);
    }

    // Validate PDF magic bytes
    if (!file.buffer) {
      throw new AppError('File buffer is missing', 400);
    }
    const buffer = file.buffer;
    if (!buffer.slice(0, 4).toString('ascii').startsWith('%PDF')) {
      throw new AppError('Uploaded file is not a valid PDF', 400);
    }

    // Ensure upload directory exists
    const pdfDir = join(config.upload.dir, 'pdfs', String(userId));
    mkdirSync(pdfDir, { recursive: true });

    const storedFilename = `${randomUUID()}.pdf`;
    const storedPath = join('pdfs', String(userId), storedFilename); // relative
    const absolutePath = join(config.upload.dir, storedPath);

    // Create DB record FIRST so we can clean up on failure
    const pdfImport = await prisma.pdfImport.create({
      data: {
        userId,
        originalName: file.originalname,
        storedPath,
        fileSizeBytes: file.size,
        status: PdfImportStatus.UPLOADED,
      },
    });

    // Write file to disk — if this fails, mark import as PARSE_FAILED
    try {
      writeFileSync(absolutePath, buffer);
    } catch (err) {
      await prisma.pdfImport.update({
        where: { id: pdfImport.id },
        data: {
          status: PdfImportStatus.PARSE_FAILED,
          errorMessage: 'Failed to save uploaded file',
        },
      });
      throw new AppError('Failed to save uploaded file', 500);
    }

    // Atomically transition to PARSING (guard against concurrent calls)
    const updated = await prisma.pdfImport.updateMany({
      where: { id: pdfImport.id, status: PdfImportStatus.UPLOADED },
      data: { status: PdfImportStatus.PARSING },
    });
    if (updated.count === 0) {
      throw new AppError('Import already in progress', 409);
    }

    // Fire background processing (don't await)
    this.processInBackground(pdfImport.id, userId, absolutePath, file.originalname, hintTripId).catch(
      (err) => logger.error('PDF background processing failed', { pdfImportId: pdfImport.id, err })
    );

    return pdfImport;
  }

  /**
   * Background processing: extract text, call LLM, create PendingEntity records.
   */
  private async processInBackground(
    pdfImportId: number,
    userId: number,
    absolutePath: string,
    filename: string,
    hintTripId?: number
  ): Promise<void> {
    try {
      const text = await pdfParserService.extractText(absolutePath);
      const { entities } = await pdfParserService.parseDocument(text, filename);

      if (entities.length === 0) {
        await prisma.pdfImport.update({
          where: { id: pdfImportId },
          data: { status: PdfImportStatus.NO_ENTITIES, processedAt: new Date() },
        });
        return;
      }

      // Match trip for each entity or use hint
      await Promise.all(
        entities.map(async (entity) => {
          const matchedTripId = hintTripId ?? await this.matchTrip(userId, entity.data);
          return prisma.pendingEntity.create({
            data: {
              pdfImportId,
              userId,
              entityType: entity.type as PendingEntityType,
              parsedData: entity.data as Record<string, unknown>,
              confidence: entity.confidence,
              matchedTripId: matchedTripId ?? null,
            },
          });
        })
      );

      await prisma.pdfImport.update({
        where: { id: pdfImportId },
        data: { status: PdfImportStatus.PARSED, processedAt: new Date() },
      });
    } catch (err) {
      logger.error('PDF processing failed', { pdfImportId, err });
      await prisma.pdfImport.update({
        where: { id: pdfImportId },
        data: {
          status: PdfImportStatus.PARSE_FAILED,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          processedAt: new Date(),
        },
      });
    }
  }

  /**
   * Match a trip by date overlap from entity data dates.
   * Returns the most recently started trip that overlaps the entity dates.
   */
  private async matchTrip(userId: number, entityData: Record<string, unknown>): Promise<number | null> {
    const dateFields = ['checkInDate', 'checkOutDate', 'departureTime', 'arrivalTime', 'startTime', 'endTime', 'visitDate'];
    const dates: Date[] = [];
    for (const field of dateFields) {
      const val = entityData[field];
      if (typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) dates.push(d);
      }
    }
    if (dates.length === 0) return null;

    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

    const trip = await prisma.trip.findFirst({
      where: {
        userId,
        startDate: { lte: latest },
        endDate: { gte: earliest },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });
    return trip?.id ?? null;
  }

  async getPdfImports(userId: number, status?: string, limit = 20, offset = 0) {
    return prisma.pdfImport.findMany({
      where: { userId, ...(status ? { status: status as PdfImportStatus } : {}) },
      include: { _count: { select: { pendingEntities: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getPdfImportById(userId: number, id: number) {
    const record = await prisma.pdfImport.findFirst({
      where: { id, userId },
      include: { _count: { select: { pendingEntities: true } } },
    });
    if (!record) throw new AppError('PDF import not found', 404);
    return record;
  }

  async getPendingEntities(userId: number, opts: { pdfImportId?: number; status?: string; entityType?: string }) {
    return prisma.pendingEntity.findMany({
      where: {
        userId,
        ...(opts.pdfImportId !== undefined ? { pdfImportId: opts.pdfImportId } : {}),
        ...(opts.status ? { status: opts.status as PendingEntityStatus } : {}),
        ...(opts.entityType ? { entityType: opts.entityType as PendingEntityType } : {}),
      },
      include: { matchedTrip: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPendingCount(userId: number): Promise<number> {
    return prisma.pendingEntity.count({
      where: { userId, status: PendingEntityStatus.PENDING },
    });
  }

  async updatePendingEntity(userId: number, id: number, input: UpdatePendingEntityInput) {
    const entity = await prisma.pendingEntity.findFirst({ where: { id, userId } });
    if (!entity) throw new AppError('Pending entity not found', 404);
    if (entity.status !== PendingEntityStatus.PENDING) throw new AppError('Entity has already been reviewed', 400);

    return prisma.pendingEntity.update({
      where: { id },
      data: {
        ...(input.parsedData !== undefined ? { parsedData: input.parsedData as Record<string, unknown> } : {}),
        ...(input.matchedTripId !== undefined ? { matchedTripId: input.matchedTripId } : {}),
      },
    });
  }

  /**
   * Accept a pending entity: create the actual trip entity + EntityLink back to PDF.
   * Uses an atomic claim (updateMany WHERE status=PENDING) to prevent duplicate accepts.
   */
  async acceptPendingEntity(
    userId: number,
    id: number,
    tripId: number,
    overrides?: Record<string, unknown>
  ) {
    // Atomically claim the entity — only succeeds if it's still PENDING
    const claimed = await prisma.pendingEntity.updateMany({
      where: { id, userId, status: PendingEntityStatus.PENDING },
      data: { status: PendingEntityStatus.ACCEPTED, reviewedAt: new Date() },
    });
    if (claimed.count === 0) {
      // Could be 404 or already reviewed — check which
      const entity = await prisma.pendingEntity.findFirst({ where: { id, userId } });
      if (!entity) throw new AppError('Pending entity not found', 404);
      throw new AppError('Entity has already been reviewed', 400);
    }

    const entity = await prisma.pendingEntity.findFirst({
      where: { id, userId },
      include: { pdfImport: true },
    });
    if (!entity) throw new AppError('Pending entity not found', 404);

    // Verify user owns the trip
    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) {
      // Roll back the claim
      await prisma.pendingEntity.update({
        where: { id },
        data: { status: PendingEntityStatus.PENDING, reviewedAt: null },
      });
      throw new AppError('Trip not found or access denied', 404);
    }

    const data = { ...(entity.parsedData as Record<string, unknown>), ...overrides };
    let createdEntityId: number;
    const createdEntityType = entity.entityType;

    try {
      switch (entity.entityType) {
        case PendingEntityType.TRANSPORTATION:
          {
            const created = await transportationService.createTransportation(userId, {
              tripId,
              type: normalizeTransportationType(data.type),
              fromLocationName: optStr(data.fromLocationName),
              toLocationName: optStr(data.toLocationName),
              departureTime: optStr(data.departureTime),
              arrivalTime: optStr(data.arrivalTime),
              carrier: optStr(data.carrier),
              vehicleNumber: optStr(data.vehicleNumber),
              confirmationNumber: optStr(data.confirmationNumber),
              notes: optStr(data.notes),
            });
            createdEntityId = created.id;
          }
          break;
        case PendingEntityType.LODGING:
          {
            if (typeof data.checkInDate !== 'string' || typeof data.checkOutDate !== 'string') {
              throw new AppError('Lodging requires checkInDate and checkOutDate', 400);
            }
            const created = await lodgingService.createLodging(userId, {
              tripId,
              type: normalizeLodgingType(data.type),
              name: typeof data.name === 'string' ? data.name : 'Unnamed Lodging',
              address: optStr(data.address),
              checkInDate: data.checkInDate,
              checkOutDate: data.checkOutDate,
              confirmationNumber: optStr(data.confirmationNumber),
              notes: optStr(data.notes),
            });
            createdEntityId = created.id;
          }
          break;
        case PendingEntityType.ACTIVITY:
          {
            if (typeof data.name !== 'string') {
              throw new AppError('Activity requires a name', 400);
            }
            const created = await activityService.createActivity(userId, {
              tripId,
              name: data.name,
              description: optStr(data.description),
              startTime: optStr(data.startTime),
              endTime: optStr(data.endTime),
              bookingReference: optStr(data.bookingReference),
              notes: optStr(data.notes),
            });
            createdEntityId = created.id;
          }
          break;
        case PendingEntityType.LOCATION:
          {
            if (typeof data.name !== 'string') {
              throw new AppError('Location requires a name', 400);
            }
            const created = await locationService.createLocation(userId, {
              tripId,
              name: data.name,
              address: optStr(data.address),
            });
            createdEntityId = created.id;
          }
          break;
        default:
          throw new AppError('Unknown entity type', 400);
      }
    } catch (err) {
      // Roll back the claim so user can retry
      await prisma.pendingEntity.update({
        where: { id },
        data: { status: PendingEntityStatus.PENDING, reviewedAt: null },
      });
      throw err;
    }

    // Create EntityLink directly (bypassing createLink() which requires entity-in-trip validation for source)
    await prisma.entityLink.create({
      data: {
        tripId,
        sourceType: 'PDF_IMPORT',
        sourceId: entity.pdfImportId,
        targetType: entity.entityType,
        targetId: createdEntityId,
        relationship: 'RELATED',
      },
    });

    // Record the created entity on the pending entity row
    await prisma.pendingEntity.update({
      where: { id },
      data: { createdEntityId, createdEntityType },
    });

    return { createdEntityId, createdEntityType };
  }

  async rejectPendingEntity(userId: number, id: number) {
    const claimed = await prisma.pendingEntity.updateMany({
      where: { id, userId, status: PendingEntityStatus.PENDING },
      data: { status: PendingEntityStatus.REJECTED, reviewedAt: new Date() },
    });
    if (claimed.count === 0) {
      const entity = await prisma.pendingEntity.findFirst({ where: { id, userId } });
      if (!entity) throw new AppError('Pending entity not found', 404);
      throw new AppError('Entity has already been reviewed', 400);
    }
    return prisma.pendingEntity.findFirst({ where: { id } });
  }

  async reparseImport(userId: number, id: number) {
    const record = await prisma.pdfImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('PDF import not found', 404);
    if (record.status === PdfImportStatus.PARSING) {
      throw new AppError('Import is currently being parsed', 409);
    }

    // Delete existing PENDING entities (keep ACCEPTED/REJECTED)
    await prisma.pendingEntity.deleteMany({
      where: { pdfImportId: id, status: PendingEntityStatus.PENDING },
    });

    // Transition back to PARSING
    await prisma.pdfImport.update({
      where: { id },
      data: { status: PdfImportStatus.PARSING, errorMessage: null, processedAt: null },
    });

    const absolutePath = resolveStoredPath(record.storedPath);
    this.processInBackground(id, userId, absolutePath, record.originalName).catch(
      (err) => logger.error('PDF reparse failed', { pdfImportId: id, err })
    );
  }

  async deletePdfImport(userId: number, id: number) {
    const record = await prisma.pdfImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('PDF import not found', 404);

    const absolutePath = resolveStoredPath(record.storedPath);
    try {
      unlinkSync(absolutePath);
    } catch (err) {
      logger.warn('Could not delete PDF file from disk', { path: absolutePath, err });
    }

    await prisma.pdfImport.delete({ where: { id } });
  }

  /**
   * Reset imports stuck in PARSING for more than 10 minutes.
   * Must be awaited before server starts listening.
   */
  async resetStaleParsing(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stale = await prisma.pdfImport.findMany({
      where: {
        status: PdfImportStatus.PARSING,
        updatedAt: { lt: tenMinutesAgo },
      },
      select: { id: true },
    });

    for (const record of stale) {
      logger.warn('Resetting stale PDF import stuck in PARSING', { pdfImportId: record.id });
    }

    if (stale.length > 0) {
      await prisma.pdfImport.updateMany({
        where: {
          id: { in: stale.map((r) => r.id) },
          status: PdfImportStatus.PARSING,
        },
        data: {
          status: PdfImportStatus.PARSE_FAILED,
          errorMessage: 'Processing timed out and was reset on server restart',
        },
      });
    }
  }
}

export const pdfImportService = new PdfImportService();
