# OAuth / OpenID Connect (OIDC) Support Plan

## Overview

Add support for external OAuth 2.0 / OpenID Connect identity providers so users can log in with their own self-hosted auth solutions (e.g., **Authelia**, **Pocket ID**) or any standards-compliant OIDC provider.

OAuth becomes an **alternative authentication method** alongside the existing username/password system. The current JWT-based session management remains unchanged — OAuth simply provides another way to obtain a JWT.

### Goals

- Support any generic OIDC-compliant provider via configuration (not hardcoded to a specific vendor)
- Allow a single OIDC provider configured at the instance level (self-hosted personal use)
- Auto-provision users on first OAuth login (no separate registration step)
- Allow existing password-based users to link their OAuth identity
- Optionally disable password-based login entirely (OAuth-only mode)
- Preserve all existing auth security (CSRF, httpOnly cookies, token blacklisting)

### Non-Goals (Out of Scope)

- Multiple simultaneous OAuth providers (Google + GitHub + Authelia, etc.)
- Social login buttons (Google, Facebook, GitHub) — can be added later using this same foundation
- OAuth as a service (this app is not an OAuth provider, only a consumer)

---

## Current Auth Architecture

**Flow:** Email/Password → bcrypt verify → JWT access token (15min) + refresh token (7d httpOnly cookie)

**Key files:**

| Layer | File | Role |
|-------|------|------|
| Config | `backend/src/config/index.ts` | JWT secrets, cookie settings |
| Types | `backend/src/types/auth.types.ts` | Zod schemas, JwtPayload, AuthResponse |
| Utils | `backend/src/utils/jwt.ts` | Token generation/verification |
| Utils | `backend/src/utils/cookies.ts` | Refresh token cookie management |
| Utils | `backend/src/utils/csrf.ts` | CSRF token + validation middleware |
| Utils | `backend/src/utils/password.ts` | bcrypt hash/compare |
| Service | `backend/src/services/auth.service.ts` | Register, login, refresh, getCurrentUser |
| Controller | `backend/src/controllers/auth.controller.ts` | HTTP handlers, cookie setting |
| Routes | `backend/src/routes/auth.routes.ts` | Route definitions |
| Middleware | `backend/src/middleware/auth.ts` | JWT verification middleware |
| Schema | `backend/prisma/schema.prisma` | User model (passwordHash required) |
| Frontend Store | `frontend/src/store/authStore.ts` | Zustand auth state |
| Frontend Service | `frontend/src/services/auth.service.ts` | API calls |
| Frontend Axios | `frontend/src/lib/axios.ts` | Interceptors, token refresh |
| Frontend Pages | `frontend/src/pages/LoginPage.tsx` | Login form |
| Frontend Pages | `frontend/src/pages/RegisterPage.tsx` | Registration form |

---

## How Authelia and Pocket ID Work

Both Authelia and Pocket ID implement **OpenID Connect (OIDC)**, which is an identity layer on top of OAuth 2.0. The flow is:

1. **App redirects user** to the OIDC provider's authorization endpoint
2. **User authenticates** at the provider (password, 2FA, etc.)
3. **Provider redirects back** to the app with an authorization code
4. **App exchanges code** for tokens (access token + ID token) via the provider's token endpoint
5. **App reads ID token** (JWT) to get user identity (email, name, sub)
6. **App creates a local session** (our existing JWT system)

This is the standard **Authorization Code Flow** — the most secure for server-side apps.

### OIDC Discovery

Both providers support **OIDC Discovery** (`.well-known/openid-configuration`), which means we only need the issuer URL — all endpoints are auto-discovered:

```
GET https://auth.example.com/.well-known/openid-configuration
→ {
    "authorization_endpoint": "https://auth.example.com/api/oidc/authorization",
    "token_endpoint": "https://auth.example.com/api/oidc/token",
    "userinfo_endpoint": "https://auth.example.com/api/oidc/userinfo",
    "jwks_uri": "https://auth.example.com/jwks.json",
    ...
  }
```

---

## Implementation Plan

### Phase 1: Database Schema Changes

**Goal:** Allow users to exist without passwords, and store OAuth identity links.

#### 1.1 Modify User Model

Make `passwordHash` optional to support OAuth-only users:

```prisma
model User {
  // ... existing fields ...
  passwordHash       String?  @map("password_hash") @db.VarChar(255)  // Changed: now optional
  // ... rest unchanged ...
}
```

