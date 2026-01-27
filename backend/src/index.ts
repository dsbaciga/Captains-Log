import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from './config';
import logger from './config/logger';
import { initCronJobs } from './config/cron';
import { setupSwagger } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import prisma, { checkDatabaseConnection } from './config/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import tripRoutes from './routes/trip.routes';
import locationRoutes from './routes/location.routes';
import photoRoutes from './routes/photo.routes';
import photoAlbumRoutes from './routes/photoAlbum.routes';
import activityRoutes from './routes/activity.routes';
import transportationRoutes from './routes/transportation.routes';
import lodgingRoutes from './routes/lodging.routes';
import journalEntryRoutes from './routes/journalEntry.routes';
import tagRoutes from './routes/tag.routes';
import companionRoutes from './routes/companion.routes';
import immichRoutes from './routes/immich.routes';
import weatherRoutes from './routes/weather.routes';
import checklistRoutes from './routes/checklist.routes';
import searchRoutes from './routes/search.routes';
import backupRoutes from './routes/backup.routes';
import entityLinkRoutes from './routes/entityLink.routes';
import collaborationRoutes from './routes/collaboration.routes';
import flightTrackingRoutes from './routes/flightTracking.routes';

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const app: Application = express();

// Security middleware
const isProduction = config.nodeEnv === 'production';

// Build CSP img-src directive - only include localhost in development
const imgSrcDirective = isProduction
  ? ["'self'", 'data:']
  : ["'self'", 'data:', 'http://localhost:5000'];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': imgSrcDirective,
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
// CORS configuration - use CORS_ORIGIN env var in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
};
app.use(cors(corsOptions));

// Rate limiting - stricter limits for auth routes to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login/register attempts per 15 minutes
  message: 'Too many authentication attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Separate rate limiter for silent-refresh (more lenient as it's called on every page load)
const silentRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Allow 60 requests per 15 minutes (4 per minute for page navigation)
  message: 'Too many refresh attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Apply silent-refresh rate limiter before auth limiter (more specific route first)
app.use('/api/auth/silent-refresh', silentRefreshLimiter);
// Apply stricter rate limiting to other auth routes
app.use('/api/auth', authLimiter);
app.use('/api', limiter);

// Body parsing middleware - must be BEFORE CSRF validation so req.cookies is populated
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF validation for defense-in-depth (prevents cross-site request forgery)
// Auth routes are excluded since they bootstrap the CSRF token
import { validateCsrf } from './utils/csrf';
app.use('/api', validateCsrf);

// Serve uploaded files
app.use('/uploads', express.static(config.upload.dir));

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Also check database health
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      timestamp: new Date().toISOString() 
    });
  }
});

// API routes
app.get('/api', (_req, res) => {
  res.json({
    message: "Captain's Log API",
    version: packageJson.version,
    status: 'running',
  });
});

// Version endpoint
app.get('/api/version', (_req, res) => {
  res.json({
    version: packageJson.version,
    name: packageJson.name,
  });
});

// API route handlers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/albums', photoAlbumRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/transportation', transportationRoutes);
app.use('/api/lodging', lodgingRoutes);
app.use('/api/journal', journalEntryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/companions', companionRoutes);
app.use('/api/immich', immichRoutes);
app.use('/api', weatherRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/trips/:tripId/links', entityLinkRoutes);
app.use('/api', collaborationRoutes);
app.use('/api', flightTrackingRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize cron jobs
initCronJobs();

// Setup Swagger documentation
setupSwagger(app);

// Start server
const startServer = async () => {
  try {
    const PORT = config.port;

    // Check database connection before starting the server
    // Increased retries for TrueNAS environment
    await checkDatabaseConnection(10, 5000);

    app.listen(PORT, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
      logger.info(`Base URL: ${config.baseUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
