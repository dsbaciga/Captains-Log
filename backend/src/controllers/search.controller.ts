import { Request, Response } from 'express';
import searchService from '../services/search.service';
import { globalSearchQuerySchema } from '../types/search.types';
import { asyncHandler } from '../utils/asyncHandler';
import { requireUserId } from '../utils/controllerHelpers';

export const searchController = {
  globalSearch: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const validatedQuery = globalSearchQuerySchema.parse(req.query);
    const result = await searchService.globalSearch(userId, validatedQuery);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),
};
