// In-memory token storage (NOT in localStorage - immune to XSS)
let accessToken: string | null = null;

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
