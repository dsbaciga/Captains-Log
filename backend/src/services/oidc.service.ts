import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { config } from '../config';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../auth/password';
import { generateAccessToken, generateRefreshToken } from '../auth/jwt';
import { companionService } from './companion.service';
import { AuthResponse } from '../types/auth.types';

interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
}

interface OidcTokenResponse {
  access_token?: string;
  id_token?: string;
}

// Per-field .catch(undefined) keeps one malformed claim (e.g. a non-boolean
// email_verified from a quirky IdP) from discarding the whole claim set.
const oidcClaimsSchema = z.object({
  sub: z.string().optional().catch(undefined),
  email: z.string().optional().catch(undefined),
  email_verified: z.boolean().optional().catch(undefined),
  preferred_username: z.string().optional().catch(undefined),
  name: z.string().optional().catch(undefined),
});

export type OidcClaims = z.infer<typeof oidcClaimsSchema>;

const DISCOVERY_CACHE_TTL_MS = 60 * 60 * 1000;
const HTTP_TIMEOUT_MS = 10000;
const USERNAME_MAX_LENGTH = 100;

/**
 * Reduce an IdP-provided display name / preferred_username / email local part
 * to something that satisfies the username rules (3-255 chars).
 */
export const sanitizeUsername = (raw: string): string => {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, USERNAME_MAX_LENGTH);
  return cleaned.length >= 3 ? cleaned : `user${cleaned}`;
};

export class OidcService {
  private discovery: OidcDiscoveryDocument | null = null;
  private discoveryFetchedAt = 0;

  private async getDiscovery(): Promise<OidcDiscoveryDocument> {
    if (this.discovery && Date.now() - this.discoveryFetchedAt < DISCOVERY_CACHE_TTL_MS) {
      return this.discovery;
    }

    const url = `${config.oidc.issuerUrl}/.well-known/openid-configuration`;
    const response = await axios.get<OidcDiscoveryDocument>(url, { timeout: HTTP_TIMEOUT_MS });
    const doc = response.data;

    if (!doc?.issuer || !doc.authorization_endpoint || !doc.token_endpoint) {
      throw new AppError('OIDC discovery document is missing required endpoints', 502);
    }

    this.discovery = doc;
    this.discoveryFetchedAt = Date.now();
    return doc;
  }

  /**
   * Builds the authorization redirect URL along with the state and PKCE
   * verifier that must be persisted (in a cookie) for the callback.
   */
  async createAuthorizationRequest(): Promise<{ url: string; state: string; codeVerifier: string }> {
    const discovery = await this.getDiscovery();

    const state = crypto.randomBytes(32).toString('base64url');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.oidc.clientId,
      redirect_uri: config.oidc.redirectUrl,
      scope: config.oidc.scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const separator = discovery.authorization_endpoint.includes('?') ? '&' : '?';
    return {
      url: `${discovery.authorization_endpoint}${separator}${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  /**
   * Exchanges the authorization code, resolves the external identity to a
   * local user (logging in, linking by email, or auto-provisioning), and
   * issues the same token pair as a password login.
   */
  async handleCallback(code: string, codeVerifier: string): Promise<AuthResponse> {
    const discovery = await this.getDiscovery();
    const claims = await this.fetchClaims(discovery, code, codeVerifier);

    if (!claims.sub) {
      throw new AppError('OIDC provider did not return a subject identifier', 502);
    }
    if (!claims.email) {
      throw new AppError('OIDC provider did not return an email address', 502);
    }
    if (claims.email_verified === false) {
      throw new AppError('OIDC email address is not verified', 403);
    }

    const subject = `${discovery.issuer}|${claims.sub}`.slice(0, 500);
    const email = claims.email.toLowerCase();
    const user = await this.resolveUser(subject, email, claims);

    // Ensure "Myself" companion exists (mirrors password login)
    await companionService.createMyselfCompanion(user.id, user.username);

    // passwordVersion is non-nullable in the schema (@default(0)), so no fallback needed
    const payload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      passwordVersion: user.passwordVersion,
    };

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  private async fetchClaims(
    discovery: OidcDiscoveryDocument,
    code: string,
    codeVerifier: string
  ): Promise<OidcClaims> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.oidc.redirectUrl,
      client_id: config.oidc.clientId,
      client_secret: config.oidc.clientSecret,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await axios.post<OidcTokenResponse>(discovery.token_endpoint, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: HTTP_TIMEOUT_MS,
    });

    const { id_token: idToken, access_token: accessToken } = tokenResponse.data;

    // The ID token comes straight from the token endpoint over TLS, so its
    // claims can be trusted without JWKS signature verification.
    let claims: OidcClaims = {};
    if (idToken) {
      const decodedClaims = oidcClaimsSchema.safeParse(jwt.decode(idToken));
      if (decodedClaims.success) {
        claims = decodedClaims.data;
      }
    }

    // Some providers omit profile/email claims from the ID token; fall back to userinfo
    if ((!claims.sub || !claims.email) && discovery.userinfo_endpoint && accessToken) {
      const userinfoResponse = await axios.get<unknown>(discovery.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: HTTP_TIMEOUT_MS,
      });
      const userinfoClaims = oidcClaimsSchema.safeParse(userinfoResponse.data);
      if (userinfoClaims.success) {
        // ID token claims win; userinfo only fills the gaps
        claims = {
          sub: claims.sub ?? userinfoClaims.data.sub,
          email: claims.email ?? userinfoClaims.data.email,
          email_verified: claims.email_verified ?? userinfoClaims.data.email_verified,
          preferred_username: claims.preferred_username ?? userinfoClaims.data.preferred_username,
          name: claims.name ?? userinfoClaims.data.name,
        };
      }
    }

    return claims;
  }

  private async resolveUser(subject: string, email: string, claims: OidcClaims) {
    // 1. Returning OIDC user
    const existing = await prisma.user.findUnique({ where: { oidcSubject: subject } });
    if (existing) {
      return existing;
    }

    // 2. Existing password account with the same (verified) email - link it
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      logger.info(`Linking OIDC identity to existing account: ${email}`);
      return prisma.user.update({
        where: { id: byEmail.id },
        data: { oidcSubject: subject },
      });
    }

    // 3. First-time sign-in - provision a new account if allowed
    if (!config.oidc.autoProvision) {
      throw new AppError('No account exists for this identity', 403);
    }

    const username = await this.generateUniqueUsername(
      claims.preferred_username || claims.name || email.split('@')[0]
    );

    // OIDC users never use this password; a random hash keeps password login unusable
    const passwordHash = await hashPassword(crypto.randomBytes(32).toString('base64url'));

    logger.info(`Provisioning new user from OIDC sign-in: ${email}`);
    return prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        oidcSubject: subject,
      },
    });
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    const sanitized = sanitizeUsername(base);

    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = attempt === 0 ? sanitized : `${sanitized}${attempt + 1}`;
      const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
      if (!taken) {
        return candidate;
      }
    }

    return `${sanitized}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

export default new OidcService();
