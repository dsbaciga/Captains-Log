import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../types/auth.types';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';
import logger from '../config/logger';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);

    logger.info(`New user registered: ${result.user.email}`);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);

    logger.info(`User logged in: ${result.user.email}`);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const user = await authService.getCurrentUser(userId);

    res.status(200).json({
      status: 'success',
      data: user,
    });
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    // In a stateless JWT system, logout is handled client-side
    // If you implement token blacklisting, add that logic here

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }),
};
