import { z } from 'zod';

// Invitation status values
export const UserInvitationStatusValues = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
} as const;

export type UserInvitationStatusType = typeof UserInvitationStatusValues[keyof typeof UserInvitationStatusValues];

// Schema for sending a new user invitation
export const sendUserInvitationSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  message: z.string().max(1000).optional(),
});

export type SendUserInvitationInput = z.infer<typeof sendUserInvitationSchema>;

// Schema for accepting an invitation via token (for registration)
export const acceptInvitationSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid invitation token'),
  username: z.string().min(3).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// Response types
export interface UserInvitationResponse {
  id: number;
  email: string;
  status: UserInvitationStatusType;
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: {
    id: number;
    username: string;
    email: string;
  } | null;
}

export interface UserInvitationPublicInfo {
  email: string;
  expiresAt: Date;
  status: UserInvitationStatusType;
  invitedBy: {
    username: string;
  } | null;
  isExpired: boolean;
  isValid: boolean;
}
