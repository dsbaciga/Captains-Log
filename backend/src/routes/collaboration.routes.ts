import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { collaborationController } from '../controllers/collaboration.controller';

const router = Router();

// ============================================================
// User Invitations (for the logged-in user)
// ============================================================

// Get pending invitations for the current user
router.get('/invitations', authenticate, collaborationController.getMyInvitations);

// Get invitation details by token (used for invite links)
router.get('/invitations/token/:token', collaborationController.getInvitationByToken);

// Accept an invitation
router.post('/invitations/:invitationId/accept', authenticate, collaborationController.acceptInvitation);

// Decline an invitation
router.post('/invitations/:invitationId/decline', authenticate, collaborationController.declineInvitation);

// ============================================================
// Shared Trips
// ============================================================

// Get trips shared with the current user (where user is collaborator)
router.get('/trips/shared', authenticate, collaborationController.getSharedTrips);

// ============================================================
// Trip-specific collaboration management
// ============================================================

// Get user's permission level for a trip
router.get('/trips/:tripId/permission', authenticate, collaborationController.getPermissionLevel);

// Get all collaborators for a trip
router.get('/trips/:tripId/collaborators', authenticate, collaborationController.getCollaborators);

// Update a collaborator's permission level
router.patch('/trips/:tripId/collaborators/:userId', authenticate, collaborationController.updateCollaborator);

// Remove a collaborator from a trip (or leave the trip)
router.delete('/trips/:tripId/collaborators/:userId', authenticate, collaborationController.removeCollaborator);

// ============================================================
// Trip Invitations (for trip owners/admins)
// ============================================================

// Get pending invitations for a trip
router.get('/trips/:tripId/invitations', authenticate, collaborationController.getTripInvitations);

// Send an invitation to collaborate on a trip
router.post('/trips/:tripId/invitations', authenticate, collaborationController.sendInvitation);

// Cancel a pending invitation
router.delete('/trips/:tripId/invitations/:invitationId', authenticate, collaborationController.cancelInvitation);

// Resend a pending invitation
router.post('/trips/:tripId/invitations/:invitationId/resend', authenticate, collaborationController.resendInvitation);

export default router;
