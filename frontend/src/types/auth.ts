export type User = {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
}

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
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
