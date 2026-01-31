import prisma from '../config/database';
import { AppError } from '../utils/errors';
import {
  CreateTravelDocumentInput,
  UpdateTravelDocumentInput,
  TravelDocumentResponse,
  DocumentValidityCheck,
  DocumentValidityIssue,
  DocumentAlert,
  maskDocumentNumber,
  DocumentType,
} from '../types/travelDocument.types';
import { buildConditionalUpdateData, tripDateTransformer } from '../utils/serviceHelpers';
import { TravelDocument } from '@prisma/client';

/**
 * Calculates the expiration status based on days until expiry
 */
function calculateExpirationStatus(
  expiryDate: Date | null
): 'expired' | 'critical' | 'warning' | 'caution' | 'valid' {
  if (!expiryDate) return 'valid';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'critical'; // < 1 month - red
  if (daysUntilExpiry <= 90) return 'warning'; // 1-3 months - orange
  if (daysUntilExpiry <= 180) return 'caution'; // 3-6 months - yellow
  return 'valid'; // > 6 months - green
}

/**
 * Calculates days until expiry
 */
function calculateDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Transforms a Prisma TravelDocument to API response format with masked document number
 */
function toResponse(doc: TravelDocument): TravelDocumentResponse {
  return {
    id: doc.id,
    userId: doc.userId,
    type: doc.type as DocumentType,
    issuingCountry: doc.issuingCountry,
    documentNumber: maskDocumentNumber(doc.documentNumber),
    issueDate: doc.issueDate ? doc.issueDate.toISOString().split('T')[0] : null,
    expiryDate: doc.expiryDate ? doc.expiryDate.toISOString().split('T')[0] : null,
    name: doc.name,
    notes: doc.notes,
    isPrimary: doc.isPrimary,
    alertDaysBefore: doc.alertDaysBefore,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    expirationStatus: calculateExpirationStatus(doc.expiryDate),
    daysUntilExpiry: calculateDaysUntilExpiry(doc.expiryDate),
  };
}

