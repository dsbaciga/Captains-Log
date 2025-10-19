import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    avatarUrl: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
}
