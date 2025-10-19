import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './config/logger';
import { errorHandler } from './middleware/errorHandler';
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
app.use(cors());

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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: "Captain's Log API",
    version: '1.0.0',
    status: 'running',
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

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  logger.info(`Base URL: ${config.baseUrl}`);
});

export default app;
