import { Prisma } from '@prisma/client';

/**
 * Prisma extension to automatically update PostGIS GEOGRAPHY(POINT, 4326) fields
 * from Decimal latitude/longitude fields.
 * 
 * Prisma does not natively support writing to GEOGRAPHY fields via its standard API,
 * so we use raw SQL updates in an after-write hook.
 */
export const postgisExtension = Prisma.defineExtension((client: any) => {
  return client.$extends({
    name: 'postgis-sync',
    query: {
      location: {
        async create({ args, query }: any) {
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
        async update({ args, query }: any) {
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
        async create({ args, query }: any) {
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
        async update({ args, query }: any) {
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