class TravelDocumentService {
  /**
   * Create a new travel document
   */
  async create(userId: number, data: CreateTravelDocumentInput): Promise<TravelDocumentResponse> {
    // Use transaction to ensure atomic isPrimary update
    const document = await prisma.$transaction(async (tx) => {
      // If setting as primary, unset other primary documents of same type
      if (data.isPrimary) {
        await tx.travelDocument.updateMany({
          where: { userId, type: data.type, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.travelDocument.create({
        data: {
          userId,
          type: data.type,
          issuingCountry: data.issuingCountry,
          documentNumber: data.documentNumber || null,
          issueDate: data.issueDate ? tripDateTransformer(data.issueDate) : null,
          expiryDate: data.expiryDate ? tripDateTransformer(data.expiryDate) : null,
          name: data.name,
          notes: data.notes || null,
          isPrimary: data.isPrimary ?? false,
          alertDaysBefore: data.alertDaysBefore ?? 180,
        },
      });
    });

    return toResponse(document);
  }

  /**
   * Get all travel documents for a user
   */
  async getAll(userId: number): Promise<TravelDocumentResponse[]> {
    const documents = await prisma.travelDocument.findMany({
      where: { userId },
      orderBy: [
        { type: 'asc' },
        { isPrimary: 'desc' },
        { expiryDate: 'asc' },
      ],
    });

    return documents.map(toResponse);
  }

  /**
   * Get a single travel document by ID
   */
  async getById(userId: number, documentId: number): Promise<TravelDocumentResponse> {
    const document = await prisma.travelDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new AppError('Travel document not found', 404);
    }

    return toResponse(document);
  }

  /**
   * Update a travel document
   */
  async update(
    userId: number,
    documentId: number,
    data: UpdateTravelDocumentInput
  ): Promise<TravelDocumentResponse> {
    const existing = await prisma.travelDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!existing) {
      throw new AppError('Travel document not found', 404);
    }

    // Use transaction to ensure atomic isPrimary update
    const document = await prisma.$transaction(async (tx) => {
      // If setting as primary, unset other primary documents of same type
      const newType = data.type ?? existing.type;
      if (data.isPrimary === true) {
        await tx.travelDocument.updateMany({
          where: {
            userId,
            type: newType,
            isPrimary: true,
            id: { not: documentId },
          },
          data: { isPrimary: false },
        });
      }

      const updateData = buildConditionalUpdateData(data, {
        transformers: {
          issueDate: (val) => tripDateTransformer(val as string | null),
          expiryDate: (val) => tripDateTransformer(val as string | null),
        },
      });

      return tx.travelDocument.update({
        where: { id: documentId },
        data: updateData as Parameters<typeof prisma.travelDocument.update>[0]['data'],
      });
    });

    return toResponse(document);
  }

  /**
   * Delete a travel document
   */
  async delete(userId: number, documentId: number): Promise<void> {
    const document = await prisma.travelDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new AppError('Travel document not found', 404);
    }

    await prisma.travelDocument.delete({
      where: { id: documentId },
    });
  }

  /**
   * Get documents requiring attention (expiring within their alert window)
   */
  async getDocumentsRequiringAttention(userId: number): Promise<DocumentAlert[]> {
    const documents = await prisma.travelDocument.findMany({
      where: { userId },
      orderBy: { expiryDate: 'asc' },
    });

    const alerts: DocumentAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const doc of documents) {
      if (!doc.expiryDate) continue;

      const expiry = new Date(doc.expiryDate);
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if within alert window
      if (daysUntilExpiry <= doc.alertDaysBefore) {
        let alertType: 'expired' | 'critical' | 'warning' | 'caution';
        let message: string;

        if (daysUntilExpiry <= 0) {
          alertType = 'expired';
          message = `${doc.name} has expired`;
        } else if (daysUntilExpiry <= 30) {
          alertType = 'critical';
          message = `${doc.name} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;
        } else if (daysUntilExpiry <= 90) {
          alertType = 'warning';
          message = `${doc.name} expires in ${Math.ceil(daysUntilExpiry / 30)} month${daysUntilExpiry > 60 ? 's' : ''}`;
        } else {
          alertType = 'caution';
          message = `${doc.name} expires in ${Math.ceil(daysUntilExpiry / 30)} months`;
        }

        alerts.push({
          document: toResponse(doc),
          alertType,
          message,
        });
      }
    }

    return alerts;
  }

  /**
   * Check document validity for a specific trip
   */
  async checkDocumentValidityForTrip(
    userId: number,
    tripId: number
  ): Promise<DocumentValidityCheck> {
    // Get trip details (allow owner or collaborators)
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          { collaborators: { some: { userId } } },
        ],
      },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    // Get user's documents
    const documents = await prisma.travelDocument.findMany({
      where: { userId },
    });

    const issues: DocumentValidityIssue[] = [];

    for (const doc of documents) {
      // Only check passports and visas for trips
      if (doc.type !== 'PASSPORT' && doc.type !== 'VISA') continue;

      if (!doc.expiryDate) {
        issues.push({
          documentId: doc.id,
          documentType: doc.type as DocumentType,
          documentName: doc.name,
          issue: 'no_expiry_date',
          expiryDate: null,
          daysUntilExpiry: null,
          message: `${doc.name} has no expiry date set`,
        });
        continue;
      }

      const expiry = new Date(doc.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysUntilExpiry = calculateDaysUntilExpiry(doc.expiryDate);

      // Check if expired
      if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
        issues.push({
          documentId: doc.id,
          documentType: doc.type as DocumentType,
          documentName: doc.name,
          issue: 'expired',
          expiryDate: expiry.toISOString().split('T')[0],
          daysUntilExpiry,
          message: `${doc.name} has expired`,
        });
        continue;
      }

      // Check if expires during trip
      if (trip.endDate && expiry <= trip.endDate) {
        issues.push({
          documentId: doc.id,
          documentType: doc.type as DocumentType,
          documentName: doc.name,
          issue: 'expires_during_trip',
          expiryDate: expiry.toISOString().split('T')[0],
          daysUntilExpiry,
          message: `${doc.name} expires during the trip`,
        });
        continue;
      }

      // Check if expires soon after trip (many countries require 6 months validity)
      if (trip.endDate) {
        const sixMonthsAfterTrip = new Date(trip.endDate);
        sixMonthsAfterTrip.setMonth(sixMonthsAfterTrip.getMonth() + 6);

        if (expiry < sixMonthsAfterTrip && doc.type === 'PASSPORT') {
          issues.push({
            documentId: doc.id,
            documentType: doc.type as DocumentType,
            documentName: doc.name,
            issue: 'expires_soon',
            expiryDate: expiry.toISOString().split('T')[0],
            daysUntilExpiry,
            message: `${doc.name} may not have 6 months validity after trip end`,
          });
        }
      }
    }

    return {
      tripId,
      tripTitle: trip.title,
      tripStartDate: trip.startDate?.toISOString().split('T')[0] ?? null,
      tripEndDate: trip.endDate?.toISOString().split('T')[0] ?? null,
      issues,
      passesCheck: issues.filter(i => i.issue === 'expired' || i.issue === 'expires_during_trip').length === 0,
    };
  }

  /**
   * Get user's primary passport
   */
  async getPrimaryPassport(userId: number): Promise<TravelDocumentResponse | null> {
    const document = await prisma.travelDocument.findFirst({
      where: {
        userId,
        type: 'PASSPORT',
        isPrimary: true,
      },
    });

    if (!document) {
      // If no primary passport, get the first passport
      const firstPassport = await prisma.travelDocument.findFirst({
        where: {
          userId,
          type: 'PASSPORT',
        },
        orderBy: { createdAt: 'asc' },
      });

      return firstPassport ? toResponse(firstPassport) : null;
    }

    return toResponse(document);
  }
}

export default new TravelDocumentService();
