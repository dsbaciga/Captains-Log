import { Request, Response } from 'express';
import { z } from 'zod';
import { travelPartnerRequestService } from '../services/travelPartnerRequest.service';
import {
  sendTravelPartnerRequestSchema,
  acceptTravelPartnerRequestSchema,
} from '../types/travelPartnerRequest.types';
import { asyncHandler } from '../http/asyncHandler';
import { requireUserId } from '../auth/controllerHelpers';

const requestIdParamSchema = z.object({
  requestId: z.coerce.number().int().positive(),
});

export const travelPartnerRequestController = {
  /**
   * POST /api/users/travel-partner/requests
   */
  sendRequest: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const data = sendTravelPartnerRequestSchema.parse(req.body);
    const request = await travelPartnerRequestService.sendRequest(userId, data);
    res.status(201).json({ status: 'success', data: request });
  }),

  /**
   * GET /api/users/travel-partner/requests
   */
  getRequests: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const requests = await travelPartnerRequestService.getRequests(userId);
    res.json({ status: 'success', data: requests });
  }),

  /**
   * POST /api/users/travel-partner/requests/:requestId/accept
   */
  acceptRequest: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { requestId } = requestIdParamSchema.parse(req.params);
    // `shareExistingTrips` here is the RECIPIENT's choice about their OWN trips.
    // A missing body means "do not back-share".
    const options = acceptTravelPartnerRequestSchema.parse(req.body ?? {});
    const settings = await travelPartnerRequestService.acceptRequest(userId, requestId, options);
    res.json({
      status: 'success',
      data: {
        message: 'Travel partner request accepted',
        ...settings,
      },
    });
  }),

  /**
   * POST /api/users/travel-partner/requests/:requestId/decline
   */
  declineRequest: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { requestId } = requestIdParamSchema.parse(req.params);
    const result = await travelPartnerRequestService.declineRequest(userId, requestId);
    res.json({ status: 'success', data: result });
  }),

  /**
   * DELETE /api/users/travel-partner/requests/:requestId
   */
  cancelRequest: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { requestId } = requestIdParamSchema.parse(req.params);
    const result = await travelPartnerRequestService.cancelRequest(userId, requestId);
    res.json({ status: 'success', data: result });
  }),
};

export default travelPartnerRequestController;
