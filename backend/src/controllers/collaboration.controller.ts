import { Request, Response } from 'express';
import { collaborationService } from '../services/collaboration.service';
import {
  sendInvitationSchema,
  updateCollaboratorSchema,
} from '../types/collaboration.types';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { requireUserId } from '../utils/controllerHelpers';

export const collaborationController = {
  /**
   * Send an invitation to collaborate on a trip
   * POST /api/trips/:tripId/invitations
   */
  sendInvitation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const data = sendInvitationSchema.parse(req.body);
    const invitation = await collaborationService.sendInvitation(userId, tripId, data);
    res.status(201).json(invitation);
  }),

  /**
   * Get pending invitations for the current user
   * GET /api/invitations
   */
  getMyInvitations: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const invitations = await collaborationService.getPendingInvitationsForUser(userId);
    res.json(invitations);
  }),

  /**
   * Get invitation by token (public endpoint for viewing invitation details)
   * GET /api/invitations/token/:token
   */
  getInvitationByToken: asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const invitation = await collaborationService.getInvitationByToken(token);
    res.json(invitation);
  }),

  /**
   * Accept an invitation
   * POST /api/invitations/:invitationId/accept
   */
  acceptInvitation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const invitationId = parseId(req.params.invitationId, 'invitationId');
    const collaborator = await collaborationService.acceptInvitation(userId, invitationId);
    res.json(collaborator);
  }),

  /**
   * Decline an invitation
   * POST /api/invitations/:invitationId/decline
   */
  declineInvitation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const invitationId = parseId(req.params.invitationId, 'invitationId');
    const result = await collaborationService.declineInvitation(userId, invitationId);
    res.json(result);
  }),

  /**
   * Get all collaborators for a trip
   * GET /api/trips/:tripId/collaborators
   */
  getCollaborators: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const result = await collaborationService.getCollaborators(userId, tripId);
    res.json(result);
  }),

  /**
   * Get pending invitations for a trip
   * GET /api/trips/:tripId/invitations
   */
  getTripInvitations: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const invitations = await collaborationService.getTripInvitations(userId, tripId);
    res.json(invitations);
  }),

  /**
   * Update a collaborator's permission level
   * PATCH /api/trips/:tripId/collaborators/:userId
   */
  updateCollaborator: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const collaboratorUserId = parseId(req.params.userId, 'userId');
    const data = updateCollaboratorSchema.parse(req.body);
    const collaborator = await collaborationService.updateCollaborator(
      userId,
      tripId,
      collaboratorUserId,
      data
    );
    res.json(collaborator);
  }),

  /**
   * Remove a collaborator from a trip
   * DELETE /api/trips/:tripId/collaborators/:userId
   */
  removeCollaborator: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const collaboratorUserId = parseId(req.params.userId, 'userId');
    const result = await collaborationService.removeCollaborator(
      userId,
      tripId,
      collaboratorUserId
    );
    res.json(result);
  }),

  /**
   * Cancel a pending invitation
   * DELETE /api/trips/:tripId/invitations/:invitationId
   */
  cancelInvitation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const invitationId = parseId(req.params.invitationId, 'invitationId');
    const result = await collaborationService.cancelInvitation(userId, tripId, invitationId);
    res.json(result);
  }),

  /**
   * Resend a pending invitation
   * POST /api/trips/:tripId/invitations/:invitationId/resend
   */
  resendInvitation: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const invitationId = parseId(req.params.invitationId, 'invitationId');
    const invitation = await collaborationService.resendInvitation(userId, tripId, invitationId);
    res.json(invitation);
  }),

  /**
   * Get trips shared with the current user (where user is collaborator)
   * GET /api/trips/shared
   */
  getSharedTrips: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const trips = await collaborationService.getSharedTrips(userId);
    res.json(trips);
  }),

  /**
   * Get user's permission level for a trip
   * GET /api/trips/:tripId/permission
   */
  getPermissionLevel: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripId = parseId(req.params.tripId, 'tripId');
    const result = await collaborationService.getUserPermissionLevel(userId, tripId);
    res.json(result);
  }),
};
