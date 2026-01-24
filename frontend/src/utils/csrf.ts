const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Retrieves the CSRF token from the cookie.
 * This token should be sent in the x-csrf-token header for state-changing requests.
 */
export const getCsrfToken = (): string | null => {
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[2] : null;
};
