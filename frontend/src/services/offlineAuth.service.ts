/**
 * Offline Authentication Service
 *
 * Handles offline session persistence with encrypted storage in IndexedDB.
 * Allows users to access cached data when offline without requiring network
 * access for authentication.
 *
 * Security:
 * - Session tokens are encrypted using AES-GCM before storage
 * - Encryption key is derived from a device-specific identifier using PBKDF2
 * - Offline sessions expire after 30 days
 * - Read-only access granted when offline; edits are queued for sync
 */

import { getDb } from '../lib/offlineDb';

/**
 * Encryption algorithm constants
 */
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION = 'PBKDF2';
const PBKDF2_ITERATIONS = 100000;
const SALT = 'travel-life-offline';

/**
 * Offline session validity duration (30 days in milliseconds)
 */
const OFFLINE_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Offline session stored in IndexedDB
 */
export interface OfflineSession {
  id: string;
  userId: number;
  username: string;
  email: string;
  timezone: string;
  sessionToken: string; // Encrypted
  createdAt: number;
  expiresAt: number;
}

/**
 * User data used to create an offline session
 */
export interface OfflineUser {
  id: number;
  username: string;
  email: string;
  timezone?: string;
}

/**
 * Get or create a device-specific identifier
 * Stored in localStorage (separate from IndexedDB for security)
 */