#### 1.2 New OAuthIdentity Model

Store the link between local users and their OIDC identity:

```prisma
model OAuthIdentity {
  id             Int      @id @default(autoincrement())
  userId         Int      @map("user_id")
  provider       String   @db.VarChar(100)   // e.g., "authelia", "pocketid", or issuer URL
  subject        String   @db.VarChar(500)   // OIDC "sub" claim (unique user ID at the provider)
  email          String?  @db.VarChar(255)   // Email from the provider (for display/matching)
  displayName    String?  @map("display_name") @db.VarChar(255)
  accessToken    String?  @map("access_token") @db.Text  // Provider access token (if needed)
  refreshToken   String?  @map("refresh_token") @db.Text // Provider refresh token (if needed)
  tokenExpiresAt DateTime? @map("token_expires_at")
  rawClaims      Json?    @map("raw_claims")             // Full OIDC claims for debugging
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, subject])  // One identity per provider per subject
  @@index([userId])
  @@map("oauth_identities")
}
```

Add relation to User:

```prisma
model User {
  // ... existing relations ...
  oauthIdentities OAuthIdentity[]
}
```

#### 1.3 Migration

```bash
npx prisma migrate dev --name add_oauth_support
```

This migration:
- Makes `password_hash` nullable
- Creates the `oauth_identities` table
- No data loss — existing users keep their password hashes

---

### Phase 2: Backend Configuration

**Goal:** Add OIDC provider configuration via environment variables.

#### 2.1 Environment Variables

Add to `.env`:

```env
# OAuth / OIDC Configuration (optional - enables OAuth login)
OAUTH_ENABLED=true
OAUTH_PROVIDER_NAME=Authelia           # Display name for the login button
OAUTH_ISSUER_URL=https://auth.example.com  # OIDC issuer (must support .well-known/openid-configuration)
OAUTH_CLIENT_ID=travel-life
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_SCOPES=openid profile email      # Space-separated OIDC scopes
OAUTH_CALLBACK_URL=https://travel.example.com/api/auth/oauth/callback

# Optional behavior flags
OAUTH_AUTO_REGISTER=true               # Auto-create users on first OAuth login
OAUTH_DISABLE_PASSWORD_LOGIN=false     # Set to true for OAuth-only mode
OAUTH_ALLOW_ACCOUNT_LINKING=true       # Allow linking OAuth to existing accounts by email match
```

#### 2.2 Config Module Update

Add to `backend/src/config/index.ts`:

```typescript
// OAuth / OIDC
oauth: {
  enabled: process.env.OAUTH_ENABLED === 'true',
  providerName: process.env.OAUTH_PROVIDER_NAME || 'SSO',
  issuerUrl: process.env.OAUTH_ISSUER_URL || '',
  clientId: process.env.OAUTH_CLIENT_ID || '',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  scopes: (process.env.OAUTH_SCOPES || 'openid profile email').split(' '),
  callbackUrl: process.env.OAUTH_CALLBACK_URL || '',
  autoRegister: process.env.OAUTH_AUTO_REGISTER !== 'false',  // default true
  disablePasswordLogin: process.env.OAUTH_DISABLE_PASSWORD_LOGIN === 'true',
  allowAccountLinking: process.env.OAUTH_ALLOW_ACCOUNT_LINKING !== 'false',  // default true
},
```

---

### Phase 3: Backend OIDC Service

**Goal:** Implement the OIDC client logic using the `openid-client` library.

#### 3.1 Dependencies

```bash
cd backend
npm install openid-client
```

