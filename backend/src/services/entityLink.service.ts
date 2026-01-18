import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { verifyTripAccess } from '../utils/serviceHelpers';
import type {
  EntityType,
  LinkRelationship,
  CreateEntityLinkInput,
  BulkCreateEntityLinksInput,
  GetLinksFromEntityInput,
  GetLinksToEntityInput,
  DeleteEntityLinkInput,
  UpdateEntityLinkInput,
  BulkLinkPhotosInput,
  EntityLinkResponse,
  EnrichedEntityLink,
  EntityLinkSummary,
} from '../types/entityLink.types';

// Entity details return type
type EntityDetails = { id: number; name?: string; title?: string; caption?: string; thumbnailPath?: string };

/**
 * Configuration for entity type operations
 * Maps entity types to their verification and details functions
 */
const ENTITY_CONFIG: Record<EntityType, {
  findInTrip: (tripId: number, entityId: number) => Promise<any>;
  getDetails: (entityId: number) => Promise<EntityDetails | null>;
}> = {
  PHOTO: {
    findInTrip: (tripId, entityId) => prisma.photo.findFirst({ where: { id: entityId, tripId } }),
    getDetails: async (entityId) => {
      const photo = await prisma.photo.findUnique({
        where: { id: entityId },
        select: { id: true, caption: true, thumbnailPath: true },
      });
      return photo ? { id: photo.id, caption: photo.caption || undefined, thumbnailPath: photo.thumbnailPath || undefined } : null;
    },
  },
  LOCATION: {
    findInTrip: (tripId, entityId) => prisma.location.findFirst({ where: { id: entityId, tripId } }),
    getDetails: async (entityId) => {
      const location = await prisma.location.findUnique({
        where: { id: entityId },
        select: { id: true, name: true },
      });
      return location ? { id: location.id, name: location.name } : null;
    },
  },
  ACTIVITY: {
    findInTrip: (tripId, entityId) => prisma.activity.findFirst({ where: { id: entityId, tripId } }),
    getDetails: async (entityId) => {
      const activity = await prisma.activity.findUnique({
        where: { id: entityId },
        select: { id: true, name: true },
      });
      return activity ? { id: activity.id, name: activity.name } : null;
    },
  },
  LODGING: {
    findInTrip: (tripId, entityId) => prisma.lodging.findFirst({ where: { id: entityId, tripId } }),
    getDetails: async (entityId) => {
      const lodging = await prisma.lodging.findUnique({
        where: { id: entityId },
        select: { id: true, name: true },
      });
      return lodging ? { id: lodging.id, name: lodging.name } : null;
    },
  },
  TRANSPORTATION: {
    findInTrip: (tripId, entityId) => prisma.transportation.findFirst({ where: { id: entityId, tripId } }),
    getDetails: async (entityId) => {
      const transport = await prisma.transportation.findUnique({
        where: { id: entityId },
        select: { id: true, type: true, company: true },
      });
      return transport
        ? { id: transport.id, name: `${transport.type}${transport.company ? ` - ${transport.company}` : ''}` }
        : null;
    },
  },
  JOURNAL_ENTRY: {
    findInTrip: (tripId, entityId) => prisma.journalEntry.findFirst({ where: { id: entityId, tripId } }),
    getDetails: async (entityId) => {
      const journal = await prisma.journalEntry.findUnique({
        where: { id: entityId },
        select: { id: true, title: true },
      });
      return journal ? { id: journal.id, title: journal.title || undefined } : null;
    },
  },
  PHOTO_ALBUM: {
    findInTrip: (tripId, entityId) => prisma.photoAlbum.findFirst({ where: { id: entityId, tripId } }),
    getDetails: async (entityId) => {
      const album = await prisma.photoAlbum.findUnique({
        where: { id: entityId },
        select: { id: true, name: true },
      });
      return album ? { id: album.id, name: album.name } : null;
    },
  },
};

/**
 * Verifies that an entity exists within the specified trip
 * @throws AppError if entity not found or doesn't belong to trip
 */
async function verifyEntityInTrip(
  tripId: number,
  entityType: EntityType,
  entityId: number
): Promise<void> {
  const config = ENTITY_CONFIG[entityType];
  if (!config) {
    throw new AppError(`Unknown entity type: ${entityType}`, 400);
  }

  const entity = await config.findInTrip(tripId, entityId);
  if (!entity) {
    throw new AppError(
      `${entityType} with ID ${entityId} not found in trip ${tripId}`,
      404
    );
  }
}

