// In-memory token storage (NOT in localStorage - immune to XSS)
let accessToken: string | null = null;

// Callback for when auth should be cleared (set by authStore to break circular dependency)
let onAuthClearCallback: (() => void) | null = null;

/**
 * Retrieves the current in-memory access token.
 * @returns The access token or null if not set.
 */
export const getAccessToken = (): string | null => accessToken;

/**
 * Sets the in-memory access token.
 * @param token The access token to store.
 */
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

/**
 * Register a callback to be called when auth should be cleared.
 * This is used by authStore to register its clearAuth function,
 * breaking the circular dependency between axios -> authStore -> authService -> axios.
 */
export const registerAuthClearCallback = (callback: () => void): void => {
  onAuthClearCallback = callback;
};

/**
 * Clear auth state by calling the registered callback.
 * Called by axios interceptor when token refresh fails.
 */
export const triggerAuthClear = (): void => {
  if (onAuthClearCallback) {
    onAuthClearCallback();
  }
};
