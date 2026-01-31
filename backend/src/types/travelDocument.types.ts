import { z } from 'zod';
import {
  optionalNullable,
  requiredStringWithMax,
  optionalStringWithMax,
  optionalBoolean,
  optionalNotes,
} from '../utils/zodHelpers';

// Document types matching Prisma enum
export const DOCUMENT_TYPES = [
  'PASSPORT',
  'VISA',
  'ID_CARD',
  'GLOBAL_ENTRY',
  'VACCINATION',
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

/**
 * Masks a document number to show only the last 4 characters.
 * Returns null if the input is null or undefined.
 * Example: "AB1234567" -> "***4567"
 */
export function maskDocumentNumber(documentNumber: string | null | undefined): string | null {
  if (!documentNumber) return null;

  const trimmed = documentNumber.trim();
  if (trimmed.length <= 4) {
    // If 4 or fewer characters, show all as masked
    return '*'.repeat(trimmed.length);
  }

  const lastFour = trimmed.slice(-4);
  return `***${lastFour}`;
}

// Create schema
export const createTravelDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  issuingCountry: requiredStringWithMax(100),
  documentNumber: z.string().max(255).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  name: requiredStringWithMax(500),
  notes: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
  alertDaysBefore: z.number().int().min(0).max(365).optional().default(180),
});

// Update schema
export const updateTravelDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES).optional(),
  issuingCountry: optionalNullable(requiredStringWithMax(100)),
  documentNumber: optionalStringWithMax(255),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  name: optionalNullable(requiredStringWithMax(500)),
  notes: optionalNotes(),
  isPrimary: optionalBoolean(),
  alertDaysBefore: z.number().int().min(0).max(365).optional().nullable(),
});

export type CreateTravelDocumentInput = z.infer<typeof createTravelDocumentSchema>;
export type UpdateTravelDocumentInput = z.infer<typeof updateTravelDocumentSchema>;

// Response type with masked document number
export interface TravelDocumentResponse {
  id: number;
  userId: number;
  type: DocumentType;
  issuingCountry: string;
  documentNumber: string | null; // Always masked in responses
  issueDate: string | null;
  expiryDate: string | null;
  name: string;
  notes: string | null;
  isPrimary: boolean;
  alertDaysBefore: number;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  expirationStatus?: 'expired' | 'critical' | 'warning' | 'caution' | 'valid';
  daysUntilExpiry?: number | null;
}

// Document validity check result for a trip
export interface DocumentValidityCheck {
  tripId: number;
  tripTitle: string;
  tripStartDate: string | null;
  tripEndDate: string | null;
  issues: DocumentValidityIssue[];
  passesCheck: boolean;
}

export interface DocumentValidityIssue {
  documentId: number;
  documentType: DocumentType;
  documentName: string;
  issue: 'expired' | 'expires_during_trip' | 'expires_soon' | 'no_expiry_date';
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  message: string;
}

// Alert response
export interface DocumentAlert {
  document: TravelDocumentResponse;
  alertType: 'expired' | 'critical' | 'warning' | 'caution';
  message: string;
}