/**
 * Fetches entity details for enriched link responses
 */
async function getEntityDetails(
  entityType: EntityType,
  entityId: number
): Promise<EntityDetails | null> {
  const config = ENTITY_CONFIG[entityType];
  if (!config) {
    return null;
  }
  return config.getDetails(entityId);
}

/**
 * Determines the default relationship type based on source and target entity types
 */
function getDefaultRelationship(
  sourceType: EntityType,
  targetType: EntityType
): LinkRelationship {
  // Photo taken at a location
  if (sourceType === 'PHOTO' && targetType === 'LOCATION') {
    return 'TAKEN_AT';
  }
  // Photo featured in album or journal
  if (sourceType === 'PHOTO' && (targetType === 'PHOTO_ALBUM' || targetType === 'JOURNAL_ENTRY')) {
    return 'FEATURED_IN';
  }
  // Activity/lodging occurred at location
  if ((sourceType === 'ACTIVITY' || sourceType === 'LODGING') && targetType === 'LOCATION') {
    return 'OCCURRED_AT';
  }
  // Journal documents entities
  if (sourceType === 'JOURNAL_ENTRY') {
    return 'DOCUMENTS';
  }
  // Default
  return 'RELATED';
}

export const entityLinkService = {
  /**
   * Create a link between two entities
   */
  async createLink(
    userId: number,
    data: CreateEntityLinkInput
  ): Promise<EntityLinkResponse> {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify both entities exist in the trip
    await verifyEntityInTrip(data.tripId, data.sourceType, data.sourceId);
    await verifyEntityInTrip(data.tripId, data.targetType, data.targetId);

    // Prevent self-linking
    if (data.sourceType === data.targetType && data.sourceId === data.targetId) {
      throw new AppError('Cannot link an entity to itself', 400);
    }

    // Determine relationship if not provided
    const relationship = data.relationship || getDefaultRelationship(data.sourceType, data.targetType);

    // Check if link already exists
    const existingLink = await prisma.entityLink.findFirst({
      where: {
        tripId: data.tripId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        targetType: data.targetType,
        targetId: data.targetId,
      },
    });

    if (existingLink) {
      throw new AppError('Link already exists between these entities', 400);
    }

    return await prisma.entityLink.create({
      data: {
        tripId: data.tripId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        targetType: data.targetType,
        targetId: data.targetId,
        relationship,
        sortOrder: data.sortOrder,
        notes: data.notes,
      },
    });
  },

  /**
   * Bulk create links from one source to multiple targets
   */
  async bulkCreateLinks(
    userId: number,
    data: BulkCreateEntityLinksInput
  ): Promise<{ created: number; skipped: number }> {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify source entity exists
    await verifyEntityInTrip(data.tripId, data.sourceType, data.sourceId);

    // Verify all target entities exist
    for (const target of data.targets) {
      await verifyEntityInTrip(data.tripId, target.targetType, target.targetId);
    }

    let created = 0;
    let skipped = 0;

    // Create links in a transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const target of data.targets) {
        // Skip self-links
        if (data.sourceType === target.targetType && data.sourceId === target.targetId) {
          skipped++;
          continue;
        }

        // Check if link already exists
        const existing = await tx.entityLink.findFirst({
          where: {
            tripId: data.tripId,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            targetType: target.targetType,
            targetId: target.targetId,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const relationship = target.relationship || getDefaultRelationship(data.sourceType, target.targetType);

        await tx.entityLink.create({
          data: {
            tripId: data.tripId,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            targetType: target.targetType,
            targetId: target.targetId,
            relationship,
            sortOrder: target.sortOrder,
            notes: target.notes,
          },
        });
        created++;
      }
    });

    return { created, skipped };
  },

  /**
   * Bulk link multiple photos to a single target entity
   */
  async bulkLinkPhotos(
    userId: number,
    data: BulkLinkPhotosInput
  ): Promise<{ created: number; skipped: number }> {
    // Verify user owns the trip
    await verifyTripAccess(userId, data.tripId);

    // Verify target entity exists
    await verifyEntityInTrip(data.tripId, data.targetType, data.targetId);

    // Verify all photos exist
    for (const photoId of data.photoIds) {
      await verifyEntityInTrip(data.tripId, 'PHOTO', photoId);
    }

    let created = 0;
    let skipped = 0;

    const relationship = data.relationship || getDefaultRelationship('PHOTO', data.targetType);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const photoId of data.photoIds) {
        // Check if link already exists
        const existing = await tx.entityLink.findFirst({
          where: {
            tripId: data.tripId,
            sourceType: 'PHOTO',
            sourceId: photoId,
            targetType: data.targetType,
            targetId: data.targetId,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await tx.entityLink.create({
          data: {
            tripId: data.tripId,
            sourceType: 'PHOTO',
            sourceId: photoId,
            targetType: data.targetType,
            targetId: data.targetId,
            relationship,
          },
        });
        created++;
      }
    });

    return { created, skipped };
  },

  /**
   * Get all links from a specific entity
   */
  async getLinksFrom(
    userId: number,
    data: GetLinksFromEntityInput
  ): Promise<EnrichedEntityLink[]> {
    await verifyTripAccess(userId, data.tripId);

    const where: any = {
      tripId: data.tripId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
    };

    if (data.targetType) {
      where.targetType = data.targetType;
    }

    const links = await prisma.entityLink.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // Enrich with target entity details
    const enrichedLinks: EnrichedEntityLink[] = [];
    for (const link of links) {
      const targetEntity = await getEntityDetails(link.targetType as EntityType, link.targetId);
      enrichedLinks.push({
        ...link,
        sourceType: link.sourceType as EntityType,
        targetType: link.targetType as EntityType,
        relationship: link.relationship as LinkRelationship,
        targetEntity: targetEntity || undefined,
      });
    }

    return enrichedLinks;
  },

  /**
   * Get all links to a specific entity
   */
  async getLinksTo(
    userId: number,
    data: GetLinksToEntityInput
  ): Promise<EnrichedEntityLink[]> {
    await verifyTripAccess(userId, data.tripId);

    const where: any = {
      tripId: data.tripId,
      targetType: data.targetType,
      targetId: data.targetId,
    };

    if (data.sourceType) {
      where.sourceType = data.sourceType;
    }

    const links = await prisma.entityLink.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // Enrich with source entity details
    const enrichedLinks: EnrichedEntityLink[] = [];
    for (const link of links) {
      const sourceEntity = await getEntityDetails(link.sourceType as EntityType, link.sourceId);
      enrichedLinks.push({
        ...link,
        sourceType: link.sourceType as EntityType,
        targetType: link.targetType as EntityType,
        relationship: link.relationship as LinkRelationship,
        sourceEntity: sourceEntity || undefined,
      });
    }

    return enrichedLinks;
  },

  /**
   * Get all links for an entity (both directions)
   */
  async getAllLinksForEntity(
    userId: number,
    tripId: number,
    entityType: EntityType,
    entityId: number
  ): Promise<{
    linksFrom: EnrichedEntityLink[];
    linksTo: EnrichedEntityLink[];
    summary: EntityLinkSummary;
  }> {
    await verifyTripAccess(userId, tripId);

    const [linksFrom, linksTo] = await Promise.all([
      this.getLinksFrom(userId, { tripId, sourceType: entityType, sourceId: entityId }),
      this.getLinksTo(userId, { tripId, targetType: entityType, targetId: entityId }),
    ]);

    // Build summary counts
    const linkCounts: { [key in EntityType]?: number } = {};

    for (const link of linksFrom) {
      linkCounts[link.targetType] = (linkCounts[link.targetType] || 0) + 1;
    }
    for (const link of linksTo) {
      linkCounts[link.sourceType] = (linkCounts[link.sourceType] || 0) + 1;
    }

    return {
      linksFrom,
      linksTo,
      summary: {
        entityType,
        entityId,
        linkCounts,
        totalLinks: linksFrom.length + linksTo.length,
      },
    };
  },

  /**
   * Delete a specific link
   */
  async deleteLink(userId: number, data: DeleteEntityLinkInput): Promise<void> {
    await verifyTripAccess(userId, data.tripId);

    const link = await prisma.entityLink.findFirst({
      where: {
        tripId: data.tripId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        targetType: data.targetType,
        targetId: data.targetId,
      },
    });

    if (!link) {
      throw new AppError('Link not found', 404);
    }

    await prisma.entityLink.delete({
      where: { id: link.id },
    });
  },

  /**
   * Delete a link by ID
   */
  async deleteLinkById(userId: number, tripId: number, linkId: number): Promise<void> {
    await verifyTripAccess(userId, tripId);

    const link = await prisma.entityLink.findFirst({
      where: { id: linkId, tripId },
    });

    if (!link) {
      throw new AppError('Link not found', 404);
    }

    await prisma.entityLink.delete({
      where: { id: linkId },
    });
  },

  /**
   * Update a link (relationship and/or notes)
   */
  async updateLink(
    userId: number,
    tripId: number,
    linkId: number,
    data: UpdateEntityLinkInput
  ): Promise<EntityLinkResponse> {
    await verifyTripAccess(userId, tripId);

    const link = await prisma.entityLink.findFirst({
      where: { id: linkId, tripId },
    });

    if (!link) {
      throw new AppError('Link not found', 404);
    }

    const updateData: { relationship?: string; notes?: string | null } = {};
    if (data.relationship !== undefined) {
      updateData.relationship = data.relationship;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    return await prisma.entityLink.update({
      where: { id: linkId },
      data: updateData,
    });
  },

  /**
   * Delete all links for an entity
   */
  async deleteAllLinksForEntity(
    userId: number,
    tripId: number,
    entityType: EntityType,
    entityId: number
  ): Promise<{ deleted: number }> {
    await verifyTripAccess(userId, tripId);

    // Delete links where entity is source or target
    const result = await prisma.entityLink.deleteMany({
      where: {
        tripId,
        OR: [
          { sourceType: entityType, sourceId: entityId },
          { targetType: entityType, targetId: entityId },
        ],
      },
    });

    return { deleted: result.count };
  },

  /**
   * Get photos linked to an entity
   */
  async getPhotosForEntity(
    userId: number,
    tripId: number,
    entityType: EntityType,
    entityId: number
  ): Promise<any[]> {
    await verifyTripAccess(userId, tripId);

    // Get links where photos are linked to this entity
    const links = await prisma.entityLink.findMany({
      where: {
        tripId,
        sourceType: 'PHOTO',
        targetType: entityType,
        targetId: entityId,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // Fetch the actual photos
    const photoIds = links.map((l: any) => l.sourceId);
    if (photoIds.length === 0) return [];

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
    });

    // Maintain sort order from links
    const photoMap = new Map(photos.map((p: any) => [p.id, p]));
    return photoIds.map((id: number) => photoMap.get(id)).filter(Boolean);
  },

  /**
   * Get link summary for all entities in a trip
   * Useful for showing link indicators on entity cards
   */
  async getTripLinkSummary(
    userId: number,
    tripId: number
  ): Promise<Map<string, EntityLinkSummary>> {
    await verifyTripAccess(userId, tripId);

    const links = await prisma.entityLink.findMany({
      where: { tripId },
    });

    const summaryMap = new Map<string, EntityLinkSummary>();

    for (const link of links) {
      // Count for source entity
      const sourceKey = `${link.sourceType}:${link.sourceId}`;
      if (!summaryMap.has(sourceKey)) {
        summaryMap.set(sourceKey, {
          entityType: link.sourceType as EntityType,
          entityId: link.sourceId,
          linkCounts: {},
          totalLinks: 0,
        });
      }
      const sourceSummary = summaryMap.get(sourceKey)!;
      sourceSummary.linkCounts[link.targetType as EntityType] =
        (sourceSummary.linkCounts[link.targetType as EntityType] || 0) + 1;
      sourceSummary.totalLinks++;

      // Count for target entity
      const targetKey = `${link.targetType}:${link.targetId}`;
      if (!summaryMap.has(targetKey)) {
        summaryMap.set(targetKey, {
          entityType: link.targetType as EntityType,
          entityId: link.targetId,
          linkCounts: {},
          totalLinks: 0,
        });
      }
      const targetSummary = summaryMap.get(targetKey)!;
      targetSummary.linkCounts[link.sourceType as EntityType] =
        (targetSummary.linkCounts[link.sourceType as EntityType] || 0) + 1;
      targetSummary.totalLinks++;
    }

    return summaryMap;
  },
};
