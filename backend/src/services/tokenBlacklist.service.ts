/**
 * Token Blacklist Service
 *
 * Provides immediate token revocation capability. Currently uses in-memory storage
 * which is suitable for single-server deployments. For production multi-server
 * deployments, replace with Redis-based implementation.
 *
 * Usage:
 * - Call blacklistToken() when a user logs out or when token theft is suspected
 * - Call isBlacklisted() in auth middleware to reject blacklisted tokens
 *
 * Note: The blacklist is persisted to disk (data/token-blacklist.json) so it survives
 * server restarts. For critical multi-server applications, use Redis or database-backed storage.
 *
 * ## Production Redis Upgrade
 *
 * To upgrade to Redis for multi-server deployments:
 *
 * 1. Install Redis client:
 *    ```bash
 *    npm install ioredis
 *    npm install -D @types/ioredis
 *    ```
 *
 * 2. Replace the in-memory Map with Redis commands:
 *    ```typescript
 *    import Redis from 'ioredis';
 *
 *    const redis = new Redis(process.env.REDIS_URL);
 *    const BLACKLIST_PREFIX = 'token:blacklist:';
 *
 *    export const blacklistToken = async (token: string, expiresInMs: number): Promise<void> => {
 *      const key = BLACKLIST_PREFIX + token;
 *      await redis.set(key, '1', 'PX', expiresInMs);
 *    };
 *
 *    export const isBlacklisted = async (token: string): Promise<boolean> => {
 *      const key = BLACKLIST_PREFIX + token;
 *      const result = await redis.get(key);
 *      return result !== null;
 *    };
 *    ```
 *
 * 3. Update auth controller to use async/await for blacklist checks
 *
 * 4. Add Redis connection to docker-compose.yml:
 *    ```yaml
 *    redis:
 *      image: redis:7-alpine
 *      ports:
 *        - "6379:6379"
 *      volumes:
 *        - redis_data:/data
 *    ```
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import logger from '../config/logger';

interface BlacklistEntry {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// In-memory storage - replace with Redis for production multi-server deployments
const blacklist: Map<string, BlacklistEntry> = new Map();

// Clean up expired entries every 15 minutes
const CLEANUP_INTERVAL = 15 * 60 * 1000;

// Default token expiry: 7 days (matches refresh token lifetime)
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// File-based persistence for surviving server restarts
const PERSIST_DIR = path.join(process.cwd(), 'data');
const PERSIST_FILE = path.join(PERSIST_DIR, 'token-blacklist.json');

/**
 * Persist the current blacklist to disk as JSON.
 * Uses async I/O to avoid blocking the event loop.
 */
const persistBlacklist = async (): Promise<void> => {
  try {
    await fsPromises.mkdir(PERSIST_DIR, { recursive: true });
    const entries = Array.from(blacklist.values());
    await fsPromises.writeFile(PERSIST_FILE, JSON.stringify(entries), 'utf-8');
    logger.debug(`Persisted ${entries.length} blacklist entries to disk`);
  } catch (error) {
    logger.error('Failed to persist token blacklist to disk', { error });
  }
};

/**
 * Load the blacklist from disk on startup.
 * Skips entries that have already expired or are malformed.
 */
const loadBlacklist = (): void => {
  try {
    if (!fs.existsSync(PERSIST_FILE)) {
      logger.debug('No persisted token blacklist file found, starting fresh');
      return;
    }
    const raw = fs.readFileSync(PERSIST_FILE, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn('Token blacklist file has invalid format, starting fresh');
      return;
    }
    const now = Date.now();
    let loaded = 0;
    let skipped = 0;
    for (const entry of parsed) {
      if (typeof entry?.token !== 'string' || typeof entry?.expiresAt !== 'number') {
        skipped++;
        continue;
      }
      if (entry.expiresAt > now) {
        blacklist.set(entry.token, { token: entry.token, expiresAt: entry.expiresAt });
        loaded++;
      } else {
        skipped++;
      }
    }
    logger.info(`Loaded ${loaded} blacklist entries from disk (skipped ${skipped} expired/invalid)`);
  } catch (error) {
    logger.error('Failed to load token blacklist from disk', { error });
  }
};

/**
 * Add a token to the blacklist
 * @param token - The refresh token to blacklist
 * @param expiresInMs - How long until the token would naturally expire (default: 7 days)
 */
export const blacklistToken = (token: string, expiresInMs: number = DEFAULT_EXPIRY_MS): void => {
  const expiresAt = Date.now() + expiresInMs;
  blacklist.set(token, { token, expiresAt });
  logger.debug(`Token blacklisted, expires at ${new Date(expiresAt).toISOString()}`);
  persistBlacklist().catch((err) => logger.error('Failed to persist blacklist after adding token', { error: err }));
};

/**
 * Check if a token is blacklisted
 * @param token - The refresh token to check
 * @returns true if the token is blacklisted
 */
export const isBlacklisted = (token: string): boolean => {
  const entry = blacklist.get(token);
  if (!entry) return false;

  // Check if expired (should have been cleaned up, but double-check)
  if (entry.expiresAt < Date.now()) {
    blacklist.delete(token);
    return false;
  }

  return true;
};

/**
 * Remove expired entries from the blacklist
 * Called automatically on an interval, but can be called manually for testing
 */
export const cleanupExpired = (): number => {
  const now = Date.now();
  let removed = 0;
  for (const [token, entry] of blacklist.entries()) {
    if (entry.expiresAt < now) {
      blacklist.delete(token);
      removed++;
    }
  }
  if (removed > 0) {
    logger.debug(`Cleaned up ${removed} expired blacklist entries`);
    persistBlacklist().catch((err) => logger.error('Failed to persist blacklist after cleanup', { error: err }));
  }
  return removed;
};

/**
 * Get the current size of the blacklist (for monitoring/health checks)
 */
export const getBlacklistSize = (): number => {
  return blacklist.size;
};

/**
 * Get blacklist statistics (for monitoring/health checks)
 */
export const getBlacklistStats = (): { size: number; oldestExpiresAt: number | null } => {
  let oldestExpiresAt: number | null = null;
  for (const entry of blacklist.values()) {
    if (oldestExpiresAt === null || entry.expiresAt < oldestExpiresAt) {
      oldestExpiresAt = entry.expiresAt;
    }
  }
  return {
    size: blacklist.size,
    oldestExpiresAt,
  };
};

// Start cleanup interval
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

export const startCleanupInterval = (): void => {
  if (cleanupIntervalId === null) {
    cleanupIntervalId = setInterval(cleanupExpired, CLEANUP_INTERVAL);
    logger.info('Token blacklist cleanup interval started');
  }
};

export const stopCleanupInterval = (): void => {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.info('Token blacklist cleanup interval stopped');
  }
};

// Load persisted blacklist and start cleanup on module load
loadBlacklist();
startCleanupInterval();

/**
 * Clear the entire blacklist (for testing purposes only)
 * @internal
 */
export const _clearBlacklist = (): void => {
  blacklist.clear();
};

/**
 * Export the blacklist service as a default object for convenience
 */
export default {
  blacklistToken,
  isBlacklisted,
  cleanupExpired,
  getBlacklistSize,
  getBlacklistStats,
  startCleanupInterval,
  stopCleanupInterval,
  _clearBlacklist,
};
