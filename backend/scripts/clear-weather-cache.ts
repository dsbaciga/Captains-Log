/**
 * Script to clear all cached weather data to force a fresh fetch
 * with the new precipitation amount (mm) instead of probability (%)
 *
 * Run with: npx ts-node scripts/clear-weather-cache.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearWeatherCache() {
  console.log('Clearing weather cache to fetch new precipitation data...\n');

  try {
    // Count existing records
    const count = await prisma.weatherData.count();
    console.log(`Found ${count} cached weather records.`);

    if (count === 0) {
      console.log('No weather data to clear.');
      return;
    }

    // Delete all weather data
    const result = await prisma.weatherData.deleteMany({});
    console.log(`\nDeleted ${result.count} weather records.`);
    console.log('\nWeather data will be re-fetched with precipitation amounts (mm)');
    console.log('when you next view a trip timeline.');

  } catch (error) {
    console.error('Error clearing weather cache:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearWeatherCache();
