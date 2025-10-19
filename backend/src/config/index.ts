import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'jwt-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
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
};

export default config;
