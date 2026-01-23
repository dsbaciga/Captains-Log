import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Retry configuration for rate limiting (429) errors
const MAX_RETRIES = 4;
const INITIAL_RETRY_DELAY = 1000; // 1 second

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _retry?: boolean;
}

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes default timeout
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and rate limiting
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle rate limiting (429 Too Many Requests) with exponential backoff
    if (error.response?.status === 429) {
      const retryCount = originalRequest._retryCount || 0;

      if (retryCount < MAX_RETRIES) {
        originalRequest._retryCount = retryCount + 1;

        // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);

        console.log(`Rate limited (429). Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

        await delay(retryDelay);
        return axiosInstance(originalRequest);
      }

      console.error(`Rate limit retry exhausted after ${MAX_RETRIES} attempts`);
    }

    // Handle 401 (Unauthorized) - token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Try to refresh the token
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = data.data;

        // Update tokens in storage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