function getOrCreateDeviceId(): string {
  const DEVICE_ID_KEY = 'device-id';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Derive an encryption key from the device ID using PBKDF2
 */
async function deriveKey(deviceId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Import device ID as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceId),
    KEY_DERIVATION,
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION,
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt session data using AES-GCM
 */
async function encryptSessionData(data: string, deviceId: string): Promise<string> {
  const key = await deriveKey(deviceId);
  const encoder = new TextEncoder();

  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encoder.encode(data)
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Base64 encode for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt session data using AES-GCM
 */
async function decryptSessionData(encrypted: string, deviceId: string): Promise<string> {
  const key = await deriveKey(deviceId);

  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

  // Extract IV and data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

class OfflineAuthService {
  private deviceId: string | null = null;

  /**
   * Get the device ID, creating one if necessary
   */
  private getDeviceId(): string {
    if (!this.deviceId) {
      this.deviceId = getOrCreateDeviceId();
    }
    return this.deviceId;
  }

  /**
   * Create an offline session for the user
   * Called after successful online authentication
   *
   * @param user The authenticated user
   * @param sessionToken Optional session token from the server (for offline validation)
   */
  async createOfflineSession(user: OfflineUser, sessionToken?: string): Promise<void> {
    const db = await getDb();
    const deviceId = this.getDeviceId();

    // Create session data to encrypt
    const sessionData = JSON.stringify({
      userId: user.id,
      createdAt: Date.now(),
      // Include a random nonce to make each encryption unique
      nonce: crypto.randomUUID(),
    });

    // Encrypt the session token (or session data if no token provided)
    const tokenToEncrypt = sessionToken || sessionData;
    const encryptedToken = await encryptSessionData(tokenToEncrypt, deviceId);

    const now = Date.now();

    await db.put('offlineSession', {
      id: 'current',
      userId: user.id,
      username: user.username,
      email: user.email,
      timezone: user.timezone || 'UTC',
      sessionToken: encryptedToken,
      createdAt: now,
      expiresAt: now + OFFLINE_SESSION_DURATION_MS,
    });
  }

  /**
   * Retrieve and validate the offline session
   * Returns null if no session exists or if it has expired
   *
   * @returns The offline session or null
   */
  async getOfflineSession(): Promise<OfflineSession | null> {
    try {
      const db = await getDb();
      const session = await db.get('offlineSession', 'current');

      if (!session) {
        return null;
      }

      // Check if expired
      if (!this.isValidOfflineSession(session)) {
        await this.clearOfflineSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting offline session:', error);
      return null;
    }
  }

  /**
   * Get decrypted session token
   * This can be used to verify the session or for specific offline operations
   *
   * @returns The decrypted session token or null
   */
  async getDecryptedSessionToken(): Promise<string | null> {
    try {
      const session = await this.getOfflineSession();
      if (!session) {
        return null;
      }

      const deviceId = this.getDeviceId();
      return await decryptSessionData(session.sessionToken, deviceId);
    } catch (error) {
      console.error('Error decrypting session token:', error);
      // Decryption failed - session may be corrupted or device ID changed
      await this.clearOfflineSession();
      return null;
    }
  }

  /**
   * Clear the offline session
   * Called on logout or when session is invalid
   */
  async clearOfflineSession(): Promise<void> {
    try {
      const db = await getDb();
      await db.delete('offlineSession', 'current');
    } catch (error) {
      console.error('Error clearing offline session:', error);
    }
  }

  /**
   * Check if an offline session is still valid
   *
   * @param session The session to validate
   * @returns True if the session is valid
   */
  isValidOfflineSession(session: OfflineSession | null): boolean {
    if (!session) {
      return false;
    }

    const now = Date.now();

    // Check expiration
    if (now > session.expiresAt) {
      return false;
    }

    // Check that essential fields are present
    if (!session.userId || !session.username || !session.sessionToken) {
      return false;
    }

    return true;
  }

  /**
   * Extend the offline session expiration
   * Called when user interacts with the app while online
   *
   * @param additionalDays Number of days to extend (default: 30)
   */
  async extendSession(additionalDays: number = 30): Promise<void> {
    try {
      const db = await getDb();
      const session = await db.get('offlineSession', 'current');

      if (session && this.isValidOfflineSession(session)) {
        const extensionMs = additionalDays * 24 * 60 * 60 * 1000;
        await db.put('offlineSession', {
          ...session,
          expiresAt: Date.now() + extensionMs,
        });
      }
    } catch (error) {
      console.error('Error extending offline session:', error);
    }
  }

  /**
   * Update user info in the offline session
   * Called when user profile changes while online
   *
   * @param updates Partial user data to update
   */
  async updateSessionUser(updates: Partial<OfflineUser>): Promise<void> {
    try {
      const db = await getDb();
      const session = await db.get('offlineSession', 'current');

      if (session) {
        await db.put('offlineSession', {
          ...session,
          ...(updates.username && { username: updates.username }),
          ...(updates.email && { email: updates.email }),
          ...(updates.timezone && { timezone: updates.timezone }),
        });
      }
    } catch (error) {
      console.error('Error updating session user:', error);
    }
  }

  /**
   * Check if an offline session exists (without validating expiration)
   *
   * @returns True if a session exists
   */
  async hasOfflineSession(): Promise<boolean> {
    try {
      const db = await getDb();
      const session = await db.get('offlineSession', 'current');
      return session !== undefined;
    } catch (error) {
      console.error('Error checking offline session:', error);
      return false;
    }
  }

  /**
   * Get time remaining until session expires
   *
   * @returns Milliseconds until expiration, or 0 if expired/no session
   */
  async getSessionTimeRemaining(): Promise<number> {
    const session = await this.getOfflineSession();
    if (!session) {
      return 0;
    }

    const remaining = session.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Check if the session will expire soon (within specified days)
   *
   * @param days Number of days to consider as "soon" (default: 7)
   * @returns True if session expires within the specified days
   */
  async isSessionExpiringSoon(days: number = 7): Promise<boolean> {
    const remaining = await this.getSessionTimeRemaining();
    const threshold = days * 24 * 60 * 60 * 1000;
    return remaining > 0 && remaining < threshold;
  }

  /**
   * Convert offline session to a user-like object for use in the app
   * This provides read-only user info when offline
   *
   * @returns User object or null
   */
  async getOfflineUser(): Promise<OfflineUser | null> {
    const session = await this.getOfflineSession();
    if (!session) {
      return null;
    }

    return {
      id: session.userId,
      username: session.username,
      email: session.email,
      timezone: session.timezone,
    };
  }
}

// Export singleton instance
export const offlineAuthService = new OfflineAuthService();
export default offlineAuthService;
