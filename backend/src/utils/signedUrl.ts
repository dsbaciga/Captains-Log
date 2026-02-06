import crypto from 'crypto';
import { config } from '../config';

const SIGNED_URL_EXPIRY_SECONDS = 4 * 60 * 60; // 4 hours

/**
 * Generate a signed token for accessing an upload path.
 * Returns a token string in the format: signature.expires
 */
export function generateSignedToken(
  filePath: string,
  expiresInSeconds: number = SIGNED_URL_EXPIRY_SECONDS
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${filePath}|${expires}`;
  const signature = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(payload)
    .digest('hex');
  return `${signature}.${expires}`;
}

/**
 * Verify a signed token for a given path.
 * Returns true if the signature is valid and the token has not expired.
 */
export function verifySignedToken(filePath: string, token: string): boolean {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return false;

  const signature = token.substring(0, dotIndex);
  const expiresStr = token.substring(dotIndex + 1);
  const expires = parseInt(expiresStr, 10);

  if (isNaN(expires) || Math.floor(Date.now() / 1000) > expires) {
    return false;
  }

  const payload = `${filePath}|${expires}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Sign an upload path by appending a query token.
 * Only signs paths starting with /uploads/. Returns other paths unchanged.
 */
export function signUploadPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith('/uploads/')) return path;

  const token = generateSignedToken(path);
  return `${path}?token=${token}`;
}
