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

// Helper to parse entity key
export function parseEntityKey(key: string): { entityType: EntityType; entityId: number } | null {
  const parts = key.split(':');
  if (parts.length !== 2) return null;
  return {
    entityType: parts[0] as EntityType,
    entityId: parseInt(parts[1], 10),
  };
}

// Entity type display configuration
export const ENTITY_TYPE_CONFIG: Record<
  EntityType,
  { label: string; emoji: string; color: string }
> = {
  PHOTO: { label: 'Photo', emoji: '📷', color: 'gray' },
  LOCATION: { label: 'Location', emoji: '📍', color: 'blue' },
  ACTIVITY: { label: 'Activity', emoji: '🎯', color: 'green' },
  LODGING: { label: 'Lodging', emoji: '🏨', color: 'purple' },
  TRANSPORTATION: { label: 'Transportation', emoji: '🚗', color: 'orange' },
  JOURNAL_ENTRY: { label: 'Journal', emoji: '📝', color: 'yellow' },
  PHOTO_ALBUM: { label: 'Album', emoji: '📸', color: 'pink' },
};

// Relationship type display configuration
export const RELATIONSHIP_CONFIG: Record<LinkRelationship, { label: string; description: string }> =
  {
    RELATED: { label: 'Related', description: 'Generic relationship' },
    TAKEN_AT: { label: 'Taken at', description: 'Photo taken at this location' },
    OCCURRED_AT: { label: 'Occurred at', description: 'Event occurred at this location' },
    PART_OF: { label: 'Part of', description: 'Sub-item or nested element' },
    DOCUMENTS: { label: 'Documents', description: 'Journal entry about this item' },
    FEATURED_IN: { label: 'Featured in', description: 'Included in album or journal' },
  };
