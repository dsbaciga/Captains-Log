import axios from '../lib/axios';
import type { AuthResponse, LoginInput, RegisterInput, User } from '../types/auth';

class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await axios.post('/auth/register', data);
    return response.data.data;
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await axios.post('/auth/login', data);
    return response.data.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await axios.get('/auth/me');
    return response.data.data;
  }

  async logout(): Promise<void> {
    await axios.post('/auth/logout');
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await axios.post('/auth/refresh', { refreshToken });
    return response.data.data;
  }
}

export default new AuthService();
