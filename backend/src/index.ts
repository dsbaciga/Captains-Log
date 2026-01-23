import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const app: Application = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'http://localhost:5000'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
// CORS configuration - use CORS_ORIGIN env var in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
