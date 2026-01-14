import { z } from 'zod';

// Entity types that can be linked
export const entityTypeEnum = z.enum([
  'PHOTO',
  'LOCATION',
  'ACTIVITY',
  'LODGING',
  'TRANSPORTATION',
  'JOURNAL_ENTRY',
  'PHOTO_ALBUM',
]);

export type EntityType = z.infer<typeof entityTypeEnum>;

// Relationship types
export const linkRelationshipEnum = z.enum([
  'RELATED',
  'TAKEN_AT',
  'OCCURRED_AT',
  'PART_OF',
  'DOCUMENTS',
  'FEATURED_IN',
]);

export type LinkRelationship = z.infer<typeof linkRelationshipEnum>;

// Create a single link
export const createEntityLinkSchema = z.object({
  tripId: z.number().int().positive(),
  sourceType: entityTypeEnum,
  sourceId: z.number().int().positive(),
  targetType: entityTypeEnum,
  targetId: z.number().int().positive(),
  relationship: linkRelationshipEnum.optional().default('RELATED'),
  sortOrder: z.number().int().optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateEntityLinkInput = z.infer<typeof createEntityLinkSchema>;

// Bulk create links (one source to many targets)
export const bulkCreateEntityLinksSchema = z.object({
  tripId: z.number().int().positive(),
  sourceType: entityTypeEnum,
  sourceId: z.number().int().positive(),
  targets: z.array(
    z.object({
      targetType: entityTypeEnum,
      targetId: z.number().int().positive(),
      relationship: linkRelationshipEnum.optional().default('RELATED'),
      sortOrder: z.number().int().optional(),
      notes: z.string().max(1000).optional(),
    })
  ).min(1).max(100),
});

export type BulkCreateEntityLinksInput = z.infer<typeof bulkCreateEntityLinksSchema>;

// Query links from an entity
export const getLinksFromEntitySchema = z.object({
  tripId: z.number().int().positive(),
  sourceType: entityTypeEnum,
  sourceId: z.number().int().positive(),
  targetType: entityTypeEnum.optional(), // Filter by target type
});

export type GetLinksFromEntityInput = z.infer<typeof getLinksFromEntitySchema>;

// Query links to an entity
export const getLinksToEntitySchema = z.object({
  tripId: z.number().int().positive(),
  targetType: entityTypeEnum,
  targetId: z.number().int().positive(),
  sourceType: entityTypeEnum.optional(), // Filter by source type
});

export type GetLinksToEntityInput = z.infer<typeof getLinksToEntitySchema>;

// Delete a specific link
export const deleteEntityLinkSchema = z.object({
  tripId: z.number().int().positive(),
  sourceType: entityTypeEnum,
  sourceId: z.number().int().positive(),
  targetType: entityTypeEnum,
  targetId: z.number().int().positive(),
});

export type DeleteEntityLinkInput = z.infer<typeof deleteEntityLinkSchema>;

// Convenience schemas for common operations
export const linkPhotoToEntitySchema = z.object({
  tripId: z.number().int().positive(),
  photoId: z.number().int().positive(),
  targetType: entityTypeEnum,
  targetId: z.number().int().positive(),
  relationship: linkRelationshipEnum.optional(),
});

export type LinkPhotoToEntityInput = z.infer<typeof linkPhotoToEntitySchema>;

export const bulkLinkPhotosSchema = z.object({
  tripId: z.number().int().positive(),
  photoIds: z.array(z.number().int().positive()).min(1).max(100),
  targetType: entityTypeEnum,
  targetId: z.number().int().positive(),
  relationship: linkRelationshipEnum.optional(),
});

export type BulkLinkPhotosInput = z.infer<typeof bulkLinkPhotosSchema>;

// Response types
export interface EntityLinkResponse {
  id: number;
  tripId: number;
  sourceType: EntityType;
  sourceId: number;
  targetType: EntityType;
  targetId: number;
  relationship: LinkRelationship;
  sortOrder: number | null;
  notes: string | null;
  createdAt: Date;
}

// Enriched link with entity details
export interface EnrichedEntityLink extends EntityLinkResponse {
  sourceEntity?: {
    id: number;
    name?: string;
    title?: string;
    caption?: string;
    thumbnailPath?: string;
  };
  targetEntity?: {
    id: number;
    name?: string;
    title?: string;
    caption?: string;
    thumbnailPath?: string;
  };
}

// Link summary for an entity (count by type)
export interface EntityLinkSummary {
  entityType: EntityType;
  entityId: number;
  linkCounts: {
    [key in EntityType]?: number;
  };
  totalLinks: number;
}
