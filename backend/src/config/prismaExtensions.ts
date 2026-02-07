import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Prisma extension to automatically update PostGIS GEOGRAPHY(POINT, 4326) fields
 * from Decimal latitude/longitude fields.
 *
 * Prisma does not natively support writing to GEOGRAPHY fields via its standard API,
 * so we use raw SQL updates in an after-write hook.
 *
 * Note: Prisma's extension API typing is incomplete for query callbacks.
 * The `args` and `query` parameters don't have proper type definitions exposed.
 * See: https://github.com/prisma/prisma/issues/18628
 */

// @ts-expect-error -- Prisma.defineExtension has incomplete type definitions for query callbacks
export const postgisExtension = Prisma.defineExtension((client: PrismaClient) => {
  return client.$extends({
    name: 'postgis-sync',
    query: {
      location: {
        // @ts-expect-error -- Prisma extension callback types are incomplete in v7
        async create({ args, query }: { args: unknown; query: (args: unknown) => Promise<{ id: number; latitude: unknown; longitude: unknown }> }) {
          const result = await query(args);
          if (result.latitude !== null && result.longitude !== null) {
            await client.$executeRaw`
              UPDATE locations
              SET coordinates = ST_SetSRID(ST_MakePoint(${result.longitude}, ${result.latitude}), 4326)::geography
              WHERE id = ${result.id}
            `;
          }
          return result;
        },
        // @ts-expect-error -- Prisma extension callback types are incomplete in v7
        async update({ args, query }: { args: unknown; query: (args: unknown) => Promise<{ id: number; latitude: unknown; longitude: unknown }> }) {
          const result = await query(args);
          if (result.latitude !== null && result.longitude !== null) {
            await client.$executeRaw`
              UPDATE locations
              SET coordinates = ST_SetSRID(ST_MakePoint(${result.longitude}, ${result.latitude}), 4326)::geography
              WHERE id = ${result.id}
            `;
          } else {
            await client.$executeRaw`
              UPDATE locations
              SET coordinates = NULL
              WHERE id = ${result.id}
            `;
          }
          return result;
        },
      },
      photo: {
        // @ts-expect-error -- Prisma extension callback types are incomplete in v7
        async create({ args, query }: { args: unknown; query: (args: unknown) => Promise<{ id: number; latitude: unknown; longitude: unknown }> }) {
          const result = await query(args);
          if (result.latitude !== null && result.longitude !== null) {
            await client.$executeRaw`
              UPDATE photos
              SET coordinates = ST_SetSRID(ST_MakePoint(${result.longitude}, ${result.latitude}), 4326)::geography
              WHERE id = ${result.id}
            `;
          }
          return result;
        },
        // @ts-expect-error -- Prisma extension callback types are incomplete in v7
        async update({ args, query }: { args: unknown; query: (args: unknown) => Promise<{ id: number; latitude: unknown; longitude: unknown }> }) {
          const result = await query(args);
          if (result.latitude !== null && result.longitude !== null) {
            await client.$executeRaw`
              UPDATE photos
              SET coordinates = ST_SetSRID(ST_MakePoint(${result.longitude}, ${result.latitude}), 4326)::geography
              WHERE id = ${result.id}
            `;
          } else {
            await client.$executeRaw`
              UPDATE photos
              SET coordinates = NULL
              WHERE id = ${result.id}
            `;
          }
          return result;
        },
      },
    },
  });
});

