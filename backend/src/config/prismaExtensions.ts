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

// Type for the query callback parameters (Prisma doesn't export these)
interface QueryCallbackParams<T> {
  args: T;
  query: (args: T) => Promise<{ id: number; latitude: unknown; longitude: unknown }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma.defineExtension expects a function that receives the client with an incomplete type definition
export const postgisExtension = Prisma.defineExtension((client: PrismaClient) => {
  return client.$extends({
    name: 'postgis-sync',
    query: {
      location: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension query callbacks don't have proper type exports
        async create({ args, query }: QueryCallbackParams<any>) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension query callbacks don't have proper type exports
        async update({ args, query }: QueryCallbackParams<any>) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension query callbacks don't have proper type exports
        async create({ args, query }: QueryCallbackParams<any>) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension query callbacks don't have proper type exports
        async update({ args, query }: QueryCallbackParams<any>) {
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

