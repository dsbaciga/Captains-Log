/**
 * Extract a human-readable message from a rejected API call.
 *
 * Services reject with axios errors carrying `response.data.message` from the backend's
 * `{ status, message }` envelope, but a thrown value is `unknown` — it may be a network
 * error, a DOMException from an aborted request, or anything else. This narrows
 * structurally with `in` and `typeof` checks rather than asserting a shape that may not
 * be there, so a malformed error falls back instead of yielding `undefined` at runtime.
 *
 * @param err - The caught value
 * @param fallback - Message to use when the error carries no usable message
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return fallback;
  }

  const { response } = err;
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    return fallback;
  }

  const { data } = response;
  if (typeof data !== 'object' || data === null || !('message' in data)) {
    return fallback;
  }

  return typeof data.message === 'string' && data.message ? data.message : fallback;
}
