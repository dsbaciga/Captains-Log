import axios from '../lib/axios';
import { getDb } from '../lib/offlineDb';
import type {
  EmergencyCardData,
  TripEmergencyInfo,
  UpdateTripEmergencyInfoInput,
} from '../types/emergencyInfo';

/**
 * Emergency Card service (feature #111).
 *
 * The card is the one screen that has to work when the phone is dead, stolen or
 * out of signal, so every successful read is mirrored into IndexedDB and every
 * failed read falls back to that mirror. Callers get a `cachedAt` timestamp with
 * the payload so the UI can say how old the numbers are rather than presenting
 * a months-old policy number as current.
 */

/** A card plus how fresh it is. `cachedAt` is null when it came from the network. */
export interface EmergencyCardResult {
  card: EmergencyCardData;
  /** Unix ms of the cache write, when this payload was served from IndexedDB. */
  cachedAt: number | null;
}

/**
 * Writes a card into the offline store. Cache failures are swallowed: a browser
 * in private mode or over quota must not break the online path.
 */
async function cacheCard(tripId: number, card: EmergencyCardData): Promise<void> {
  try {
    const db = await getDb();
    await db.put('emergencyCards', {
      id: String(tripId),
      tripId: String(tripId),
      data: card,
      lastSync: Date.now(),
    });
  } catch (error) {
    console.warn('[EmergencyInfo] Failed to cache emergency card:', error);
  }
}

/** Reads a cached card, or null if there is none (or IndexedDB is unavailable). */
async function readCachedCard(tripId: number): Promise<EmergencyCardResult | null> {
  try {
    const db = await getDb();
    const record = await db.get('emergencyCards', String(tripId));
    return record ? { card: record.data, cachedAt: record.lastSync } : null;
  } catch (error) {
    console.warn('[EmergencyInfo] Failed to read cached emergency card:', error);
    return null;
  }
}

export const emergencyInfoService = {
  /**
   * Fetches the trip's emergency card, falling back to the offline cache.
   *
   * Any network or server failure falls through to IndexedDB rather than
   * propagating. The error is only rethrown when there is nothing cached — an
   * empty screen is the one outcome worse than a stale card.
   *
   * @param tripId - The trip whose card to load
   * @returns The card and its cache age
   */
  async getEmergencyCard(tripId: number): Promise<EmergencyCardResult> {
    try {
      const response = await axios.get<EmergencyCardData>(
        `/trips/${tripId}/emergency-info`
      );
      await cacheCard(tripId, response.data);
      return { card: response.data, cachedAt: null };
    } catch (error) {
      const cached = await readCachedCard(tripId);
      if (cached) return cached;
      throw error;
    }
  },

  /** Reads only the offline copy, without touching the network. */
  async getCachedEmergencyCard(tripId: number): Promise<EmergencyCardResult | null> {
    return readCachedCard(tripId);
  },

  /**
   * Creates or updates the trip's emergency details.
   *
   * Deliberately does NOT fall back to the cache — a write that did not reach the
   * server must surface as an error so the caller can tell the user.
   *
   * @param tripId - The trip to write against
   * @param data - Partial details; absent leaves unchanged, null clears
   * @returns The stored record
   */
  async updateEmergencyInfo(
    tripId: number,
    data: UpdateTripEmergencyInfoInput
  ): Promise<TripEmergencyInfo> {
    const response = await axios.put<TripEmergencyInfo>(
      `/trips/${tripId}/emergency-info`,
      data
    );
    return response.data;
  },

  /** Clears the trip's emergency details. Idempotent on the server. */
  async deleteEmergencyInfo(tripId: number): Promise<void> {
    await axios.delete(`/trips/${tripId}/emergency-info`);
  },
};

export default emergencyInfoService;
