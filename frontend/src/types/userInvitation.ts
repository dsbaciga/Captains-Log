// User invitation status values
export type UserInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

// Input for sending an invitation
export interface SendUserInvitationInput {
  email: string;
  message?: string;
}

// Input for accepting an invitation
export interface AcceptInvitationInput {
  token: string;
  username: string;
  email: string;
  password: string;
}

// Response for a sent invitation
export interface UserInvitation {
  id: number;
  email: string;
  status: UserInvitationStatus;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
  emailSent?: boolean;
  acceptUrl?: string; // Only in development
  invitedBy: {
    id: number;
    username: string;
    email: string;
  } | null;
  acceptedUser?: {
    id: number;
    username: string;
  } | null;
}

// Public invitation info (for accept page)
export interface UserInvitationPublicInfo {
  email: string;
  expiresAt: string;
  status: UserInvitationStatus;
  invitedBy: {
    username: string;
  } | null;
  isExpired: boolean;
  isValid: boolean;
}

// Email status response
export interface EmailStatusResponse {
  emailConfigured: boolean;
}

// Auth response after accepting invitation
export interface AcceptInvitationResponse {
  user: {
    id: number;
    username: string;
    email: string;
    createdAt: string;
  };
  accessToken: string;
}
