import axios from '../lib/axios';
import type { AuthResponse, LoginInput, RegisterInput, User } from '../types/auth';

class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await axios.post('/auth/register', data);
    return response.data;
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await axios.post('/auth/login', data);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await axios.get('/auth/me');
    return response.data;
  }

  async logout(): Promise<void> {
    await axios.post('/auth/logout');
  }

  /**
   * Silent refresh on page load using httpOnly cookie.
   * Returns user and access token if valid session exists, null otherwise.
   */
  async silentRefresh(): Promise<{ user: User; accessToken: string } | null> {
    try {
      const response = await axios.post('/auth/silent-refresh');
      // Backend returns null in data if no session, { user, accessToken } if valid
      return response.data;
    } catch (error) {
      console.error('Silent refresh failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token using httpOnly cookie.
   * No body needed - cookie is sent automatically.
   */
  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await axios.post('/auth/refresh');
    return response.data;
  }
}

export default new AuthService();
