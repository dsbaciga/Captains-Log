import { z } from 'zod';

// Permission levels for collaborators
export const PermissionLevel = {
  VIEW: 'view',
  EDIT: 'edit',
  ADMIN: 'admin',
} as const;

export type PermissionLevelType = (typeof PermissionLevel)[keyof typeof PermissionLevel];

// Invitation status
export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;

export type InvitationStatusType = (typeof InvitationStatus)[keyof typeof InvitationStatus];

// Schema for sending an invitation
export const sendInvitationSchema = z.object({
  email: z.string().email().max(255),
  permissionLevel: z.enum(['view', 'edit', 'admin']).default('view'),
  message: z.string().max(1000).optional(),
});

// Schema for responding to an invitation
export const respondToInvitationSchema = z.object({
  accept: z.boolean(),
});

// Schema for updating a collaborator's permission level
export const updateCollaboratorSchema = z.object({
  permissionLevel: z.enum(['view', 'edit', 'admin']),
});

// Schema for adding a collaborator directly (by user ID)
export const addCollaboratorSchema = z.object({
  userId: z.number().int().positive(),
  permissionLevel: z.enum(['view', 'edit', 'admin']).default('view'),
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type RespondToInvitationInput = z.infer<typeof respondToInvitationSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;

// Response types
export interface CollaboratorResponse {
  id: number;
  tripId: number;
  userId: number;
  permissionLevel: PermissionLevelType;
  createdAt: Date;
  user: {
    id: number;
    username: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface InvitationResponse {
  id: number;
  tripId: number;
  email: string;
  permissionLevel: PermissionLevelType;
  status: InvitationStatusType;
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
  trip: {
    id: number;
    title: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
  };
  invitedBy: {
    id: number;
    username: string;
    email: string;
  };
}

export interface InvitationWithTripResponse extends InvitationResponse {
  trip: {
    id: number;
    title: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    coverPhoto: {
      id: number;
      localPath: string | null;
      thumbnailPath: string | null;
    } | null;
  };
}
