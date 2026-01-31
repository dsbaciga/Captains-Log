export type User = {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  useCustomMapStyle?: boolean;
}

export type AuthResponse = {
  user: User;
  accessToken: string;
  // refreshToken removed - now stored in httpOnly cookie
}

// Keep for backward compatibility during migration
export type LegacyAuthResponse = AuthResponse & {
  refreshToken?: string;
}

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
}

export type LoginInput = {
  email: string;
  password: string;
}
