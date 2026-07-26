import prisma from '../config/database';
import { PrismaModelDelegate } from '../types/prisma-helpers';
// Type-only import: erased at runtime, so this does not create an import cycle
// with tripAccess.ts (which imports the resolver below).
import type { VerifiableEntityType } from '../services/_shared/tripAccess';

/**
 * Type-safe-ish resolution of a Prisma model delegate from an entity type.
 *
 * Why this file exists
 * --------------------
 * Several helpers operate over "whichever trip-scoped entity this is" and need
 * the matching Prisma delegate at runtime. Prisma's generated delegates cannot
 * be assigned to a common interface without an assertion: their methods take
 * model-specific argument types, and under `strictFunctionTypes` a parameter of
 * `unknown` is not assignable to those. (Verified empirically — assigning
 * `prisma.location` to `PrismaModelDelegate` fails with TS2322.)
 *
 * So exactly one assertion per delegate is unavoidable. What we CAN avoid is
 * `(client as any)[key]`, which switches off checking for the property access
 * itself and would happily compile a typo'd model name. Centralising the lookup
 * here means:
 *
 *   - no `any` anywhere: property access is a real, checked field reference;
 *   - the `switch` is exhaustive over `VerifiableEntityType`, so adding a new
 *     entity type is a compile error here rather than a runtime `undefined`;
 *   - the narrowing assertion appears once instead of being repeated at each
 *     call site.
 */

/** Prisma clients accepted here: the root client or a transaction client. */
export type PrismaDelegateHost = Pick<
  typeof prisma,
  'location' | 'photo' | 'activity' | 'lodging' | 'transportation' | 'journalEntry' | 'photoAlbum'
>;

/** A delegate that also exposes `deleteMany`, used by the bulk helpers. */
export type PrismaModelDelegateWithDeleteMany = PrismaModelDelegate & {
  deleteMany: (args: unknown) => Promise<{ count: number }>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
};

/**
 * Resolve the Prisma delegate for a trip-scoped entity type.
 *
 * Pass a transaction client to stay inside an open transaction; pass nothing to
 * use the root client.
 */
export function getEntityDelegate(
  entityType: VerifiableEntityType,
  client: PrismaDelegateHost = prisma
): PrismaModelDelegateWithDeleteMany {
  switch (entityType) {
    case 'location':
      return client.location as unknown as PrismaModelDelegateWithDeleteMany;
    case 'photo':
      return client.photo as unknown as PrismaModelDelegateWithDeleteMany;
    case 'activity':
      return client.activity as unknown as PrismaModelDelegateWithDeleteMany;
    case 'lodging':
      return client.lodging as unknown as PrismaModelDelegateWithDeleteMany;
    case 'transportation':
      return client.transportation as unknown as PrismaModelDelegateWithDeleteMany;
    case 'journalEntry':
      return client.journalEntry as unknown as PrismaModelDelegateWithDeleteMany;
    case 'album':
    case 'photoAlbum':
      return client.photoAlbum as unknown as PrismaModelDelegateWithDeleteMany;
    default: {
      // Exhaustiveness guard: if a new VerifiableEntityType is added without a
      // case above, this fails to compile rather than returning undefined.
      const unhandled: never = entityType;
      throw new Error(`No Prisma delegate mapped for entity type: ${String(unhandled)}`);
    }
  }
}
