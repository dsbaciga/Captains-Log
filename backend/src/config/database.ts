import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { postgisExtension } from './prismaExtensions';

const prismaClient = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Apply extensions
const prisma = prismaClient.$extends(postgisExtension);

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  (prismaClient as any).$on('query', (e: any) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
  });
}

export default prisma;
