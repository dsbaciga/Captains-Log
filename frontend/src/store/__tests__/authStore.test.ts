import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — every collaborator authStore reaches for during logout/clearAuth
// ---------------------------------------------------------------------------

vi.mock('../../services/auth.service', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    silentRefresh: vi.fn(),
  },
}));

vi.mock('../../lib/tokenManager', () => ({
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  registerAuthClearCallback: vi.fn(),
  triggerAuthClear: vi.fn(),
}));

vi.mock('../../lib/queryPersister', () => ({
  clearPersistedCache: vi.fn(),
}));

const queryClientClear = vi.fn();
vi.mock('../../lib/queryClientSetup', () => ({
  getQueryClient: vi.fn(() => ({ clear: queryClientClear })),
}));

vi.mock('../../services/offline.service', () => ({
  offlineService: {
    clearAllCache: vi.fn(),
    clearSyncQueue: vi.fn(),
    discardForeignSyncQueue: vi.fn(),
    setSyncQueueOwner: vi.fn(),
  },
}));

vi.mock('../../services/offlineAuth.service', () => ({
  default: {
    clearOfflineSession: vi.fn(),
  },
}));

import { AxiosError, AxiosHeaders } from 'axios';
import type { User } from '../../types/auth';
import authService from '../../services/auth.service';
import { setAccessToken } from '../../lib/tokenManager';
import { clearPersistedCache } from '../../lib/queryPersister';
import { offlineService } from '../../services/offline.service';
import offlineAuthService from '../../services/offlineAuth.service';
import { useAuthStore } from '../authStore';

// ---------------------------------------------------------------------------
// Cache Storage stub
// ---------------------------------------------------------------------------

const cachesKeys = vi.fn<() => Promise<string[]>>();
const cachesDelete = vi.fn<(cacheName: string) => Promise<boolean>>();

/** A fully typed test user, so no assertion is needed to seed the store. */
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    avatarUrl: null,
    ...overrides,
  };
}

/** Every clearing step logout must perform, keyed by a readable label. */
function clearingSteps() {
  return {
    'in-memory query cache': queryClientClear,
    'persisted query cache': vi.mocked(clearPersistedCache),
    'offline data cache': vi.mocked(offlineService.clearAllCache),
    'offline sync queue': vi.mocked(offlineService.clearSyncQueue),
    'offline auth session': vi.mocked(offlineAuthService.clearOfflineSession),
  };
}