The [`openid-client`](https://github.com/panva/openid-client) library is the standard Node.js OIDC client — it handles discovery, token exchange, ID token validation, and JWKS verification automatically.

#### 3.2 New Service: `backend/src/services/oauth.service.ts`

Responsibilities:

| Method | Purpose |
|--------|---------|
| `initialize()` | Discover OIDC endpoints from issuer URL, cache config |
| `getAuthorizationUrl(state, nonce)` | Build the provider's login URL with PKCE |
| `handleCallback(code, state, nonce)` | Exchange authorization code for tokens, validate ID token |
| `findOrCreateUser(claims)` | Match OIDC identity to existing user or auto-create |
| `linkIdentity(userId, claims)` | Link OIDC identity to an existing user account |
| `unlinkIdentity(userId, provider)` | Remove OAuth link (only if user has a password set) |

**Key implementation details:**

```typescript
// Initialization (called once at startup)
import { discovery } from 'openid-client';

let oidcConfig: Configuration;

async function initialize(): Promise<void> {
  if (!config.oauth.enabled) return;

  oidcConfig = await discovery(
    new URL(config.oauth.issuerUrl),
    config.oauth.clientId,
    config.oauth.clientSecret
  );
}

// Generate authorization URL
function getAuthorizationUrl(state: string, nonce: string, codeVerifier: string): string {
  const codeChallenge = calculatePKCECodeChallenge(codeVerifier);

  const params = buildAuthorizationUrl(oidcConfig, {
    redirect_uri: config.oauth.callbackUrl,
    scope: config.oauth.scopes.join(' '),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return params.href;
}

// Exchange code for tokens
async function handleCallback(
  code: string,
  expectedState: string,
  expectedNonce: string,
  codeVerifier: string
): Promise<OAuthUserInfo> {
  const currentUrl = new URL(`${config.oauth.callbackUrl}?code=${code}&state=${expectedState}`);

  const tokens = await authorizationCodeGrant(oidcConfig, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedNonce,
    expectedState,
  });

  const claims = tokens.claims();
  // claims contains: sub, email, name, preferred_username, etc.

  return {
    subject: claims.sub,
    email: claims.email,
    name: claims.name || claims.preferred_username,
    rawClaims: claims,
  };
}
```

#### 3.3 User Matching Logic

When an OIDC callback arrives, resolve to a local user:

```
1. Look up OAuthIdentity by (provider, subject)
   → Found: return existing user

2. If OAUTH_ALLOW_ACCOUNT_LINKING is true:
   Look up User by email (from OIDC claims)
   → Found: create OAuthIdentity linking to this user, return user

3. If OAUTH_AUTO_REGISTER is true:
   Create new User (no passwordHash) + OAuthIdentity, return user

4. Otherwise: return error "No account found. Contact administrator."
```

**Important:** When auto-creating users, also create the default "Myself" companion and default location categories (same as the existing registration flow in `auth.service.ts`).

---

### Phase 4: Backend Routes & Controller

**Goal:** Add OAuth-specific API endpoints.

#### 4.1 New Routes: `backend/src/routes/oauth.routes.ts`

```
GET  /api/auth/oauth/config       → Public. Returns { enabled, providerName, disablePasswordLogin }
GET  /api/auth/oauth/authorize     → Generates auth URL, stores state/nonce in session cookie, redirects
GET  /api/auth/oauth/callback      → Handles provider redirect, exchanges code, issues JWT session
POST /api/auth/oauth/link          → Authenticated. Links OAuth identity to current user
POST /api/auth/oauth/unlink        → Authenticated. Removes OAuth link (requires password set)
```

#### 4.2 Controller: `backend/src/controllers/oauth.controller.ts`

**Config endpoint** (public, no auth required):

```typescript
async getConfig(req: Request, res: Response) {
  res.json({
    status: 'success',
    data: {
      enabled: config.oauth.enabled,
      providerName: config.oauth.providerName,
      disablePasswordLogin: config.oauth.disablePasswordLogin,
    },
  });
}
```

**Authorize endpoint** (initiates OAuth flow):

```typescript
async authorize(req: Request, res: Response) {
  // 1. Generate cryptographic state, nonce, and PKCE code_verifier
  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');
  const codeVerifier = generators.codeVerifier();

  // 2. Store state + nonce + codeVerifier in a short-lived httpOnly cookie
  //    (signed, encrypted, 10 min expiry)
  res.cookie('oauth_state', JSON.stringify({ state, nonce, codeVerifier }), {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: 'lax',  // Must be 'lax' for OAuth redirects to work
    maxAge: 10 * 60 * 1000,  // 10 minutes
    signed: true,
  });

  // 3. Redirect to OIDC provider
  const url = oauthService.getAuthorizationUrl(state, nonce, codeVerifier);
  res.redirect(url);
}
```

**Callback endpoint** (handles provider redirect):

```typescript
async callback(req: Request, res: Response) {
  // 1. Extract code and state from query params
  const { code, state, error } = req.query;
  if (error) {
    return res.redirect(`${config.frontendUrl}/login?error=oauth_denied`);
  }

  // 2. Retrieve and validate state from cookie
  const stored = JSON.parse(req.signedCookies.oauth_state);
  if (state !== stored.state) {
    return res.redirect(`${config.frontendUrl}/login?error=oauth_state_mismatch`);
  }

  // 3. Clear the state cookie
  res.clearCookie('oauth_state');

  // 4. Exchange code for tokens + validate
  const userInfo = await oauthService.handleCallback(
    code, stored.state, stored.nonce, stored.codeVerifier
  );

  // 5. Find or create local user
  const user = await oauthService.findOrCreateUser(userInfo);

  // 6. Issue local JWT session (same as password login)
  const accessToken = generateAccessToken({ id: user.id, userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, userId: user.id, email: user.email });

  // 7. Set refresh token cookie + CSRF cookie (reuse existing helpers)
  setRefreshTokenCookie(res, refreshToken);
  setCsrfCookie(res);

  // 8. Redirect to frontend with access token in a short-lived cookie
  //    (frontend reads it once and stores in memory, then cookie is cleared)
  res.cookie('oauth_access_token', accessToken, {
    httpOnly: false,  // Frontend JS needs to read this
    secure: config.cookie.secure,
    sameSite: 'strict',
    maxAge: 60 * 1000,  // 1 minute — just long enough for frontend to grab it
    path: '/oauth/callback',  // Only accessible on callback page
  });

  res.redirect(`${config.frontendUrl}/oauth/callback`);
}
```

#### 4.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| CSRF during OAuth flow | `state` parameter validated against signed cookie |
| Replay attacks | `nonce` validated in ID token |
| Code interception | PKCE (S256) prevents authorization code theft |
| Token exposure in URL | Access token passed via short-lived scoped cookie, not URL fragment |
| State cookie tampering | Cookie is signed (`signed: true`) |
| Open redirect | Callback URL is hardcoded in config, not from user input |

#### 4.4 Register Routes

In `backend/src/index.ts`, the OAuth routes are registered under the existing auth prefix:

```typescript
import oauthRoutes from './routes/oauth.routes';

// After existing auth routes
if (config.oauth.enabled) {
  app.use('/api/auth/oauth', oauthRoutes);
}
```

Update CSRF middleware to exclude OAuth callback (similar to how auth routes are excluded):

```typescript
// In csrf.ts - add to excluded paths
const CSRF_EXCLUDED_PATHS = ['/api/auth', '/api/auth/oauth/callback'];
```

---

### Phase 5: Modify Existing Auth Service

**Goal:** Adjust existing auth to work alongside OAuth.

#### 5.1 Login Guard

If `OAUTH_DISABLE_PASSWORD_LOGIN=true`, reject password login attempts:

```typescript
// In auth.service.ts login()
if (config.oauth.disablePasswordLogin) {
  throw new AppError('Password login is disabled. Please use SSO.', 403);
}
```

Also block registration when password login is disabled.

#### 5.2 Password Requirement Changes

When a user was created via OAuth (no `passwordHash`), they cannot use password-based endpoints:

```typescript
// In auth.service.ts login()
const user = await prisma.user.findUnique({ where: { email } });
if (!user) throw new AppError('Invalid credentials', 401);
if (!user.passwordHash) {
  throw new AppError('This account uses SSO login. Please log in with your identity provider.', 403);
}
```

#### 5.3 OAuth Unlink Guard

Don't allow unlinking OAuth if the user has no password set:

```typescript
// In oauth.service.ts unlinkIdentity()
const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user.passwordHash) {
  throw new AppError('Cannot unlink OAuth — set a password first.', 400);
}
```

---

### Phase 6: Frontend Changes

**Goal:** Add OAuth login flow to the frontend.

#### 6.1 New Config Query

Fetch OAuth config on app initialization to know whether to show OAuth button:

**New file:** `frontend/src/services/oauth.service.ts`

```typescript
class OAuthService {
  async getConfig(): Promise<OAuthConfig> {
    const response = await axios.get('/auth/oauth/config');
    return response.data.data;
  }
}

export interface OAuthConfig {
  enabled: boolean;
  providerName: string;
  disablePasswordLogin: boolean;
}
```

#### 6.2 Login Page Changes

Modify `frontend/src/pages/LoginPage.tsx`:

```
┌──────────────────────────────────────┐
│           Travel Life Login          │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🔑  Sign in with Authelia   │    │  ← OAuth button (if enabled)
│  └──────────────────────────────┘    │
│                                      │
│  ──────────── or ─────────────       │  ← Divider (if both methods active)
│                                      │
│  Email:    [________________]        │  ← Password form
│  Password: [________________]        │     (hidden if disablePasswordLogin)
│  [         Sign In          ]        │
│                                      │
│  Don't have an account? Register     │  ← Hidden if disablePasswordLogin
└──────────────────────────────────────┘
```

**OAuth button behavior:**

```typescript
const handleOAuthLogin = () => {
  // Full-page redirect to backend, which redirects to OIDC provider
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/oauth/authorize`;
};
```

#### 6.3 OAuth Callback Page

**New file:** `frontend/src/pages/OAuthCallbackPage.tsx`

This page handles the redirect back from the OAuth flow:

```typescript
export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // 1. Read the one-time access token cookie
    const token = getCookie('oauth_access_token');

    if (token) {
      // 2. Store in memory (same as normal login)
      setAccessToken(token);

      // 3. Clear the cookie immediately
      document.cookie = 'oauth_access_token=; path=/oauth/callback; max-age=0';

      // 4. Initialize auth state (fetches user profile)
      initializeAuth().then(() => {
        navigate('/dashboard', { replace: true });
      });
    } else {
      // No token — something went wrong, redirect to login
      navigate('/login?error=oauth_failed', { replace: true });
    }
  }, []);

  return <LoadingSpinner message="Completing sign-in..." />;
}
```

#### 6.4 Route Registration

Add to `frontend/src/App.tsx`:

```typescript
<Route path="/oauth/callback" element={<OAuthCallbackPage />} />
```

#### 6.5 Register Page Changes

- If `disablePasswordLogin` is true, redirect to login page (which shows OAuth button only)
- If OAuth is enabled but password login is also allowed, show both options

#### 6.6 Settings Page — Account Linking

Add an "Account Linking" section to the user settings page:

```
┌──────────────────────────────────────┐
│  Linked Accounts                     │
│                                      │
│  Authelia    user@example.com        │
│              [Unlink]                │  ← Only if user has a password
│                                      │
│  ─── or ───                          │
│                                      │
│  [Link Authelia Account]             │  ← If no OAuth identity linked
└──────────────────────────────────────┘
```

---

### Phase 7: Docker / Deployment Configuration

#### 7.1 Docker Compose Updates

Add OAuth environment variables to `docker-compose.yml` and `docker-compose.prod.yml`:

```yaml
captains-log-backend:
  environment:
    # ... existing vars ...
    - OAUTH_ENABLED=${OAUTH_ENABLED:-false}
    - OAUTH_PROVIDER_NAME=${OAUTH_PROVIDER_NAME:-SSO}
    - OAUTH_ISSUER_URL=${OAUTH_ISSUER_URL:-}
    - OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID:-}
    - OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET:-}
    - OAUTH_SCOPES=${OAUTH_SCOPES:-openid profile email}
    - OAUTH_CALLBACK_URL=${OAUTH_CALLBACK_URL:-}
    - OAUTH_AUTO_REGISTER=${OAUTH_AUTO_REGISTER:-true}
    - OAUTH_DISABLE_PASSWORD_LOGIN=${OAUTH_DISABLE_PASSWORD_LOGIN:-false}
    - OAUTH_ALLOW_ACCOUNT_LINKING=${OAUTH_ALLOW_ACCOUNT_LINKING:-true}
