import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { RegisterInput, LoginInput, AuthResponse } from '../types/auth.types';
import { companionService } from './companion.service';

export class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new AppError('Email already registered', 400);
      }
      throw new AppError('Username already taken', 400);
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

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id, userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
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

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id, userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string; user: { id: number; username: string; email: string; avatarUrl: string | null } }> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(token);

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate new tokens
      const accessToken = generateAccessToken({ id: user.id, userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ id: user.id, userId: user.id, email: user.email });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
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
