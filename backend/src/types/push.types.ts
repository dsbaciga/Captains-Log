import { z } from 'zod';

/**
 * Standard PushSubscription JSON as produced by
 * PushManager.subscribe(...).toJSON() in the browser.
 */
export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;
