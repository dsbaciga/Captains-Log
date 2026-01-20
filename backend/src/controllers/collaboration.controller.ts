import { Request, Response, NextFunction } from 'express';
import { collaborationService } from '../services/collaboration.service';
import {
  sendInvitationSchema,
  updateCollaboratorSchema,
} from '../types/collaboration.types';

export const collaborationController = {
  /**
   * Send an invitation to collaborate on a trip
   * POST /api/trips/:tripId/invitations
   */
  async sendInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const data = sendInvitationSchema.parse(req.body);
      const invitation = await collaborationService.sendInvitation(userId, tripId, data);
      res.status(201).json(invitation);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get pending invitations for the current user
   * GET /api/invitations
   */
  async getMyInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const invitations = await collaborationService.getPendingInvitationsForUser(userId);
      res.json(invitations);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get invitation by token (public endpoint for viewing invitation details)
   * GET /api/invitations/token/:token
   */
  async getInvitationByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const invitation = await collaborationService.getInvitationByToken(token);
      res.json(invitation);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Accept an invitation
   * POST /api/invitations/:invitationId/accept
   */
  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const invitationId = parseInt(req.params.invitationId);
      const collaborator = await collaborationService.acceptInvitation(userId, invitationId);
      res.json(collaborator);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Decline an invitation
   * POST /api/invitations/:invitationId/decline
   */
  async declineInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const invitationId = parseInt(req.params.invitationId);
      const result = await collaborationService.declineInvitation(userId, invitationId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all collaborators for a trip
   * GET /api/trips/:tripId/collaborators
   */
  async getCollaborators(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const result = await collaborationService.getCollaborators(userId, tripId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get pending invitations for a trip
   * GET /api/trips/:tripId/invitations
   */
  async getTripInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const invitations = await collaborationService.getTripInvitations(userId, tripId);
      res.json(invitations);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a collaborator's permission level
   * PATCH /api/trips/:tripId/collaborators/:userId
   */
  async updateCollaborator(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const collaboratorUserId = parseInt(req.params.userId);
      const data = updateCollaboratorSchema.parse(req.body);
      const collaborator = await collaborationService.updateCollaborator(
        userId,
        tripId,
        collaboratorUserId,
        data
      );
      res.json(collaborator);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Remove a collaborator from a trip
   * DELETE /api/trips/:tripId/collaborators/:userId
   */
  async removeCollaborator(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const collaboratorUserId = parseInt(req.params.userId);
      const result = await collaborationService.removeCollaborator(
        userId,
        tripId,
        collaboratorUserId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cancel a pending invitation
   * DELETE /api/trips/:tripId/invitations/:invitationId
   */
  async cancelInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const invitationId = parseInt(req.params.invitationId);
      const result = await collaborationService.cancelInvitation(userId, tripId, invitationId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Resend a pending invitation
   * POST /api/trips/:tripId/invitations/:invitationId/resend
   */
  async resendInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const invitationId = parseInt(req.params.invitationId);
      const invitation = await collaborationService.resendInvitation(userId, tripId, invitationId);
      res.json(invitation);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get trips shared with the current user (where user is collaborator)
   * GET /api/trips/shared
   */
  async getSharedTrips(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const trips = await collaborationService.getSharedTrips(userId);
      res.json(trips);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's permission level for a trip
   * GET /api/trips/:tripId/permission
   */
  async getPermissionLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tripId = parseInt(req.params.tripId);
      const result = await collaborationService.getUserPermissionLevel(userId, tripId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
