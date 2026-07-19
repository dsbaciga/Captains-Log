/**
 * OIDC Service Tests
 *
 * Test cases:
 * - OIDC-001: sanitizeUsername cleans IdP-provided names
 * - OIDC-002: Authorization request includes PKCE and state
 * - OIDC-003: Callback logs in an existing user by OIDC subject
 * - OIDC-004: Callback links an existing account by email
 * - OIDC-005: Callback auto-provisions a new user with a unique username
 * - OIDC-006: Callback rejects first-time sign-in when auto-provisioning is disabled
 * - OIDC-007: Callback rejects unverified email addresses
 * - OIDC-008: Callback rejects ID tokens with a mismatched issuer or audience
 * - OIDC-009: Linking by email requires an explicit email_verified: true claim
 */

import jwt from 'jsonwebtoken';

jest.mock('../../middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
    }
  },
}));

const mockOidcConfig = {
  enabled: true,
  issuerUrl: 'https://idp.example.com',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  redirectUrl: 'http://localhost:5000/api/auth/oidc/callback',
  scopes: 'openid profile email',
  buttonText: 'Sign in with SSO',
  autoProvision: true,
  trustEmail: false,
};

jest.mock('../../config', () => ({
  config: {
    oidc: mockOidcConfig,
  },
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('../../auth/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('random-hash'),
}));

jest.mock('../../auth/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
}));

jest.mock('../companion.service', () => ({
  companionService: {
    createMyselfCompanion: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockAxios.get(...args),
    post: (...args: unknown[]) => mockAxios.post(...args),
  },
}));

import { OidcService, sanitizeUsername } from '../oidc.service';
import { AppError } from '../../middleware/errorHandler';

const discoveryDocument = {
  issuer: 'https://idp.example.com',
  authorization_endpoint: 'https://idp.example.com/authorize',
  token_endpoint: 'https://idp.example.com/token',
  userinfo_endpoint: 'https://idp.example.com/userinfo',
};

/** Builds a decodable (unverified) ID token like the one a real IdP returns. */
const buildIdToken = (claims: Record<string, unknown>): string =>
  jwt.sign(
    { iss: 'https://idp.example.com', aud: 'test-client', ...claims },
    'irrelevant-signing-key'
  );

const existingUser = {
  id: 1,
  username: 'traveler',
  email: 'traveler@example.com',
  avatarUrl: null,
  passwordVersion: 0,
};