```

#### 7.2 Provider Setup Guides

Document configuration for the two target providers:

**Authelia:**

```env
OAUTH_ENABLED=true
OAUTH_PROVIDER_NAME=Authelia
OAUTH_ISSUER_URL=https://auth.example.com
OAUTH_CLIENT_ID=travel-life
OAUTH_CLIENT_SECRET=<generated-secret>
OAUTH_SCOPES=openid profile email
OAUTH_CALLBACK_URL=https://travel.example.com/api/auth/oauth/callback
```

Authelia `configuration.yml` addition:

```yaml
identity_providers:
  oidc:
    clients:
      - client_id: travel-life
        client_name: Travel Life
        client_secret: '<hashed-secret>'
        redirect_uris:
          - https://travel.example.com/api/auth/oauth/callback
        scopes:
          - openid
          - profile
          - email
        authorization_policy: two_factor  # or one_factor
```

**Pocket ID:**

```env
OAUTH_ENABLED=true
OAUTH_PROVIDER_NAME=Pocket ID
OAUTH_ISSUER_URL=https://id.example.com
OAUTH_CLIENT_ID=<pocket-id-client-id>
OAUTH_CLIENT_SECRET=<pocket-id-client-secret>
OAUTH_SCOPES=openid profile email
OAUTH_CALLBACK_URL=https://travel.example.com/api/auth/oauth/callback
```

---

## Implementation Sequence

| Order | Phase | Effort | Dependencies |
|-------|-------|--------|--------------|
| 1 | Phase 1 — Database schema | Small | None |
| 2 | Phase 2 — Backend config | Small | Phase 1 |
| 3 | Phase 3 — OIDC service | Medium | Phase 2 |
| 4 | Phase 4 — Routes & controller | Medium | Phase 3 |
| 5 | Phase 5 — Modify existing auth | Small | Phase 4 |
| 6 | Phase 6 — Frontend changes | Medium | Phase 4 |
| 7 | Phase 7 — Docker/deployment | Small | Phase 2 |

**Estimated total effort:** 2-3 focused implementation sessions.

Phases 6 and 7 can be done in parallel once Phase 4 is complete.

---

## Data Flow Diagram

```
                    OAUTH LOGIN FLOW
                    ================

  Browser                    Backend                    OIDC Provider
  ───────                    ───────                    ─────────────
     │                          │                            │
     │  Click "Sign in with     │                            │
     │  Authelia"               │                            │
     │─────────────────────────>│                            │
     │  GET /auth/oauth/        │                            │
     │      authorize           │                            │
     │                          │                            │
     │                          │  Generate state, nonce,    │
     │                          │  PKCE code_verifier        │
     │                          │  Store in signed cookie    │
     │                          │                            │
     │  302 Redirect            │                            │
     │<─────────────────────────│                            │
     │  + oauth_state cookie    │                            │
     │                          │                            │
     │  Follow redirect to      │                            │
     │  OIDC authorization      │                            │
     │──────────────────────────────────────────────────────>│
     │                          │                            │
     │                          │          User authenticates│
     │                          │          (password, 2FA)   │
     │                          │                            │
     │  302 Redirect to callback│                            │
     │<──────────────────────────────────────────────────────│
     │  ?code=xxx&state=yyy     │                            │
     │                          │                            │
     │  GET /auth/oauth/        │                            │
     │      callback            │                            │
     │─────────────────────────>│                            │
     │  + oauth_state cookie    │                            │
     │                          │  Validate state            │
     │                          │                            │
     │                          │  Exchange code for tokens  │
     │                          │───────────────────────────>│
     │                          │  POST /token               │
     │                          │<───────────────────────────│
     │                          │  {access_token, id_token}  │
     │                          │                            │
     │                          │  Validate ID token         │
     │                          │  Extract claims (sub,email)│
     │                          │                            │
     │                          │  Find or create local user │
     │                          │  Issue local JWT session   │
     │                          │                            │
     │  302 Redirect to         │                            │
     │  /oauth/callback         │                            │
     │<─────────────────────────│                            │
     │  + refresh_token cookie  │                            │
     │  + csrf cookie           │                            │
     │  + oauth_access_token    │                            │
     │    cookie (1 min)        │                            │
     │                          │                            │
     │  Frontend reads access   │                            │
     │  token, stores in memory,│                            │
     │  clears cookie           │                            │
     │                          │                            │
     │  Redirect to /dashboard  │                            │
     │                          │                            │
     ▼                          ▼                            ▼

         SUBSEQUENT REQUESTS: Identical to password login
         (Bearer token in header, refresh via httpOnly cookie)
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `backend/src/services/oauth.service.ts` | OIDC client logic (discovery, auth URL, code exchange, user matching) |
| `backend/src/controllers/oauth.controller.ts` | HTTP handlers for OAuth endpoints |
| `backend/src/routes/oauth.routes.ts` | Route definitions |
| `backend/src/types/oauth.types.ts` | TypeScript types and Zod schemas for OAuth |
| `frontend/src/pages/OAuthCallbackPage.tsx` | Handles redirect back from provider |
| `frontend/src/services/oauth.service.ts` | Frontend OAuth API client |
| `backend/prisma/migrations/xxx_add_oauth_support/` | Database migration |

