// Entity types that can be linked
export type EntityType =
  | 'PHOTO'
  | 'LOCATION'
  | 'ACTIVITY'
  | 'LODGING'
  | 'TRANSPORTATION'
  | 'JOURNAL_ENTRY'
  | 'PHOTO_ALBUM';

// Relationship types
export type LinkRelationship =
  | 'RELATED'
  | 'TAKEN_AT'
  | 'OCCURRED_AT'
  | 'PART_OF'
  | 'DOCUMENTS'
  | 'FEATURED_IN';

// Entity link response from API
export interface EntityLink {
  id: number;
  tripId: number;
  sourceType: EntityType;
  sourceId: number;
  targetType: EntityType;
  targetId: number;
  relationship: LinkRelationship;
  sortOrder: number | null;
  notes: string | null;
  createdAt: string;
}

// Entity details for display
export interface EntityDetails {
  id: number;
  name?: string;
  title?: string;
  caption?: string;
  thumbnailPath?: string;
  date?: string; // ISO date string, used for journal entries to filter by day
}

// Enriched link with entity details
export interface EnrichedEntityLink extends EntityLink {
  sourceEntity?: EntityDetails;
  targetEntity?: EntityDetails;
}

// Link summary for an entity
export interface EntityLinkSummary {
  entityType: EntityType;
  entityId: number;
  linkCounts: Partial<Record<EntityType, number>>;
  totalLinks: number;
}

// Create a single link
export interface CreateEntityLinkInput {
  sourceType: EntityType;
  sourceId: number;
  targetType: EntityType;
  targetId: number;
  relationship?: LinkRelationship;
  sortOrder?: number;
  notes?: string;
}

// Bulk create links (one source to many targets)
export interface BulkCreateEntityLinksInput {
  sourceType: EntityType;
  sourceId: number;
  targets: {
    targetType: EntityType;
    targetId: number;
    relationship?: LinkRelationship;
    sortOrder?: number;
    notes?: string;
  }[];
}

// Bulk link photos to a target
export interface BulkLinkPhotosInput {
  photoIds: number[];
  targetType: EntityType;
  targetId: number;
  relationship?: LinkRelationship;
}

// Delete a specific link
export interface DeleteEntityLinkInput {
  sourceType: EntityType;
  sourceId: number;
  targetType: EntityType;
  targetId: number;
}

// Update a link (relationship and notes only)
export interface UpdateEntityLinkInput {
  relationship?: LinkRelationship;
  notes?: string | null;
}

// Bulk operation result
export interface BulkLinkResult {
  created: number;
  skipped: number;
}

// All links for an entity response
export interface EntityLinksResponse {
  linksFrom: EnrichedEntityLink[];
  linksTo: EnrichedEntityLink[];
  summary: EntityLinkSummary;
}

// Trip link summary (map of entity key to summary)
export type TripLinkSummary = Record<string, EntityLinkSummary>;

// Helper to create entity key
export function getEntityKey(entityType: EntityType, entityId: number): string {
  return `${entityType}:${entityId}`;
}

// Valid entity types for validation
const VALID_ENTITY_TYPES: EntityType[] = [
  'PHOTO',
  'LOCATION',
  'ACTIVITY',
  'LODGING',
  'TRANSPORTATION',
  'JOURNAL_ENTRY',
  'PHOTO_ALBUM',
];

// Helper to validate entity type
function isValidEntityType(value: string): value is EntityType {
  return VALID_ENTITY_TYPES.includes(value as EntityType);
}

// Helper to parse entity key
export function parseEntityKey(key: string): { entityType: EntityType; entityId: number } | null {
  const parts = key.split(':');
  if (parts.length !== 2) return null;

  const [typeStr, idStr] = parts;

  // Validate entity type
  if (!isValidEntityType(typeStr)) return null;

  // Validate entity ID
  const entityId = parseInt(idStr, 10);
  if (isNaN(entityId) || entityId <= 0) return null;

  return {
    entityType: typeStr,
    entityId,
  };
}

// NOTE: Entity type and relationship configuration is now centralized in lib/entityConfig.ts
// Import ENTITY_TYPE_CONFIG, RELATIONSHIP_CONFIG, etc. from '../lib/entityConfig' instead
