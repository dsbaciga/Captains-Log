import { create } from 'zustand';
import type { AxiosError } from 'axios';
import type { User, LoginInput, RegisterInput } from '../types/auth';
import authService from '../services/auth.service';
import { setAccessToken, registerAuthClearCallback } from '../lib/tokenManager';
import { clearPersistedCache } from '../lib/queryPersister';
import { getQueryClient } from '../lib/queryClientSetup';
import { offlineService } from '../services/offline.service';
import offlineAuthService from '../services/offlineAuth.service';

interface ApiErrorData {
  message?: string;
}

/**
 * Service worker Cache Storage buckets that must survive logout.
 *
 * Everything else in Cache Storage is either API responses or user media and
 * is therefore user data. The Workbox precache and the font caches hold only
 * static build assets, so wiping them would just force a needless re-download
 * (and break offline app-shell availability) without protecting anything.
 */
const PRESERVED_CACHE_NAMES = new Set(['google-fonts-cache', 'google-fonts-webfonts']);
const PRESERVED_CACHE_PREFIXES = ['workbox-precache'];

/**
 * Delete every service worker cache that can hold the previous user's data.
 */
async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;

  const names = await caches.keys();
  const userDataCaches = names.filter(
    (name) =>
      !PRESERVED_CACHE_NAMES.has(name) &&
      !PRESERVED_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix))
  );

  await Promise.all(userDataCaches.map((name) => caches.delete(name)));
}

/**
 * Clear all origin-scoped caches that can hold the signed-out user's data.
 *
 * None of this storage is user-scoped, so leaving it behind leaks one user's
 * trips, locations, photo metadata and API responses to the next user on a
 * shared device (PersistQueryClientProvider will happily rehydrate it).
 *
 * Every step is isolated: a failure in one must not block the others, and this
 * function never rejects, so it can never leave the user logged in.
 */
async function clearCachedUserData(): Promise<void> {
  const steps: Array<[string, () => void | Promise<unknown>]> = [
    ['in-memory query cache', () => getQueryClient().clear()],
    ['persisted query cache', () => clearPersistedCache()],
    ['offline data cache', () => offlineService.clearAllCache()],
    ['offline sync queue', () => offlineService.clearSyncQueue()],
    ['offline auth session', () => offlineAuthService.clearOfflineSession()],
    ['service worker caches', () => clearServiceWorkerCaches()],
  ];

  await Promise.all(
    steps.map(async ([label, run]) => {
      try {
        await run();
      } catch (error) {
        console.error(`Failed to clear ${label} on logout:`, error);
      }
    })
  );
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // Track if initial auth check is complete
  error: string | null;

  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>; // Silent refresh on page load
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  clearAuth: () => void; // For use by axios interceptor
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (data: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(data);

      // Store access token in memory only (via setAccessToken)
      setAccessToken(response.accessToken);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<ApiErrorData>;
      const errorMessage = axiosErr.response?.data?.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  register: async (data: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);

      setAccessToken(response.accessToken);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<ApiErrorData>;
      const errorMessage = axiosErr.response?.data?.message || 'Registration failed';
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAccessToken(null);
      set({
        user: null,
        isAuthenticated: false,
      });
      // Signed-out state is applied first so a failure here can never keep the
      // user logged in; clearCachedUserData swallows its own errors.
      await clearCachedUserData();
    }
  },

  // Called on app initialization (page load/refresh)
  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      // Try silent refresh using httpOnly cookie
      const result = await authService.silentRefresh();

      if (result) {
        setAccessToken(result.accessToken);
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        // No active session
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  updateUser: (updatedFields: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      return { user: { ...state.user, ...updatedFields } };
    });
  },

  clearError: () => set({ error: null }),

  // Called by axios interceptor when refresh fails
  clearAuth: () => {
    setAccessToken(null);
    set({
      user: null,
      isAuthenticated: false,
    });
    // Fire-and-forget: this is called synchronously from the axios interceptor,
    // so it must not block. clearCachedUserData never rejects.
    void clearCachedUserData();
  },
}));

// Register the clearAuth callback to break the circular dependency
// axios.ts -> authStore.ts -> authService.ts -> axios.ts
// Now axios.ts can call triggerAuthClear() instead of importing authStore
registerAuthClearCallback(() => {
  useAuthStore.getState().clearAuth();
});

// Selectors for granular subscriptions (prevents unnecessary re-renders)
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useIsAuthInitialized = () => useAuthStore((state) => state.isInitialized);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useLogin = () => useAuthStore((state) => state.login);
export const useRegister = () => useAuthStore((state) => state.register);
export const useLogout = () => useAuthStore((state) => state.logout);
export const useInitializeAuth = () => useAuthStore((state) => state.initializeAuth);
export const useUpdateUser = () => useAuthStore((state) => state.updateUser);
export const useClearAuthError = () => useAuthStore((state) => state.clearError);