### Modified Files

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Make `passwordHash` optional, add `OAuthIdentity` model |
| `backend/src/config/index.ts` | Add `oauth` config section |
| `backend/src/index.ts` | Register OAuth routes |
| `backend/src/services/auth.service.ts` | Add password login guard, handle passwordless users |
| `backend/src/utils/csrf.ts` | Exclude OAuth callback from CSRF validation |
| `frontend/src/pages/LoginPage.tsx` | Add OAuth button, conditional password form |
| `frontend/src/pages/RegisterPage.tsx` | Hide when password login disabled |
| `frontend/src/App.tsx` | Add `/oauth/callback` route |
| `frontend/src/store/authStore.ts` | Handle OAuth config state |
| `docker-compose.yml` | Add OAuth environment variables |
| `docker-compose.prod.yml` | Add OAuth environment variables |
| `.env.example` | Document OAuth variables |

---

## Testing Plan

### Manual Testing Checklist

- [ ] OAuth disabled: app works exactly as before (no OAuth button, password login works)
- [ ] OAuth enabled + password enabled: both login methods visible and functional
- [ ] OAuth enabled + password disabled: only OAuth button shown, password endpoints return 403
- [ ] First OAuth login with auto-register: new user created, logged in, default companion created
- [ ] Second OAuth login: existing user found by OIDC subject, logged in
- [ ] Account linking: existing password user logs in via OAuth, identities merged by email
- [ ] Account unlinking: user with password can unlink OAuth
- [ ] Account unlinking guard: OAuth-only user cannot unlink (must set password first)
- [ ] State mismatch: tampered state parameter rejected
- [ ] Expired state cookie: returns error, redirects to login
- [ ] Provider down: graceful error, redirects to login with error message
- [ ] Session management: OAuth-initiated sessions work with existing refresh/logout flow
- [ ] File access: OAuth users can access uploaded files (existing auth middleware)
- [ ] CSRF: protected endpoints still validate CSRF for OAuth users

