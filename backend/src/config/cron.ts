import cron from 'node-cron';
import tripService from '../services/trip.service';
import pushNotificationService from '../services/pushNotification.service';
import logger from './logger';

/**
 * Initializes all cron jobs for the application
 */
export function initCronJobs(): void {
  // Run trip status auto-update every day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily trip status auto-update...');
    try {
      const updatedCount = await tripService.autoUpdateGlobalTripStatuses();
      logger.info(`Successfully auto-updated status for ${updatedCount} trips.`);
    } catch (error) {
      logger.error('Error during trip status auto-update cron job:', error);
    }
  });

  // Hourly "trip starts tomorrow" push notification reminders.
  // No-op when web push (VAPID env vars) is not configured.
  cron.schedule('0 * * * *', async () => {
    try {
      const notified = await pushNotificationService.sendTripStartReminders();
      if (notified > 0) {
        logger.info(`Sent trip-start push reminders for ${notified} trip(s).`);
      }
    } catch (error) {
      logger.error('Error during trip-start push reminder cron job:', error);
    }
  });

  // Run once on startup to ensure data is fresh
  logger.info('Performing initial trip status update on startup...');
  tripService.autoUpdateGlobalTripStatuses()
    .then(count => logger.info(`Initial trip status update complete. ${count} trips updated.`))
    .catch(err => logger.error('Initial trip status update failed:', err));

  logger.info('Cron jobs initialized.');
}
