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

import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import logger from '../config/logger';

interface BlacklistEntry {
  // SHA-256 of the token, never the token itself. The persisted file must not
  // be a store of structurally valid JWTs (it survives backups and mounts).
  tokenHash: string;
  expiresAt: number; // Unix timestamp in milliseconds
  /**
   * When this token was consumed by a rotation, if it was. Absent for tokens
   * revoked some other way (logout), which get no replay grace.
   */
  claimedAt?: number;
}

/**
 * How long after a rotation a second presentation of the same token is treated
 * as a benign concurrent request rather than reuse.
 *
 * Two tabs restoring at launch both send the same refresh cookie; without a
 * grace window the loser is indistinguishable from a replayed stolen token and
 * triggers a family-wide invalidation. Kept short — a genuine attacker replay
 * essentially never lands inside the same few seconds as the legitimate
 * rotation, and anything later is still caught.
 */
const REPLAY_GRACE_MS = 30 * 1000;

/** Outcome of an attempt to consume a single-use token. */
export type TokenClaimOutcome =
  /** This call consumed the token; the caller may proceed. */
  | 'claimed'
  /** Already consumed, but so recently that this is a concurrent duplicate. */
  | 'replayed-within-grace'
  /** Already revoked, outside any grace window — treat as reuse/theft. */
  | 'revoked';

/** Digest a token for use as the blacklist key. Lookups hash the same way. */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// In-memory storage - replace with Redis for production multi-server deployments
const blacklist: Map<string, BlacklistEntry> = new Map();

// Clean up expired entries every 15 minutes
const CLEANUP_INTERVAL = 15 * 60 * 1000;

// Default token expiry: 7 days (matches refresh token lifetime)
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// File-based persistence for surviving server restarts
const PERSIST_DIR = path.join(process.cwd(), 'data');
const PERSIST_FILE = path.join(PERSIST_DIR, 'token-blacklist.json');

// Serialize disk writes so concurrent logouts don't race over the same file.
let persistInFlight: Promise<void> = Promise.resolve();

/**
 * Persist the current blacklist to disk as JSON.
 * Writes are serialized via a promise chain to prevent concurrent overwrites.
 */
const persistBlacklist = (): void => {
  // Never touch the real persistence file from the test suite. Tests revoke
  // tokens constantly, and writing them to `data/token-blacklist.json` leaks
  // state between runs and into local development — a revocation created by a
  // test would be loaded at the next server start.
  if (process.env.NODE_ENV === 'test') return;

  persistInFlight = persistInFlight.then(async () => {
    try {
      await fsPromises.mkdir(PERSIST_DIR, { recursive: true });
      const entries = Array.from(blacklist.values());
      await fsPromises.writeFile(PERSIST_FILE, JSON.stringify(entries), 'utf-8');
      logger.debug(`Persisted ${entries.length} blacklist entries to disk`);
    } catch (error) {
      logger.error('Failed to persist token blacklist to disk', { error });
    }
  });
};

/**
 * Load the blacklist from disk on startup.
 * Skips entries that have already expired or are malformed.
 */
const loadBlacklist = (): void => {
  // Symmetric with persistBlacklist: tests must start from a clean slate rather
  // than inheriting revocations left on disk by an earlier run.
  if (process.env.NODE_ENV === 'test') return;

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
      // Legacy files (pre-hashing) stored the raw token under `token`; hash it
      // on load so previously revoked sessions stay revoked after the upgrade.
      const tokenHash =
        typeof entry?.tokenHash === 'string'
          ? entry.tokenHash
          : typeof entry?.token === 'string'
            ? hashToken(entry.token)
            : undefined;
      if (!tokenHash || typeof entry?.expiresAt !== 'number') {
        skipped++;
        continue;
      }
      if (entry.expiresAt > now) {
        blacklist.set(tokenHash, { tokenHash, expiresAt: entry.expiresAt });
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
  const tokenHash = hashToken(token);
  blacklist.set(tokenHash, { tokenHash, expiresAt });
  logger.debug(`Token blacklisted, expires at ${new Date(expiresAt).toISOString()}`);
  persistBlacklist();
};

/**
 * Atomically claim a single-use token.
 *
 * Returns `true` if this call claimed the token, `false` if it was already
 * revoked. Callers use a `false` result as the reuse/theft signal.
 *
 * This exists because `isBlacklisted(token)` followed later by
 * `blacklistToken(token)` is a check-then-act race: with `await`s in between,
 * two concurrent refreshes presenting the same token could both pass the check
 * and both succeed, so reuse detection was best-effort rather than guaranteed.
 * This function is deliberately **synchronous** — Node runs JS on a single
 * thread, so no other request can interleave between the read and the write,
 * making the claim atomic for a single-server deployment.
 *
 * Multi-server deployments need this backed by an atomic store instead
 * (Redis `SET key val NX PX ttl`, or a unique-constrained insert), which is the
 * same upgrade this file's header already describes.
 */
export const claimToken = (token: string, expiresInMs: number = DEFAULT_EXPIRY_MS): boolean => {
  const tokenHash = hashToken(token);
  const existing = blacklist.get(tokenHash);

  if (existing && existing.expiresAt >= Date.now()) {
    return false; // already revoked — the caller is looking at a replay
  }

  blacklist.set(tokenHash, { tokenHash, expiresAt: Date.now() + expiresInMs });
  logger.debug('Single-use token claimed and revoked');
  persistBlacklist();
  return true;
};

/**
 * Check if a token is blacklisted
 * @param token - The refresh token to check
 * @returns true if the token is blacklisted
 */
export const isBlacklisted = (token: string): boolean => {
  const tokenHash = hashToken(token);
  const entry = blacklist.get(tokenHash);
  if (!entry) return false;

  // Check if expired (should have been cleaned up, but double-check)
  if (entry.expiresAt < Date.now()) {
    blacklist.delete(tokenHash);
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
  for (const [tokenHash, entry] of blacklist.entries()) {
    if (entry.expiresAt < now) {
      blacklist.delete(tokenHash);
      removed++;
    }
  }
  if (removed > 0) {
    logger.debug(`Cleaned up ${removed} expired blacklist entries`);
    persistBlacklist();
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
    // Do not keep the event loop alive purely for cleanup — an unref'd timer
    // lets short-lived processes (and isolated test runs) exit normally.
    cleanupIntervalId.unref?.();
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
