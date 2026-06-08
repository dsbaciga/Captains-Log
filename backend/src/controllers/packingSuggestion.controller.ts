import { Request, Response } from 'express';
import packingSuggestionService from '../services/packingSuggestion.service';
import { asyncHandler } from '../http/asyncHandler';
import { parseId } from '../http/parseId';
import { requireUserId } from '../auth/controllerHelpers';

export const packingSuggestionController = {
  /**
   * Get packing suggestions for a trip based on weather data
   */
  getSuggestions: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');

    const result = await packingSuggestionService.getSuggestionsForTrip(tripId, userId);

    res.json({
      status: 'success',
      data: result,
    });
  }),
};
