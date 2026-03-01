import cron from 'node-cron';
import tripService from '../services/trip.service';
import emailImportService from '../services/emailImport.service';
import config from './index';
import logger from './logger';

/**
 * Initializes all cron jobs for the application
 */
export function initCronJobs() {
  // Run trip status auto-update every day at midnight
  // Schedule: 0 0 * * *
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily trip status auto-update...');
    try {
      const updatedCount = await tripService.autoUpdateGlobalTripStatuses();
      logger.info(`Successfully auto-updated status for ${updatedCount} trips.`);
    } catch (error) {
      logger.error('Error during trip status auto-update cron job:', error);
    }
  });

  // You can also run it once on startup to ensure data is fresh
  logger.info('Performing initial trip status update on startup...');
  tripService.autoUpdateGlobalTripStatuses()
    .then(count => logger.info(`Initial trip status update complete. ${count} trips updated.`))
    .catch(err => logger.error('Initial trip status update failed:', err));

  // Email import polling and cleanup
  if (config.emailImport.enabled && emailImportService.isConfigured()) {
    const interval = config.emailImport.pollIntervalMinutes;
    cron.schedule(`*/${interval} * * * *`, async () => {
      try {
        const result = await emailImportService.pollAndProcessEmails();
        logger.info(`Email import: processed=${result.processed}, errors=${result.errors}`);
      } catch (error) {
        logger.error('Error during email import poll:', error);
      }
    });
    logger.info(`Email import polling enabled (every ${interval} minutes)`);

    // Weekly cleanup: purge rawContent from old PARSE_FAILED records (PII protection)
    cron.schedule('0 3 * * 0', async () => {
      try {
        await emailImportService.cleanupOldRecords(30);
        logger.info('Email import cleanup completed');
      } catch (error) {
        logger.error('Error during email import cleanup:', error);
      }
    });
  }

  logger.info('Cron jobs initialized.');
}

