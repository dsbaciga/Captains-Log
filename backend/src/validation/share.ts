import { z } from 'zod';

/**
 * Share tokens are generated with crypto.randomBytes(32).toString('hex'),
 * so a valid token is always exactly 64 lowercase hex characters.
 */
export const shareTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);