/** Put the store into a signed-in state. */
function signIn(user: User = createMockUser()): void {
  useAuthStore.setState({
    user,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
}

/** Wait for the fire-and-forget promises inside clearAuth to settle. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  queryClientClear.mockReturnValue(undefined);
  vi.mocked(clearPersistedCache).mockResolvedValue(undefined);
  vi.mocked(offlineService.clearAllCache).mockResolvedValue(undefined);
  vi.mocked(offlineService.clearSyncQueue).mockResolvedValue(undefined);
  vi.mocked(offlineService.discardForeignSyncQueue).mockResolvedValue(false);
  vi.mocked(offlineService.setSyncQueueOwner).mockResolvedValue(undefined);
  vi.mocked(offlineAuthService.clearOfflineSession).mockResolvedValue(undefined);
  vi.mocked(authService.logout).mockResolvedValue(undefined);

  cachesKeys.mockResolvedValue([
    'api-cache',
    'trip-photos',
    'workbox-precache-v2-https://app.example.com/',
    'google-fonts-cache',
    'google-fonts-webfonts',
  ]);
  cachesDelete.mockResolvedValue(true);

  vi.stubGlobal('caches', { keys: cachesKeys, delete: cachesDelete });

  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ===========================================================================
// sync queue ownership
// ===========================================================================

describe('authStore sync queue ownership', () => {
  it('attributes the sync queue to the user who signs in', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: createMockUser({ id: 7 }),
      accessToken: 'token',
    });

    await useAuthStore.getState().login({ email: 'alice@example.com', password: 'pw' });

    expect(offlineService.discardForeignSyncQueue).toHaveBeenCalledWith(7);
    expect(offlineService.setSyncQueueOwner).toHaveBeenCalledWith(7);
  });

  it('signs in even when reconciling the queue fails', async () => {
    vi.mocked(offlineService.discardForeignSyncQueue).mockRejectedValue(new Error('idb boom'));
    vi.mocked(authService.login).mockResolvedValue({
      user: createMockUser({ id: 7 }),
      accessToken: 'token',
    });

    await expect(
      useAuthStore.getState().login({ email: 'alice@example.com', password: 'pw' })
    ).resolves.toBeUndefined();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

// ===========================================================================
// logout — happy path
// ===========================================================================

describe('authStore.logout', () => {
  it('signs the user out of the store', async () => {
    signIn();

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(setAccessToken).toHaveBeenCalledWith(null);
  });

  it('calls the server logout endpoint', async () => {
    signIn();

    await useAuthStore.getState().logout();

    expect(authService.logout).toHaveBeenCalledTimes(1);
  });

  it('clears all five in-app caches', async () => {
    signIn();

    await useAuthStore.getState().logout();

    for (const [label, fn] of Object.entries(clearingSteps())) {
      expect(fn, `${label} was not cleared`).toHaveBeenCalledTimes(1);
    }
  });

  it('deletes user-data Cache Storage buckets and preserves static-asset ones', async () => {
    signIn();

    await useAuthStore.getState().logout();

    expect(cachesKeys).toHaveBeenCalledTimes(1);

    const deleted = cachesDelete.mock.calls.map(([name]) => name).sort();
    expect(deleted).toEqual(['api-cache', 'trip-photos']);

    // Fonts and the Workbox precache hold only build assets — wiping them would
    // break offline app-shell availability without protecting any user data.
    expect(deleted).not.toContain('google-fonts-cache');
    expect(deleted).not.toContain('google-fonts-webfonts');
    expect(deleted).not.toContain('workbox-precache-v2-https://app.example.com/');
  });

  it('deletes every non-preserved bucket, including unknown names', async () => {
    cachesKeys.mockResolvedValue([
      'some-future-cache',
      'immich-thumbs',
      'workbox-runtime',
      'workbox-precache-v1',
      'google-fonts-cache',
    ]);
    signIn();

    await useAuthStore.getState().logout();

    const deleted = cachesDelete.mock.calls.map(([name]) => name).sort();
    // `workbox-runtime` does NOT start with `workbox-precache`, so it is user data.
    expect(deleted).toEqual(['immich-thumbs', 'some-future-cache', 'workbox-runtime']);
  });

  it('does nothing with Cache Storage when the API is unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    signIn();

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(cachesKeys).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// logout — failure isolation
// ===========================================================================

describe('authStore.logout — failure isolation', () => {
  const failures: Array<[string, () => void]> = [
    ['in-memory query cache', () => queryClientClear.mockImplementation(() => { throw new Error('qc boom'); })],
    ['persisted query cache', () => vi.mocked(clearPersistedCache).mockRejectedValue(new Error('idb boom'))],
    ['offline data cache', () => vi.mocked(offlineService.clearAllCache).mockRejectedValue(new Error('cache boom'))],
    ['offline sync queue', () => vi.mocked(offlineService.clearSyncQueue).mockRejectedValue(new Error('queue boom'))],
    ['offline auth session', () => vi.mocked(offlineAuthService.clearOfflineSession).mockRejectedValue(new Error('session boom'))],
    ['service worker caches', () => cachesKeys.mockRejectedValue(new Error('caches boom'))],
  ];

  it.each(failures)('a failure in %s does not prevent the other clears', async (failing, install) => {
    install();
    signIn();

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    // Every OTHER step still ran exactly once.
    for (const [label, fn] of Object.entries(clearingSteps())) {
      if (label === failing) continue;
      expect(fn, `${label} was skipped after ${failing} failed`).toHaveBeenCalledTimes(1);
    }

    if (failing !== 'service worker caches') {
      expect(cachesKeys).toHaveBeenCalledTimes(1);
      expect(cachesDelete.mock.calls.length).toBeGreaterThan(0);
    }

    // And the user is signed out regardless.
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('completes and signs the user out even when EVERY clear fails', async () => {
    for (const [, install] of failures) install();
    signIn();

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    for (const [label, fn] of Object.entries(clearingSteps())) {
      expect(fn, `${label} was never attempted`).toHaveBeenCalledTimes(1);
    }
    expect(cachesKeys).toHaveBeenCalledTimes(1);

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(setAccessToken).toHaveBeenCalledWith(null);
  });

  it('a single failing caches.delete does not abort the remaining deletes', async () => {
    cachesDelete.mockImplementation(async (name: string) => {
      if (name === 'api-cache') throw new Error('delete boom');
      return true;
    });
    signIn();

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    expect(cachesDelete.mock.calls.map(([n]) => n).sort()).toEqual(['api-cache', 'trip-photos']);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('still clears every cache when the server logout request fails', async () => {
    vi.mocked(authService.logout).mockRejectedValue(new Error('network down'));
    signIn();

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    for (const [label, fn] of Object.entries(clearingSteps())) {
      expect(fn, `${label} was skipped after the network failure`).toHaveBeenCalledTimes(1);
    }
    expect(cachesKeys).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ===========================================================================
// clearAuth — the axios-interceptor path
// ===========================================================================

describe('authStore.clearAuth', () => {
  it('signs the user out synchronously', () => {
    signIn();

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(setAccessToken).toHaveBeenCalledWith(null);
  });

  it('does not call the server logout endpoint', async () => {
    signIn();

    useAuthStore.getState().clearAuth();
    await flush();

    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('clears every cache logout does, except the offline sync queue', async () => {
    signIn();

    useAuthStore.getState().clearAuth();
    await flush();

    for (const [label, fn] of Object.entries(clearingSteps())) {
      if (label === 'offline sync queue') continue;
      expect(fn, `${label} was not cleared`).toHaveBeenCalledTimes(1);
    }
    expect(cachesKeys).toHaveBeenCalledTimes(1);
    expect(cachesDelete.mock.calls.map(([n]) => n).sort()).toEqual(['api-cache', 'trip-photos']);
  });

  // clearAuth fires from the axios interceptor on ANY failed token refresh, so
  // it must not destroy work the user has no other copy of. The queue is
  // reconciled against the next signed-in user instead — see
  // discardForeignSyncQueue.
  it('preserves the offline sync queue, which is unsynced work rather than cache', async () => {
    signIn();

    useAuthStore.getState().clearAuth();
    await flush();

    expect(offlineService.clearSyncQueue).not.toHaveBeenCalled();
  });

  it('never throws, even when every clear rejects', async () => {
    queryClientClear.mockImplementation(() => { throw new Error('qc boom'); });
    vi.mocked(clearPersistedCache).mockRejectedValue(new Error('idb boom'));
    vi.mocked(offlineService.clearAllCache).mockRejectedValue(new Error('cache boom'));
    vi.mocked(offlineService.clearSyncQueue).mockRejectedValue(new Error('queue boom'));
    vi.mocked(offlineAuthService.clearOfflineSession).mockRejectedValue(new Error('session boom'));
    cachesKeys.mockRejectedValue(new Error('caches boom'));

    signIn();

    expect(() => useAuthStore.getState().clearAuth()).not.toThrow();
    await flush();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ===========================================================================
// Sanity: the store's other transitions still behave
// ===========================================================================

describe('authStore — sign-in transitions', () => {
  it('login stores the user and token without touching the caches', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: createMockUser(),
      accessToken: 'access-123',
    });

    await useAuthStore.getState().login({ email: 'alice@example.com', password: 'pw' });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toMatchObject({ id: 1, username: 'alice' });
    expect(setAccessToken).toHaveBeenCalledWith('access-123');
    expect(queryClientClear).not.toHaveBeenCalled();
    expect(cachesKeys).not.toHaveBeenCalled();
  });

  it('a failed login surfaces the server message and leaves the user signed out', async () => {
    // A real AxiosError, not a duck-typed stand-in: the store narrows with
    // axios's own `isAxiosError` guard, and the interceptor in lib/axios
    // rejects with the original error, so this is the shape production sees.
    const serverError = new AxiosError('Request failed');
    serverError.response = {
      data: { message: 'Invalid credentials' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(authService.login).mockRejectedValue(serverError);

    await expect(
      useAuthStore.getState().login({ email: 'alice@example.com', password: 'bad' })
    ).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().error).toBe('Invalid credentials');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('a non-axios failure falls back to a generic message rather than throwing', async () => {
    vi.mocked(authService.login).mockRejectedValue(new TypeError('network down'));

    await expect(
      useAuthStore.getState().login({ email: 'alice@example.com', password: 'bad' })
    ).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().error).toBe('Login failed');
  });
});
