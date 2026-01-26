import { Request, Response } from 'express';
import aviationstackService from '../services/aviationstack.service';
import { updateFlightTrackingSchema } from '../types/flightTracking.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

export const flightTrackingController = {
  /**
   * Get flight status for a transportation record
   */
  getFlightStatus: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const transportationId = parseId(req.params.transportationId, 'transportationId');

    const flightStatus = await aviationstackService.getFlightStatus(
      userId,
      transportationId
    );

    res.json({
      status: 'success',
      data: flightStatus,
    });
  }),

  /**
   * Refresh flight status for all flights in a trip
   */
  refreshFlightsForTrip: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');

    const results = await aviationstackService.refreshFlightsForTrip(
      userId,
      tripId
    );

    res.json({
      status: 'success',
      data: results,
      message: `Refreshed ${results.length} flight(s)`,
    });
  }),

  /**
   * Manually update flight tracking info
   */
  updateFlightTracking: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const transportationId = parseId(req.params.transportationId, 'transportationId');
    const data = updateFlightTrackingSchema.parse(req.body);

    const flightTracking = await aviationstackService.updateFlightTracking(
      userId,
      transportationId,
      data
    );

    res.json({
      status: 'success',
      data: flightTracking,
    });
  }),
};
