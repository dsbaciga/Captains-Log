import dotenv from 'dotenv';

dotenv.config();

// Validate required JWT secrets
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET environment variable is required. ' +
    'Set it in your .env file or environment variables.'
  );
}

const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
if (!jwtRefreshSecret) {
  throw new Error(
    'JWT_REFRESH_SECRET environment variable is required. ' +
    'Set it in your .env file or environment variables.'
  );
}

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',

  // Database
  databaseUrl: (() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL environment variable is required. ' +
        'Set it in your .env file or environment variables.'
      );
    }
    return url;
  })(),

  // JWT
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: jwtRefreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Cookie (for secure refresh token storage)
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: ((): 'strict' | 'lax' | 'none' => {
      const val = process.env.COOKIE_SAME_SITE ?? 'strict';
      if (val === 'strict' || val === 'lax' || val === 'none') {
        return val; // narrowed to 'strict' | 'lax' | 'none' by the equality checks
      }
      throw new Error(`Invalid COOKIE_SAME_SITE value "${val}". Must be strict, lax, or none.`);
    })(),
    domain: process.env.COOKIE_DOMAIN || undefined, // e.g., '.example.com' for subdomains
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  },

  // External APIs
  immich: {
    apiUrl: process.env.IMMICH_API_URL || '',
    apiKey: process.env.IMMICH_API_KEY || '',
  },

  openWeatherMap: {
    apiKey: process.env.OPENWEATHERMAP_API_KEY || '',
  },

  aviationStack: {
    apiKey: process.env.AVIATIONSTACK_API_KEY || '',
  },

  nominatim: {
    url: process.env.NOMINATIM_URL || 'http://localhost:8080',
  },

  openRouteService: {
    apiKey: process.env.OPENROUTESERVICE_API_KEY,
    url: process.env.OPENROUTESERVICE_URL,
  },

  // Email (SMTP)
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for other ports
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'Travel Life <noreply@example.com>',
  },

  // Frontend URL (for email links)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // OAuth / OIDC single sign-on (enabled when issuer + client ID are set; client
  // secret is optional — public clients rely on PKCE, which is always used)
  oidc: (() => {
    const issuerUrl = (process.env.OIDC_ISSUER_URL || '').replace(/\/+$/, '');
    const clientId = process.env.OIDC_CLIENT_ID || '';
    const clientSecret = process.env.OIDC_CLIENT_SECRET || '';
    return {
      enabled: Boolean(issuerUrl && clientId),
      issuerUrl,
      clientId,
      clientSecret,
      redirectUrl:
        process.env.OIDC_REDIRECT_URL ||
        `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/oidc/callback`,
      scopes: process.env.OIDC_SCOPES || 'openid profile email',
      buttonText: process.env.OIDC_BUTTON_TEXT || 'Sign in with SSO',
      autoProvision: process.env.OIDC_AUTO_PROVISION !== 'false',
    };
  })(),

  // Web Push (VAPID) - push notifications are disabled gracefully when unset
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || '', // e.g. mailto:admin@example.com
  },

  // AI / LLM
  llm: {
    enabled: process.env.AI_ENABLED !== 'false',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
  },
};

export default config;
