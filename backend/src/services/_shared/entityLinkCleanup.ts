import prisma from '../../config/database';
import { EntityType } from '@prisma/client';

/**
 * Removal of entity links when the entity on either end of the link is deleted.
 */

// Type for Prisma transaction client
type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Cleans up all entity links associated with an entity before deletion.
 * This removes links where the entity is either the source or target.
 *
 * @param tripId - The trip ID the entity belongs to
 * @param entityType - The type of entity being deleted
 * @param entityId - The ID of the entity being deleted
 * @param tx - Optional Prisma transaction client for atomic operations
 */
export async function cleanupEntityLinks(
  tripId: number,
  entityType: EntityType,
  entityId: number,
  tx?: TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  await client.entityLink.deleteMany({
    where: {
      tripId,
      OR: [
        { sourceType: entityType, sourceId: entityId },
        { targetType: entityType, targetId: entityId },
      ],
    },
  });
}
