/**
 * Migration helper to clear old localStorage tokens.
 * Called on app initialization to clean up tokens from the old auth system.
 * Users will need to log in again after migration (refresh token now managed server-side).
 */
export const migrateFromLocalStorage = (): void => {
  // Check for old tokens
  const oldAccessToken = localStorage.getItem('accessToken');
  const oldRefreshToken = localStorage.getItem('refreshToken');
  const oldUser = localStorage.getItem('user');

  if (oldAccessToken || oldRefreshToken || oldUser) {
    console.info('Migrating auth from localStorage to secure storage');

    // Clear old storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // User will need to log in again (refresh token now managed server-side via httpOnly cookie)
    // This is acceptable for security migration
  }
};
