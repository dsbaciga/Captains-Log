import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getCsrfToken } from '../utils/csrf';

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

// In-memory token storage (NOT in localStorage - immune to XSS)
let accessToken: string | null = null;

// Refresh race condition protection
// When multiple 401s occur simultaneously, only one refresh happens
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

// Token getter/setter for use by auth store
export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes default timeout
  withCredentials: true, // CRITICAL: Send cookies with requests
});

// Request interceptor to add auth token from memory and CSRF token
axiosInstance.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add CSRF token for state-changing requests (non-GET/HEAD/OPTIONS)
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
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

    // Handle 401 (Unauthorized) - try cookie-based refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If a refresh is already in progress, wait for it to complete
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh using httpOnly cookie (no body needed, cookie is sent automatically)
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          isRefreshing = false;
          onRefreshed(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        }
        throw new Error('No access token in refresh response');
      } catch (refreshError) {
        // Refresh failed - clear token, subscribers, and redirect
        isRefreshing = false;
        refreshSubscribers = [];
        setAccessToken(null);

        // Import dynamically to avoid circular dependency
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().clearAuth();

        // Preserve the current URL for redirect after login
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
