import webpush, { WebPushError } from 'web-push';
import prisma from '../config/database';
import config from '../config';
import logger from '../config/logger';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Web Push notification service.
 *
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT (mailto:)
 * environment variables. When unset the feature is disabled gracefully:
 * isConfigured() returns false and sendToUser() is a no-op.
 *
 * VAPID details are applied lazily on first send so that importing this
 * module never throws when the env vars are missing.
 */
class PushNotificationService {
  private vapidInitialized = false;

  /**
   * In-memory dedupe for scheduled trip-start reminders.
   * Limitation: this resets on process restart, so a reminder could be sent
   * again after a restart on the same day. Acceptable for a simple hourly job.
   */
  private sentTripReminders = new Set<string>();

  isConfigured(): boolean {
    return Boolean(
      config.vapid.publicKey && config.vapid.privateKey && config.vapid.subject
    );
  }

  getPublicKey(): string | null {
    return this.isConfigured() ? config.vapid.publicKey : null;
  }

  /**
   * Lazily apply VAPID details to web-push. Returns false when not configured.
   */
  private ensureVapid(): boolean {
    if (!this.isConfigured()) {
      return false;
    }
    if (!this.vapidInitialized) {
      webpush.setVapidDetails(
        config.vapid.subject,
        config.vapid.publicKey,
        config.vapid.privateKey
      );
      this.vapidInitialized = true;
    }
    return true;
  }

  /**
   * Save (or update) a push subscription for a user. Upserts by endpoint so
   * re-subscribing from the same browser never creates duplicates.
   */
  async saveSubscription(
    userId: number,
    subscription: PushSubscriptionInput,
    userAgent?: string
  ): Promise<{ id: number; endpoint: string }> {
    const record = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
    });
    return { id: record.id, endpoint: record.endpoint };
  }

  /**
   * Remove a subscription by endpoint (scoped to the requesting user).
   */
  async removeSubscription(userId: number, endpoint: string): Promise<number> {
    const result = await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return result.count;
  }

  /**
   * Send a notification to all of a user's subscriptions.
   * Subscriptions rejected with 404/410 (expired/unsubscribed) are pruned.
   * Returns the number of successful sends.
   */
  async sendToUser(
    userId: number,
    payload: PushNotificationPayload
  ): Promise<number> {
    if (!this.ensureVapid()) {
      return 0;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return 0;
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/',
      tag: payload.tag,
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        sent += 1;
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          // Subscription expired or was revoked - prune it
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
          logger.info(
            `Pruned expired push subscription ${sub.id} for user ${userId}`
          );
        } else {
          logger.warn(
            `Failed to send push notification to subscription ${sub.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }
    return sent;
  }

  /**
   * Format "today + dayOffset" as YYYY-MM-DD in the given IANA timezone.
   * Falls back to UTC when the timezone is missing or invalid.
   */
  private dateStringInTimezone(dayOffset: number, timezone?: string | null): string {
    const date = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    try {
      // en-CA locale formats as YYYY-MM-DD
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'UTC',
      }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  /**
   * Scheduled job: notify trip owners when a trip starts tomorrow.
   * Uses the trip's timezone when set (server/UTC date otherwise).
   * Deduped in-memory per process (see sentTripReminders limitation above).
   */
  async sendTripStartReminders(): Promise<number> {
    if (!this.isConfigured()) {
      return 0;
    }

    // Fetch trips starting within a +/- 2 day window around "tomorrow" (UTC)
    // to cover all timezones, then match exactly per-trip below.
    const now = Date.now();
    const windowStart = new Date(now - 1 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now + 3 * 24 * 60 * 60 * 1000);

    const trips = await prisma.trip.findMany({
      where: {
        startDate: { gte: windowStart, lte: windowEnd },
        status: { notIn: ['cancelled', 'Cancelled', 'completed', 'Completed'] },
      },
      select: {
        id: true,
        userId: true,
        title: true,
        startDate: true,
        timezone: true,
      },
    });

    let notified = 0;
    for (const trip of trips) {
      if (!trip.startDate) continue;

      // startDate is a @db.Date stored at UTC midnight
      const startDateStr = trip.startDate.toISOString().slice(0, 10);
      const tomorrowStr = this.dateStringInTimezone(1, trip.timezone);
      if (startDateStr !== tomorrowStr) continue;

      const dedupeKey = `${trip.id}:${startDateStr}`;
      if (this.sentTripReminders.has(dedupeKey)) continue;

      const sent = await this.sendToUser(trip.userId, {
        title: 'Trip starts tomorrow',
        body: `"${trip.title}" starts tomorrow. Safe travels!`,
        url: `/trips/${trip.id}`,
        tag: `trip-start-${trip.id}`,
      });

      // Mark as handled even if the user has no subscriptions, so we do not
      // re-query on every hourly run for the same trip/day.
      this.sentTripReminders.add(dedupeKey);
      if (sent > 0) notified += 1;
    }

    // Prevent unbounded growth across long-running processes
    if (this.sentTripReminders.size > 10000) {
      this.sentTripReminders.clear();
    }

    return notified;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
