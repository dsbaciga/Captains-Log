import axios from '../lib/axios';
import type {
  TripInvitation,
  Collaborator,
  CollaboratorsResponse,
  SendInvitationInput,
  UpdateCollaboratorInput,
  UserPermission,
  SharedTrip,
} from '../types/collaboration';

const collaborationService = {
  // ============================================================
  // User Invitations
  // ============================================================

  /**
   * Get pending invitations for the current user
   */
  async getMyInvitations(): Promise<TripInvitation[]> {
    const response = await axios.get('/invitations');
    return response.data.data;
  },

  /**
   * Get invitation details by token (for invite links)
   */
  async getInvitationByToken(token: string): Promise<TripInvitation> {
    const response = await axios.get(`/invitations/token/${token}`);
    return response.data.data;
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: number): Promise<Collaborator> {
    const response = await axios.post(`/invitations/${invitationId}/accept`);
    return response.data.data;
  },

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: number): Promise<{ message: string }> {
    const response = await axios.post(`/invitations/${invitationId}/decline`);
    return response.data.data;
  },

  // ============================================================
  // Shared Trips
  // ============================================================

  /**
   * Get trips shared with the current user
   */
  async getSharedTrips(): Promise<SharedTrip[]> {
    const response = await axios.get('/trips/shared');
    return response.data.data;
  },

  // ============================================================
  // Trip Collaboration Management
  // ============================================================

  /**
   * Get user's permission level for a trip
   */
  async getPermissionLevel(tripId: number): Promise<UserPermission> {
    const response = await axios.get(`/trips/${tripId}/permission`);
    return response.data.data;
  },

  /**
   * Get all collaborators for a trip
   */
  async getCollaborators(tripId: number): Promise<CollaboratorsResponse> {
    const response = await axios.get(`/trips/${tripId}/collaborators`);
    return response.data.data;
  },

  /**
   * Update a collaborator's permission level
   */
  async updateCollaborator(
    tripId: number,
    userId: number,
    data: UpdateCollaboratorInput
  ): Promise<Collaborator> {
    const response = await axios.patch(`/trips/${tripId}/collaborators/${userId}`, data);
    return response.data.data;
  },

  /**
   * Remove a collaborator from a trip
   */
  async removeCollaborator(tripId: number, userId: number): Promise<{ message: string }> {
    const response = await axios.delete(`/trips/${tripId}/collaborators/${userId}`);
    return response.data.data;
  },

  /**
   * Leave a trip (remove self as collaborator)
   */
  async leaveTrip(tripId: number, userId: number): Promise<{ message: string }> {
    return this.removeCollaborator(tripId, userId);
  },

  // ============================================================
  // Trip Invitations (for trip owners/admins)
  // ============================================================

  /**
   * Get pending invitations for a trip
   */
  async getTripInvitations(tripId: number): Promise<TripInvitation[]> {
    const response = await axios.get(`/trips/${tripId}/invitations`);
    return response.data.data;
  },

  /**
   * Send an invitation to collaborate on a trip
   */
  async sendInvitation(tripId: number, data: SendInvitationInput): Promise<TripInvitation> {
    const response = await axios.post(`/trips/${tripId}/invitations`, data);
    return response.data.data;
  },

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(tripId: number, invitationId: number): Promise<{ message: string }> {
    const response = await axios.delete(`/trips/${tripId}/invitations/${invitationId}`);
    return response.data.data;
  },

  /**
   * Resend a pending invitation
   */
  async resendInvitation(tripId: number, invitationId: number): Promise<TripInvitation> {
    const response = await axios.post(`/trips/${tripId}/invitations/${invitationId}/resend`);
    return response.data.data;
  },
};

export default collaborationService;
