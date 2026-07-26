import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../auth/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../auth/jwt';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { RegisterInput, LoginInput, AuthResponse } from '../types/auth.types';
import { companionService } from './companion.service';
import { claimToken } from './tokenBlacklist.service';

/**
 * Remaining lifetime (ms) of a JWT from its `exp` claim.
 * Falls back to null when the token carries no usable exp.
 */
const getRemainingTtlMs = (token: string): number | null => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object' || typeof decoded.exp !== 'number') return null;
  const remainingMs = decoded.exp * 1000 - Date.now();
  return remainingMs > 0 ? remainingMs : 0;
};

export class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      // One generic message for both collision cases: distinguishing "email
      // taken" from "username taken" turns registration into an unauthenticated
      // account-enumeration oracle. Matches userInvitation.service.ts.
      throw new AppError('Unable to create account with the provided information', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
      },
    });

    // Create "Myself" companion for new user
    await companionService.createMyselfCompanion(user.id, user.username);

    // Generate tokens (new user always starts at passwordVersion 0)
    const accessToken = generateAccessToken({ id: user.id, userId: user.id, email: user.email, passwordVersion: 0 });
    const refreshToken = generateRefreshToken({ id: user.id, userId: user.id, email: user.email, passwordVersion: 0 });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Ensure "Myself" companion exists for existing users (migration support)
    await companionService.createMyselfCompanion(user.id, user.username);

    // Generate tokens with passwordVersion to support invalidation on password change
    const accessToken = generateAccessToken({ id: user.id, userId: user.id, email: user.email, passwordVersion: user.passwordVersion ?? 0 });
    const refreshToken = generateRefreshToken({ id: user.id, userId: user.id, email: user.email, passwordVersion: user.passwordVersion ?? 0 });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string; user: { id: number; username: string; email: string; avatarUrl: string | null; timezone: string | null } }> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(token);

      // Reuse detection. Refresh tokens are single-use, and the token is claimed
      // ATOMICALLY here — a synchronous check-and-set that no concurrent request
      // can interleave with. Claiming up front (rather than checking now and
      // revoking after the DB round-trips) is what closes the check-then-act race
      // that previously let two simultaneous refreshes with the same token both
      // succeed.
      //
      // A `false` result means the token was already revoked, i.e. the family is
      // compromised: a captured token replayed, or one replayed after the
      // legitimate holder already rotated it. Bump passwordVersion to invalidate
      // every outstanding token for that user.
      //
      // Claiming before the user lookup also means a token that fails the checks
      // below stays revoked — correct, since in each of those cases (user gone,
      // password changed) the token should not be usable anyway.
      const remainingMs = getRemainingTtlMs(token);
      const claimedToken = claimToken(token, remainingMs ?? undefined);

      if (!claimedToken) {
        logger.warn(
          `Refresh token reuse detected for user ${decoded.userId}; invalidating all sessions for that user`
        );
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { passwordVersion: { increment: 1 } },
        });
        throw new AppError('Refresh token has been revoked', 401);
      }

      // Verify user still exists and fetch current passwordVersion
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          timezone: true,
          passwordVersion: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Reject refresh if password was changed since this token was issued
      const tokenPasswordVersion = decoded.passwordVersion ?? 0;
      if (tokenPasswordVersion !== user.passwordVersion) {
        throw new AppError('Password has been changed. Please log in again.', 401);
      }

      // Generate new tokens with current passwordVersion
      const accessToken = generateAccessToken({ id: user.id, userId: user.id, email: user.email, passwordVersion: user.passwordVersion });
      const refreshToken = generateRefreshToken({ id: user.id, userId: user.id, email: user.email, passwordVersion: user.passwordVersion });

      // The consumed token was already revoked by the atomic claim above, so
      // there is nothing to revoke here. Rotation without revocation would leave
      // a captured refresh token valid for its full lifetime (default 7 days)
      // with no reuse signal at all.
      //
      // Side effect of single-use tokens: two clients refreshing with the SAME
      // cookie at the same instant will see the loser rejected — now
      // deterministically, since the claim is atomic. Each tab single-flights its
      // own refresh, so this needs simultaneous cross-tab refreshes to trigger,
      // and recovery is a re-login.

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          timezone: user.timezone,
        }
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async getCurrentUser(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        timezone: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}

export default new AuthService();
