import { Request, Response } from 'express';
import { z } from 'zod';
import oidcService from '../services/oidc.service';
import { config } from '../config';
import { asyncHandler } from '../http/asyncHandler';
import {
  setRefreshTokenCookie,
  setOidcStateCookie,
  getOidcStateCookie,
  clearOidcStateCookie,
} from '../http/cookies';
import { generateCsrfToken, setCsrfCookie } from '../security/csrf';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

const oidcStateSchema = z.object({
  state: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirect: z.string().optional(),
});

type OidcStatePayload = z.infer<typeof oidcStateSchema>;

/** Only allow same-origin paths to prevent open redirects. */
const safeRedirectPath = (raw: string | undefined): string => {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
};

const redirectToLoginWithError = (res: Response, errorCode: string): void => {
  res.redirect(`${config.frontendUrl}/login?error=${errorCode}`);
};

export const oidcController = {
  /**
   * Public config so the login page knows whether to render the SSO button.
   * Never exposes secrets.
   */
  getConfig: asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      data: {
        enabled: config.oidc.enabled,
        buttonText: config.oidc.buttonText,
      },
    });
  }),

  /**
   * Starts the OIDC authorization code flow (full-page redirect to the IdP).
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    if (!config.oidc.enabled) {
      throw new AppError('OIDC is not configured', 404);
    }

    const { url, state, codeVerifier } = await oidcService.createAuthorizationRequest();

    const statePayload: OidcStatePayload = {
      state,
      codeVerifier,
      redirect: safeRedirectPath(typeof req.query.redirect === 'string' ? req.query.redirect : undefined),
    };
    setOidcStateCookie(res, JSON.stringify(statePayload));

    res.redirect(url);
  }),

  /**
   * IdP redirects back here. On success sets the same refresh/CSRF cookies as a
   * password login and sends the browser to the frontend, where the silent
   * refresh flow picks up the session. Errors redirect to the login page with
   * an error code (this is a browser navigation, not an XHR).
   */
  callback: asyncHandler(async (req: Request, res: Response) => {
    if (!config.oidc.enabled) {
      redirectToLoginWithError(res, 'oidc_disabled');
      return;
    }

    const stateCookie = getOidcStateCookie(req.cookies);
    clearOidcStateCookie(res);

    if (typeof req.query.error === 'string') {
      logger.warn(`OIDC provider returned error: ${req.query.error}`);
      redirectToLoginWithError(res, 'oidc_denied');
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;

    let statePayload: OidcStatePayload | null = null;
    if (stateCookie) {
      try {
        const parsed = oidcStateSchema.safeParse(JSON.parse(stateCookie));
        statePayload = parsed.success ? parsed.data : null;
      } catch {
        statePayload = null; // malformed JSON
      }
    }

    if (!code || !state || !statePayload || statePayload.state !== state) {
      logger.warn('OIDC callback with missing or mismatched state');
      redirectToLoginWithError(res, 'oidc_invalid');
      return;
    }

    try {
      const result = await oidcService.handleCallback(code, statePayload.codeVerifier);

      setRefreshTokenCookie(res, result.refreshToken);
      setCsrfCookie(res, generateCsrfToken());

      logger.info(`User logged in via OIDC: ${result.user.email}`);
      res.redirect(`${config.frontendUrl}${safeRedirectPath(statePayload.redirect)}`);
    } catch (error) {
      logger.error('OIDC callback failed', { error: error instanceof Error ? error.message : error });
      // 403s carry two distinct user-facing meanings; showing "no account
      // exists" for an unverified email sends admins down the wrong path.
      let errorCode = 'oidc_failed';
      if (error instanceof AppError && error.statusCode === 403) {
        errorCode = error.message.includes('not verified') ? 'oidc_email_unverified' : 'oidc_not_allowed';
      }
      redirectToLoginWithError(res, errorCode);
    }
  }),
};
