import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { UpdateUserSettingsInput } from '../types/userSettings.types';
import bcrypt from 'bcrypt';

class UserService {
  async getUserById(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        timezone: true,
        activityCategories: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async updateUserSettings(userId: number, data: UpdateUserSettingsInput) {
    const updateData: any = {};
    if (data.activityCategories !== undefined) {
      updateData.activityCategories = data.activityCategories;
    }
    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        timezone: true,
        activityCategories: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateImmichSettings(
    userId: number,
    data: { immichApiUrl?: string | null; immichApiKey?: string | null }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        immichApiUrl: data.immichApiUrl !== undefined ? data.immichApiUrl : undefined,
        immichApiKey: data.immichApiKey !== undefined ? data.immichApiKey : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        immichApiUrl: true,
        immichApiKey: true,
      },
    });

    return user;
  }

  async getImmichSettings(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        immichApiUrl: true,
        immichApiKey: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      immichApiUrl: user.immichApiUrl,
      // Return whether key is set, but not the actual key for security
      immichApiKeySet: !!user.immichApiKey,
      immichConfigured: !!(user.immichApiUrl && user.immichApiKey),
    };
  }

  async updateWeatherSettings(
    userId: number,
    data: { weatherApiKey?: string | null }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        weatherApiKey: data.weatherApiKey !== undefined ? data.weatherApiKey : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        weatherApiKey: true,
      },
    });

    return user;
  }

  async getWeatherSettings(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weatherApiKey: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      // Return whether key is set, but not the actual key for security
      weatherApiKeySet: !!user.weatherApiKey,
    };
  }

  async updateUsername(userId: number, newUsername: string) {
    // Check if username is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username: newUsername,
        id: { not: userId },
      },
    });

    if (existingUser) {
      throw new AppError('Username is already taken', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: newUsername },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        timezone: true,
        activityCategories: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}

export default new UserService();
