import jwt, { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { JwtPayload } from '../types/auth.types';

/**
 * `expiresIn` is configured as a string like `'15m'` / `'7d'`.
 *
 * jsonwebtoken types the string form as a template-literal union (`StringValue`)
 * that a plain `string` does not satisfy — passing config through would need a
 * type assertion. It also accepts a plain **number of seconds**, which needs
 * none, so the duration is parsed to seconds here. That removes the escape hatch
 * and validates the setting at the same time: a malformed value fails at startup
 * with a clear message instead of producing a surprising token lifetime.
 */
const DURATION_UNIT_SECONDS = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31_557_600, // 365.25 days, matching the `ms` package jsonwebtoken uses
} as const;

type DurationUnit = keyof typeof DURATION_UNIT_SECONDS;

function isDurationUnit(value: string): value is DurationUnit {
  return value in DURATION_UNIT_SECONDS;
}

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/i;

function toExpiresInSeconds(value: string, settingName: string): number {
  const match = DURATION_PATTERN.exec(value.trim());

  if (!match) {
    throw new Error(
      `Invalid ${settingName}: "${value}". Expected a duration such as "15m", "7d", or a number of seconds.`
    );
  }

  const [, amount, rawUnit] = match;
  const unit = rawUnit.toLowerCase();

  // A bare number is already seconds.
  if (unit === '') return Number(amount);

  if (!isDurationUnit(unit)) {
    throw new Error(
      `Invalid ${settingName}: "${value}". Unknown duration unit "${rawUnit}". ` +
        `Expected one of: ${Object.keys(DURATION_UNIT_SECONDS).join(', ')}.`
    );
  }

  return Math.round(Number(amount) * DURATION_UNIT_SECONDS[unit]);
}

// Read lazily rather than at module scope: evaluating config on import couples
// every consumer of this module to a fully-populated config, which breaks test
// suites that mock `../config` with only the slice they need.
const accessSignOptions = (): SignOptions => ({
  expiresIn: toExpiresInSeconds(config.jwt.expiresIn, 'JWT_EXPIRES_IN'),
});

const refreshSignOptions = (): SignOptions => ({
  expiresIn: toExpiresInSeconds(config.jwt.refreshExpiresIn, 'JWT_REFRESH_EXPIRES_IN'),
});

/**
 * A verified token: this application's claims plus the registered JWT claims
 * (`iat`, `exp`, `jti`, …) that `jwt.verify` returns alongside them.
 */
export type VerifiedJwtPayload = JwtPayload & jwt.JwtPayload;

/**
 * Narrow a `jwt.verify` result to our payload shape.
 *
 * `jwt.verify` returns `string | JwtPayload`, and it only guarantees the
 * signature — not that the claims are the ones this application issues. Casting
 * the result would let a validly-signed token with the wrong shape through as if
 * it were a user identity, and `userId` is what every authorization check keys
 * off. Validating here fails loudly instead.
 */
function toJwtPayload(decoded: string | jwt.JwtPayload): VerifiedJwtPayload {
  if (typeof decoded === 'string') {
    throw new jwt.JsonWebTokenError('Token payload is a string, expected an object');
  }

  const { id, userId, email, passwordVersion } = decoded;

  if (typeof userId !== 'number' || typeof id !== 'number' || typeof email !== 'string') {
    throw new jwt.JsonWebTokenError('Token payload is missing required claims');
  }

  if (passwordVersion !== undefined && typeof passwordVersion !== 'number') {
    throw new jwt.JsonWebTokenError('Token payload has an invalid passwordVersion claim');
  }

  // Spread the decoded token first so the registered claims (`iat`, `exp`,
  // `jti`, …) survive; the validated fields are then applied on top with their
  // narrowed types. Rebuilding from only the known fields would silently strip
  // `exp`, which callers legitimately read.
  return { ...decoded, id, userId, email, passwordVersion };
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, accessSignOptions());
};

/**
 * Refresh tokens carry a `jti` so every issuance is unique.
 *
 * Without it the signed payload is just {id, userId, email, passwordVersion} and
 * JWT `iat`/`exp` have one-second resolution — so two refresh tokens minted for
 * the same user inside the same second are byte-identical. That is actively
 * dangerous now that refresh tokens are single-use: `refreshToken()` blacklists
 * the consumed token *after* minting the replacement, so on a collision it
 * revokes the token it just handed back. The client's next refresh then looks
 * like a replay, which trips reuse detection and bumps `passwordVersion`,
 * logging the user out of every session.
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload, jti: randomUUID() }, config.jwt.refreshSecret, refreshSignOptions());
};

export const verifyAccessToken = (token: string): VerifiedJwtPayload => {
  return toJwtPayload(jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }));
};

export const verifyRefreshToken = (token: string): VerifiedJwtPayload => {
  return toJwtPayload(jwt.verify(token, config.jwt.refreshSecret, { algorithms: ['HS256'] }));
};