describe('OidcService', () => {
  let service: OidcService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOidcConfig.autoProvision = true;
    service = new OidcService();
    mockAxios.get.mockResolvedValue({ data: discoveryDocument });
  });

  describe('sanitizeUsername (OIDC-001)', () => {
    it('lowercases and strips disallowed characters', () => {
      expect(sanitizeUsername('Jane Doe!')).toBe('janedoe');
      expect(sanitizeUsername('user.name-42')).toBe('user.name-42');
    });

    it('pads names that become too short', () => {
      expect(sanitizeUsername('A')).toBe('usera');
      expect(sanitizeUsername('株式会社')).toBe('user');
    });
  });

  describe('createAuthorizationRequest (OIDC-002)', () => {
    it('builds an authorization URL with PKCE challenge and state', async () => {
      const { url, state, codeVerifier } = await service.createAuthorizationRequest();

      const parsed = new URL(url);
      expect(url.startsWith('https://idp.example.com/authorize?')).toBe(true);
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('client_id')).toBe('test-client');
      expect(parsed.searchParams.get('state')).toBe(state);
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
      expect(parsed.searchParams.get('code_challenge')).toBeTruthy();
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    });
  });

  describe('handleCallback', () => {
    const idToken = buildIdToken({
      sub: 'subject-123',
      email: 'traveler@example.com',
      email_verified: true,
      preferred_username: 'Traveler',
    });

    beforeEach(() => {
      mockAxios.post.mockResolvedValue({ data: { id_token: idToken, access_token: 'idp-access' } });
    });

    it('logs in an existing user matched by OIDC subject (OIDC-003)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

      const result = await service.handleCallback('auth-code', 'verifier');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { oidcSubject: 'https://idp.example.com|subject-123' },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result.user).toEqual({
        id: 1,
        username: 'traveler',
        email: 'traveler@example.com',
        avatarUrl: null,
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('links an existing account by email on first OIDC sign-in (OIDC-004)', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no user with this subject
        .mockResolvedValueOnce(existingUser); // but email matches
      mockPrisma.user.update.mockResolvedValueOnce({
        ...existingUser,
        oidcSubject: 'https://idp.example.com|subject-123',
      });

      const result = await service.handleCallback('auth-code', 'verifier');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { oidcSubject: 'https://idp.example.com|subject-123' },
      });
      expect(result.user.id).toBe(1);
    });

    it('auto-provisions a new user with a unique username (OIDC-005)', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // subject lookup
        .mockResolvedValueOnce(null) // email lookup
        .mockResolvedValueOnce({ id: 99 }) // username "traveler" taken
        .mockResolvedValueOnce(null); // username "traveler2" free
      mockPrisma.user.create.mockResolvedValueOnce({
        ...existingUser,
        id: 2,
        username: 'traveler2',
      });

      const result = await service.handleCallback('auth-code', 'verifier');

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'traveler2',
          email: 'traveler@example.com',
          passwordHash: 'random-hash',
          oidcSubject: 'https://idp.example.com|subject-123',
        },
      });
      expect(result.user.id).toBe(2);
    });

    it('rejects first-time sign-ins when auto-provisioning is disabled (OIDC-006)', async () => {
      mockOidcConfig.autoProvision = false;
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.handleCallback('auth-code', 'verifier')).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects unverified email addresses (OIDC-007)', async () => {
      const unverifiedToken = buildIdToken({
        sub: 'subject-456',
        email: 'sketchy@example.com',
        email_verified: false,
      });
      mockAxios.post.mockResolvedValue({ data: { id_token: unverifiedToken } });

      await expect(service.handleCallback('auth-code', 'verifier')).rejects.toBeInstanceOf(AppError);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects ID tokens with a mismatched issuer (OIDC-008)', async () => {
      const foreignToken = buildIdToken({
        iss: 'https://evil.example.com',
        sub: 'subject-123',
        email: 'traveler@example.com',
        email_verified: true,
      });
      mockAxios.post.mockResolvedValue({ data: { id_token: foreignToken } });

      await expect(service.handleCallback('auth-code', 'verifier')).rejects.toMatchObject({
        statusCode: 502,
      });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects ID tokens minted for a different client (OIDC-008)', async () => {
      const foreignToken = buildIdToken({
        aud: 'some-other-client',
        sub: 'subject-123',
        email: 'traveler@example.com',
        email_verified: true,
      });
      mockAxios.post.mockResolvedValue({ data: { id_token: foreignToken } });

      await expect(service.handleCallback('auth-code', 'verifier')).rejects.toMatchObject({
        statusCode: 502,
      });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('accepts ID tokens whose audience array contains the client (OIDC-008)', async () => {
      const multiAudToken = buildIdToken({
        aud: ['test-client', 'other-api'],
        sub: 'subject-123',
        email: 'traveler@example.com',
        email_verified: true,
      });
      mockAxios.post.mockResolvedValue({ data: { id_token: multiAudToken } });
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

      const result = await service.handleCallback('auth-code', 'verifier');

      expect(result.user.id).toBe(1);
    });

    it('refuses to link by email without an explicit email_verified claim (OIDC-009)', async () => {
      // No email_verified claim at all, and userinfo does not supply one either
      const noVerifiedClaimToken = buildIdToken({
        sub: 'subject-123',
        email: 'traveler@example.com',
      });
      mockAxios.post.mockResolvedValue({
        data: { id_token: noVerifiedClaimToken, access_token: 'idp-access' },
      });
      mockAxios.get.mockImplementation((url: unknown) =>
        Promise.resolve(
          url === discoveryDocument.userinfo_endpoint
            ? { data: { sub: 'subject-123', email: 'traveler@example.com' } }
            : { data: discoveryDocument }
        )
      );
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no user with this subject
        .mockResolvedValueOnce(existingUser); // but email matches

      await expect(service.handleCallback('auth-code', 'verifier')).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('links by email when userinfo supplies email_verified: true (OIDC-009)', async () => {
      const noVerifiedClaimToken = buildIdToken({
        sub: 'subject-123',
        email: 'traveler@example.com',
      });
      mockAxios.post.mockResolvedValue({
        data: { id_token: noVerifiedClaimToken, access_token: 'idp-access' },
      });
      mockAxios.get.mockImplementation((url: unknown) =>
        Promise.resolve(
          url === discoveryDocument.userinfo_endpoint
            ? { data: { sub: 'subject-123', email: 'traveler@example.com', email_verified: true } }
            : { data: discoveryDocument }
        )
      );
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no user with this subject
        .mockResolvedValueOnce(existingUser); // but email matches
      mockPrisma.user.update.mockResolvedValueOnce({
        ...existingUser,
        oidcSubject: 'https://idp.example.com|subject-123',
      });

      const result = await service.handleCallback('auth-code', 'verifier');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { oidcSubject: 'https://idp.example.com|subject-123' },
      });
      expect(result.user.id).toBe(1);
    });
  });

  describe('OIDC_TRUST_EMAIL linking relaxation (OIDC-011)', () => {
    const noVerifiedClaimToken = buildIdToken({
      sub: 'subject-123',
      email: 'traveler@example.com',
      // email_verified deliberately absent
    });

    beforeEach(() => {
      mockAxios.post.mockResolvedValue({
        data: { id_token: noVerifiedClaimToken, access_token: 'idp-access' },
      });
      // userinfo also omits email_verified, like IdPs that never emit the claim
      mockAxios.get.mockImplementation((url: unknown) =>
        Promise.resolve(
          url === discoveryDocument.userinfo_endpoint
            ? { data: { sub: 'subject-123', email: 'traveler@example.com' } }
            : { data: discoveryDocument }
        )
      );
    });

    afterEach(() => {
      mockOidcConfig.trustEmail = false;
    });

    it('links by email with an absent claim when trustEmail is enabled', async () => {
      mockOidcConfig.trustEmail = true;
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no user with this subject
        .mockResolvedValueOnce(existingUser); // email matches
      mockPrisma.user.update.mockResolvedValueOnce({
        ...existingUser,
        oidcSubject: 'https://idp.example.com|subject-123',
      });

      const result = await service.handleCallback('auth-code', 'verifier');

      expect(result.user.id).toBe(1);
    });

    it('still rejects an explicit email_verified: false even with trustEmail', async () => {
      mockOidcConfig.trustEmail = true;
      const explicitlyUnverified = buildIdToken({
        sub: 'subject-123',
        email: 'traveler@example.com',
        email_verified: false,
      });
      mockAxios.post.mockResolvedValue({
        data: { id_token: explicitlyUnverified, access_token: 'idp-access' },
      });

      await expect(service.handleCallback('auth-code', 'verifier')).rejects.toThrow(
        'not verified'
      );
    });

    it('still refuses to link an absent claim when trustEmail is disabled', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);

      await expect(service.handleCallback('auth-code', 'verifier')).rejects.toThrow(
        'not verified'
      );
    });
  });

  describe('public client / PKCE-only mode (OIDC-010)', () => {
    const idToken = buildIdToken({
      sub: 'subject-123',
      email: 'traveler@example.com',
      email_verified: true,
    });

    beforeEach(() => {
      mockAxios.post.mockResolvedValue({ data: { id_token: idToken, access_token: 'idp-access' } });
    });

    afterEach(() => {
      mockOidcConfig.clientSecret = 'test-secret';
    });

    it('omits client_secret from the token request when no secret is configured', async () => {
      mockOidcConfig.clientSecret = '';
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

      await service.handleCallback('auth-code', 'verifier');

      const tokenRequestBody = String(mockAxios.post.mock.calls[0][1]);
      expect(tokenRequestBody).not.toContain('client_secret');
      expect(tokenRequestBody).toContain('code_verifier=verifier');
      expect(tokenRequestBody).toContain('client_id=test-client');
    });

    it('still sends client_secret for confidential clients', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

      await service.handleCallback('auth-code', 'verifier');

      const tokenRequestBody = String(mockAxios.post.mock.calls[0][1]);
      expect(tokenRequestBody).toContain('client_secret=test-secret');
    });
  });
});
