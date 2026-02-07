import { Request, Response } from 'express';
import userService from '../services/user.service';
import { updateUserSettingsSchema } from '../types/userSettings.types';
import { asyncHandler } from '../utils/asyncHandler';
import { validateUrlNotInternal } from '../utils/urlValidation';
import { z } from 'zod';

const immichSettingsSchema = z.object({
  immichApiUrl: z.string().url().optional().nullable(),
  immichApiKey: z.string().min(1).optional().nullable(),
});

const weatherSettingsSchema = z.object({
  weatherApiKey: z.string().min(1).optional().nullable(),
});

const aviationstackSettingsSchema = z.object({
  aviationstackApiKey: z.string().min(1).optional().nullable(),
});

const openrouteserviceSettingsSchema = z.object({
  openrouteserviceApiKey: z.string().min(1).optional().nullable(),
});

const updateUsernameSchema = z.object({
  username: z.string().min(3).max(50),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const searchUsersQuerySchema = z.object({
  query: z.string().min(3, 'Search query must be at least 3 characters'),
});

const travelPartnerSettingsSchema = z.object({
  travelPartnerId: z.number().int().positive().optional().nullable(),
  defaultPartnerPermission: z.enum(['view', 'edit', 'admin']).optional(),
});

export const userController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await userService.getUserById(userId);
    res.json(user);
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = updateUserSettingsSchema.parse(req.body);
    const user = await userService.updateUserSettings(userId, data);
    res.json(user);
  }),

  updateImmichSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = immichSettingsSchema.parse(req.body);

    // Validate URL to prevent SSRF attacks (only when setting a URL, not when clearing it)
    if (data.immichApiUrl) {
      await validateUrlNotInternal(data.immichApiUrl);
    }

    const user = await userService.updateImmichSettings(userId, data);
    res.json({
      success: true,
      message: 'Immich settings updated successfully',
      immichConfigured: !!(user.immichApiUrl && user.immichApiKey),
    });
  }),

  getImmichSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const settings = await userService.getImmichSettings(userId);
    res.json(settings);
  }),

  updateWeatherSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = weatherSettingsSchema.parse(req.body);
    const user = await userService.updateWeatherSettings(userId, data);
    res.json({
      success: true,
      message: 'Weather API key updated successfully',
      weatherApiKeySet: !!user.weatherApiKey,
    });
  }),

  getWeatherSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const settings = await userService.getWeatherSettings(userId);
    res.json(settings);
  }),

  updateAviationstackSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = aviationstackSettingsSchema.parse(req.body);
    const user = await userService.updateAviationstackSettings(userId, data);
    res.json({
      success: true,
      message: 'Aviationstack API key updated successfully',
      aviationstackApiKeySet: !!user.aviationstackApiKey,
    });
  }),

  getAviationstackSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const settings = await userService.getAviationstackSettings(userId);
    res.json(settings);
  }),

  updateOpenrouteserviceSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = openrouteserviceSettingsSchema.parse(req.body);
    const user = await userService.updateOpenrouteserviceSettings(userId, data);
    res.json({
      success: true,
      message: 'OpenRouteService API key updated successfully',
      openrouteserviceApiKeySet: !!user.openrouteserviceApiKey,
    });
  }),

  getOpenrouteserviceSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const settings = await userService.getOpenrouteserviceSettings(userId);
    res.json(settings);
  }),

  updateUsername: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = updateUsernameSchema.parse(req.body);
    const user = await userService.updateUsername(userId, data.username);
    res.json({
      success: true,
      message: 'Username updated successfully',
      username: user.username,
    });
  }),

  updatePassword: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = updatePasswordSchema.parse(req.body);
    await userService.updatePassword(userId, data.currentPassword, data.newPassword);
    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  }),

  searchUsers: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { query } = searchUsersQuerySchema.parse(req.query);
    const users = await userService.searchUsers(userId, query);
    res.json(users);
  }),

  getTravelPartnerSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const settings = await userService.getTravelPartnerSettings(userId);
    res.json(settings);
  }),

  renameTripType: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { oldName, newName } = z.object({
      oldName: z.string().min(1),
      newName: z.string().min(1),
    }).parse(req.body);
    const updatedTypes = await userService.renameTripType(userId, oldName, newName);
    res.json({
      success: true,
      message: 'Trip type renamed successfully',
      tripTypes: updatedTypes,
    });
  }),

  deleteTripType: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const typeName = decodeURIComponent(req.params.typeName);
    const updatedTypes = await userService.deleteTripType(userId, typeName);
    res.json({
      success: true,
      message: 'Trip type deleted successfully',
      tripTypes: updatedTypes,
    });
  }),

  updateTravelPartnerSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = travelPartnerSettingsSchema.parse(req.body);
    const settings = await userService.updateTravelPartnerSettings(userId, data);
    res.json({
      success: true,
      message: 'Travel partner settings updated successfully',
      ...settings,
    });
  }),
};