### Integration Testing

- [ ] Test with Authelia instance
- [ ] Test with Pocket ID instance
- [ ] Test OIDC discovery with both providers
- [ ] Test token refresh flow after OAuth login
- [ ] Test concurrent sessions (password + OAuth for same user)

---

## Migration & Rollback

### Forward Migration

1. Deploy database migration (add `oauth_identities` table, make `password_hash` nullable)
2. Deploy backend with OAuth disabled (`OAUTH_ENABLED=false`)
3. Deploy frontend (OAuth button hidden when disabled)
4. Configure OIDC provider (Authelia/Pocket ID client registration)
5. Enable OAuth (`OAUTH_ENABLED=true`) and set environment variables
6. Test OAuth flow end-to-end

### Rollback

1. Set `OAUTH_ENABLED=false` — immediately disables OAuth login
2. OAuth-only users (no password) will be locked out until re-enabled or a password is set manually
3. Database migration is backwards-compatible — existing users unaffected
4. No data loss on rollback

---

## Future Extensions

Once the generic OIDC foundation is in place, these become straightforward additions:

- **Multiple providers** — Change from single provider config to a provider registry (array of configs)
- **Social login** — Add Google/GitHub/Apple as pre-configured OIDC providers
- **Group/role mapping** — Map OIDC claims (groups) to application roles
- **Admin-managed users** — Admin can create OAuth-only accounts without passwords
- **Forced re-authentication** — Require fresh OIDC auth for sensitive operations (e.g., account deletion)

---

## Open Questions

1. **Cookie signing secret** — The `oauth_state` cookie uses `signed: true`, which requires `cookie-parser` to be configured with a secret. Need to add a `COOKIE_SECRET` env var (can reuse `JWT_SECRET` or add a separate one).

2. **Access token delivery** — The plan uses a short-lived, path-scoped cookie to pass the access token from the backend callback to the frontend. An alternative is using a URL fragment (`#access_token=xxx`) which is never sent to servers but is accessible via JavaScript. The cookie approach is slightly more secure against referer leaks but requires careful path scoping. Either approach works.

3. **User merge conflicts** — If an OAuth user's email matches an existing local account, should we auto-link or require the user to log in with their password first to confirm ownership? The plan defaults to auto-linking (simpler for self-hosted personal use), but a stricter option would require password confirmation first.

4. **Token storage encryption** — Should provider access/refresh tokens (stored in `OAuthIdentity`) be encrypted at rest? For self-hosted personal use this is low priority, but would be important for multi-user deployments.
