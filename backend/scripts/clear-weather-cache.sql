-- Clear all cached weather data to force a fresh fetch
-- with the new precipitation amount (mm) instead of probability (%)
--
-- Run this on your database:
-- - Docker: docker exec -i captains-log-db psql -U captains_log_user -d captains_log -f /path/to/clear-weather-cache.sql
-- - Or run the DELETE command directly in psql or a database client

-- Show count before deletion
SELECT COUNT(*) as "Weather records to delete" FROM weather_data;

-- Delete all weather data
DELETE FROM weather_data;

-- Confirm deletion
SELECT COUNT(*) as "Weather records remaining" FROM weather_data;
