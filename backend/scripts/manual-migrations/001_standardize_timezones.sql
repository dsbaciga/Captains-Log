-- Manual Migration: 001_standardize_timezones
-- Description: Standardize timezone values across all tables to use IANA timezone names
-- Date: 2025-01-24
--
-- This migration converts common non-standard timezone strings (abbreviations, legacy names)
-- to standard IANA timezone names (e.g., "America/New_York", "Europe/London")

-- Create a tracking table for manual migrations if it doesn't exist
CREATE TABLE IF NOT EXISTS _manual_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check if this migration has already been applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM _manual_migrations WHERE name = '001_standardize_timezones') THEN
        RAISE NOTICE 'Migration 001_standardize_timezones already applied, skipping...';
    ELSE
        RAISE NOTICE 'Applying migration 001_standardize_timezones...';

        -- =====================================================
        -- Users table
        -- =====================================================
        UPDATE users SET timezone = 'America/New_York' WHERE timezone IN ('Eastern', 'EST', 'EDT', 'Eastern Time', 'US/Eastern', 'ET');
        UPDATE users SET timezone = 'America/Chicago' WHERE timezone IN ('Central', 'CST', 'CDT', 'Central Time', 'US/Central', 'CT');
        UPDATE users SET timezone = 'America/Denver' WHERE timezone IN ('Mountain', 'MST', 'MDT', 'Mountain Time', 'US/Mountain', 'MT');
        UPDATE users SET timezone = 'America/Los_Angeles' WHERE timezone IN ('Pacific', 'PST', 'PDT', 'Pacific Time', 'US/Pacific', 'PT');
        UPDATE users SET timezone = 'America/Anchorage' WHERE timezone IN ('Alaska', 'AKST', 'AKDT', 'US/Alaska', 'AKT');
        UPDATE users SET timezone = 'Pacific/Honolulu' WHERE timezone IN ('Hawaii', 'HST', 'US/Hawaii', 'HT');
        UPDATE users SET timezone = 'America/Phoenix' WHERE timezone IN ('Arizona', 'US/Arizona');
        UPDATE users SET timezone = 'America/Halifax' WHERE timezone IN ('Atlantic', 'AST', 'ADT', 'Atlantic Time', 'Canada/Atlantic');
        UPDATE users SET timezone = 'America/Sao_Paulo' WHERE timezone IN ('BRT', 'BRST', 'Brazil', 'Sao Paulo', 'Brazil/East');
        UPDATE users SET timezone = 'Europe/London' WHERE timezone IN ('GMT', 'BST', 'London', 'GB', 'UK', 'Britain');
        UPDATE users SET timezone = 'Europe/Lisbon' WHERE timezone IN ('WET', 'WEST', 'Lisbon', 'Portugal');
        UPDATE users SET timezone = 'Europe/Paris' WHERE timezone IN ('CET', 'CEST', 'Paris', 'France');
        UPDATE users SET timezone = 'Europe/Berlin' WHERE timezone IN ('Berlin', 'Germany');
        UPDATE users SET timezone = 'Europe/Rome' WHERE timezone IN ('Rome', 'Italy');
        UPDATE users SET timezone = 'Europe/Amsterdam' WHERE timezone IN ('Amsterdam', 'Netherlands');
        UPDATE users SET timezone = 'Europe/Madrid' WHERE timezone IN ('Madrid', 'Spain');
        UPDATE users SET timezone = 'Europe/Athens' WHERE timezone IN ('EET', 'EEST', 'Athens', 'Greece');
        UPDATE users SET timezone = 'Europe/Helsinki' WHERE timezone IN ('Helsinki', 'Finland');
        UPDATE users SET timezone = 'Europe/Moscow' WHERE timezone IN ('MSK', 'Moscow', 'Russia');
        UPDATE users SET timezone = 'Europe/Istanbul' WHERE timezone IN ('TRT', 'Istanbul', 'Turkey');
        UPDATE users SET timezone = 'Africa/Cairo' WHERE timezone IN ('Cairo', 'Egypt');
        UPDATE users SET timezone = 'Africa/Johannesburg' WHERE timezone IN ('SAST', 'Johannesburg', 'South Africa');
        UPDATE users SET timezone = 'Asia/Riyadh' WHERE timezone IN ('Riyadh', 'Saudi Arabia');
        UPDATE users SET timezone = 'Asia/Dubai' WHERE timezone IN ('GST', 'Dubai', 'UAE', 'Gulf');
        UPDATE users SET timezone = 'Asia/Karachi' WHERE timezone IN ('PKT', 'Karachi', 'Pakistan');
        UPDATE users SET timezone = 'Asia/Kolkata' WHERE timezone IN ('IST', 'India', 'Kolkata', 'Mumbai', 'Asia/Calcutta', 'Indian');
        UPDATE users SET timezone = 'Asia/Dhaka' WHERE timezone IN ('Dhaka', 'Bangladesh');
        UPDATE users SET timezone = 'Asia/Bangkok' WHERE timezone IN ('ICT', 'Bangkok', 'Thailand');
        UPDATE users SET timezone = 'Asia/Jakarta' WHERE timezone IN ('WIB', 'Jakarta', 'Indonesia');
        UPDATE users SET timezone = 'Asia/Ho_Chi_Minh' WHERE timezone IN ('Ho Chi Minh', 'Vietnam', 'Saigon', 'Asia/Saigon');
        UPDATE users SET timezone = 'Asia/Singapore' WHERE timezone IN ('SGT', 'Singapore');
        UPDATE users SET timezone = 'Asia/Hong_Kong' WHERE timezone IN ('HKT', 'Hong Kong', 'Hongkong');
        UPDATE users SET timezone = 'Asia/Shanghai' WHERE timezone IN ('China', 'Beijing', 'Asia/Beijing', 'PRC', 'China Standard');
        UPDATE users SET timezone = 'Asia/Taipei' WHERE timezone IN ('Taipei', 'Taiwan', 'ROC');
        UPDATE users SET timezone = 'Asia/Tokyo' WHERE timezone IN ('JST', 'Tokyo', 'Japan');
        UPDATE users SET timezone = 'Asia/Seoul' WHERE timezone IN ('KST', 'Korea', 'Seoul', 'ROK');
        UPDATE users SET timezone = 'Australia/Perth' WHERE timezone IN ('AWST', 'Perth', 'Australia/West');
        UPDATE users SET timezone = 'Australia/Brisbane' WHERE timezone IN ('Brisbane', 'Queensland', 'Australia/Queensland');
        UPDATE users SET timezone = 'Australia/Sydney' WHERE timezone IN ('AEST', 'AEDT', 'Sydney', 'Australia/NSW');
        UPDATE users SET timezone = 'Australia/Melbourne' WHERE timezone IN ('Melbourne', 'Victoria', 'Australia/Victoria');
        UPDATE users SET timezone = 'Pacific/Auckland' WHERE timezone IN ('NZST', 'NZDT', 'Auckland', 'New Zealand', 'NZ');
        UPDATE users SET timezone = 'Pacific/Fiji' WHERE timezone IN ('FJT', 'Fiji');

        -- =====================================================
        -- Trips table
        -- =====================================================
        UPDATE trips SET timezone = 'America/New_York' WHERE timezone IN ('Eastern', 'EST', 'EDT', 'Eastern Time', 'US/Eastern', 'ET');
        UPDATE trips SET timezone = 'America/Chicago' WHERE timezone IN ('Central', 'CST', 'CDT', 'Central Time', 'US/Central', 'CT');
        UPDATE trips SET timezone = 'America/Denver' WHERE timezone IN ('Mountain', 'MST', 'MDT', 'Mountain Time', 'US/Mountain', 'MT');
        UPDATE trips SET timezone = 'America/Los_Angeles' WHERE timezone IN ('Pacific', 'PST', 'PDT', 'Pacific Time', 'US/Pacific', 'PT');
        UPDATE trips SET timezone = 'America/Anchorage' WHERE timezone IN ('Alaska', 'AKST', 'AKDT', 'US/Alaska', 'AKT');
        UPDATE trips SET timezone = 'Pacific/Honolulu' WHERE timezone IN ('Hawaii', 'HST', 'US/Hawaii', 'HT');
        UPDATE trips SET timezone = 'America/Phoenix' WHERE timezone IN ('Arizona', 'US/Arizona');
        UPDATE trips SET timezone = 'America/Halifax' WHERE timezone IN ('Atlantic', 'AST', 'ADT', 'Atlantic Time', 'Canada/Atlantic');
        UPDATE trips SET timezone = 'America/Sao_Paulo' WHERE timezone IN ('BRT', 'BRST', 'Brazil', 'Sao Paulo', 'Brazil/East');
        UPDATE trips SET timezone = 'Europe/London' WHERE timezone IN ('GMT', 'BST', 'London', 'GB', 'UK', 'Britain');
        UPDATE trips SET timezone = 'Europe/Lisbon' WHERE timezone IN ('WET', 'WEST', 'Lisbon', 'Portugal');
        UPDATE trips SET timezone = 'Europe/Paris' WHERE timezone IN ('CET', 'CEST', 'Paris', 'France');
        UPDATE trips SET timezone = 'Europe/Berlin' WHERE timezone IN ('Berlin', 'Germany');
        UPDATE trips SET timezone = 'Europe/Rome' WHERE timezone IN ('Rome', 'Italy');
        UPDATE trips SET timezone = 'Europe/Amsterdam' WHERE timezone IN ('Amsterdam', 'Netherlands');
        UPDATE trips SET timezone = 'Europe/Madrid' WHERE timezone IN ('Madrid', 'Spain');
        UPDATE trips SET timezone = 'Europe/Athens' WHERE timezone IN ('EET', 'EEST', 'Athens', 'Greece');
        UPDATE trips SET timezone = 'Europe/Helsinki' WHERE timezone IN ('Helsinki', 'Finland');
        UPDATE trips SET timezone = 'Europe/Moscow' WHERE timezone IN ('MSK', 'Moscow', 'Russia');
        UPDATE trips SET timezone = 'Europe/Istanbul' WHERE timezone IN ('TRT', 'Istanbul', 'Turkey');
        UPDATE trips SET timezone = 'Africa/Cairo' WHERE timezone IN ('Cairo', 'Egypt');
        UPDATE trips SET timezone = 'Africa/Johannesburg' WHERE timezone IN ('SAST', 'Johannesburg', 'South Africa');
        UPDATE trips SET timezone = 'Asia/Riyadh' WHERE timezone IN ('Riyadh', 'Saudi Arabia');
        UPDATE trips SET timezone = 'Asia/Dubai' WHERE timezone IN ('GST', 'Dubai', 'UAE', 'Gulf');
        UPDATE trips SET timezone = 'Asia/Karachi' WHERE timezone IN ('PKT', 'Karachi', 'Pakistan');
        UPDATE trips SET timezone = 'Asia/Kolkata' WHERE timezone IN ('IST', 'India', 'Kolkata', 'Mumbai', 'Asia/Calcutta', 'Indian');
        UPDATE trips SET timezone = 'Asia/Dhaka' WHERE timezone IN ('Dhaka', 'Bangladesh');
        UPDATE trips SET timezone = 'Asia/Bangkok' WHERE timezone IN ('ICT', 'Bangkok', 'Thailand');
        UPDATE trips SET timezone = 'Asia/Jakarta' WHERE timezone IN ('WIB', 'Jakarta', 'Indonesia');
        UPDATE trips SET timezone = 'Asia/Ho_Chi_Minh' WHERE timezone IN ('Ho Chi Minh', 'Vietnam', 'Saigon', 'Asia/Saigon');
        UPDATE trips SET timezone = 'Asia/Singapore' WHERE timezone IN ('SGT', 'Singapore');
        UPDATE trips SET timezone = 'Asia/Hong_Kong' WHERE timezone IN ('HKT', 'Hong Kong', 'Hongkong');
        UPDATE trips SET timezone = 'Asia/Shanghai' WHERE timezone IN ('China', 'Beijing', 'Asia/Beijing', 'PRC', 'China Standard');
        UPDATE trips SET timezone = 'Asia/Taipei' WHERE timezone IN ('Taipei', 'Taiwan', 'ROC');
        UPDATE trips SET timezone = 'Asia/Tokyo' WHERE timezone IN ('JST', 'Tokyo', 'Japan');
        UPDATE trips SET timezone = 'Asia/Seoul' WHERE timezone IN ('KST', 'Korea', 'Seoul', 'ROK');
        UPDATE trips SET timezone = 'Australia/Perth' WHERE timezone IN ('AWST', 'Perth', 'Australia/West');
        UPDATE trips SET timezone = 'Australia/Brisbane' WHERE timezone IN ('Brisbane', 'Queensland', 'Australia/Queensland');
        UPDATE trips SET timezone = 'Australia/Sydney' WHERE timezone IN ('AEST', 'AEDT', 'Sydney', 'Australia/NSW');
        UPDATE trips SET timezone = 'Australia/Melbourne' WHERE timezone IN ('Melbourne', 'Victoria', 'Australia/Victoria');
        UPDATE trips SET timezone = 'Pacific/Auckland' WHERE timezone IN ('NZST', 'NZDT', 'Auckland', 'New Zealand', 'NZ');
        UPDATE trips SET timezone = 'Pacific/Fiji' WHERE timezone IN ('FJT', 'Fiji');

        -- =====================================================
        -- Activities table
        -- =====================================================
        UPDATE activities SET timezone = 'America/New_York' WHERE timezone IN ('Eastern', 'EST', 'EDT', 'Eastern Time', 'US/Eastern', 'ET');
        UPDATE activities SET timezone = 'America/Chicago' WHERE timezone IN ('Central', 'CST', 'CDT', 'Central Time', 'US/Central', 'CT');
        UPDATE activities SET timezone = 'America/Denver' WHERE timezone IN ('Mountain', 'MST', 'MDT', 'Mountain Time', 'US/Mountain', 'MT');
        UPDATE activities SET timezone = 'America/Los_Angeles' WHERE timezone IN ('Pacific', 'PST', 'PDT', 'Pacific Time', 'US/Pacific', 'PT');
        UPDATE activities SET timezone = 'America/Anchorage' WHERE timezone IN ('Alaska', 'AKST', 'AKDT', 'US/Alaska', 'AKT');
        UPDATE activities SET timezone = 'Pacific/Honolulu' WHERE timezone IN ('Hawaii', 'HST', 'US/Hawaii', 'HT');
        UPDATE activities SET timezone = 'America/Phoenix' WHERE timezone IN ('Arizona', 'US/Arizona');
        UPDATE activities SET timezone = 'America/Halifax' WHERE timezone IN ('Atlantic', 'AST', 'ADT', 'Atlantic Time', 'Canada/Atlantic');
        UPDATE activities SET timezone = 'America/Sao_Paulo' WHERE timezone IN ('BRT', 'BRST', 'Brazil', 'Sao Paulo', 'Brazil/East');
        UPDATE activities SET timezone = 'Europe/London' WHERE timezone IN ('GMT', 'BST', 'London', 'GB', 'UK', 'Britain');
        UPDATE activities SET timezone = 'Europe/Lisbon' WHERE timezone IN ('WET', 'WEST', 'Lisbon', 'Portugal');
        UPDATE activities SET timezone = 'Europe/Paris' WHERE timezone IN ('CET', 'CEST', 'Paris', 'France');
        UPDATE activities SET timezone = 'Europe/Berlin' WHERE timezone IN ('Berlin', 'Germany');
        UPDATE activities SET timezone = 'Europe/Rome' WHERE timezone IN ('Rome', 'Italy');
        UPDATE activities SET timezone = 'Europe/Amsterdam' WHERE timezone IN ('Amsterdam', 'Netherlands');
        UPDATE activities SET timezone = 'Europe/Madrid' WHERE timezone IN ('Madrid', 'Spain');
        UPDATE activities SET timezone = 'Europe/Athens' WHERE timezone IN ('EET', 'EEST', 'Athens', 'Greece');
        UPDATE activities SET timezone = 'Europe/Helsinki' WHERE timezone IN ('Helsinki', 'Finland');
        UPDATE activities SET timezone = 'Europe/Moscow' WHERE timezone IN ('MSK', 'Moscow', 'Russia');
        UPDATE activities SET timezone = 'Europe/Istanbul' WHERE timezone IN ('TRT', 'Istanbul', 'Turkey');
        UPDATE activities SET timezone = 'Africa/Cairo' WHERE timezone IN ('Cairo', 'Egypt');
        UPDATE activities SET timezone = 'Africa/Johannesburg' WHERE timezone IN ('SAST', 'Johannesburg', 'South Africa');
        UPDATE activities SET timezone = 'Asia/Riyadh' WHERE timezone IN ('Riyadh', 'Saudi Arabia');
        UPDATE activities SET timezone = 'Asia/Dubai' WHERE timezone IN ('GST', 'Dubai', 'UAE', 'Gulf');
        UPDATE activities SET timezone = 'Asia/Karachi' WHERE timezone IN ('PKT', 'Karachi', 'Pakistan');
        UPDATE activities SET timezone = 'Asia/Kolkata' WHERE timezone IN ('IST', 'India', 'Kolkata', 'Mumbai', 'Asia/Calcutta', 'Indian');
        UPDATE activities SET timezone = 'Asia/Dhaka' WHERE timezone IN ('Dhaka', 'Bangladesh');
        UPDATE activities SET timezone = 'Asia/Bangkok' WHERE timezone IN ('ICT', 'Bangkok', 'Thailand');
        UPDATE activities SET timezone = 'Asia/Jakarta' WHERE timezone IN ('WIB', 'Jakarta', 'Indonesia');
        UPDATE activities SET timezone = 'Asia/Ho_Chi_Minh' WHERE timezone IN ('Ho Chi Minh', 'Vietnam', 'Saigon', 'Asia/Saigon');
        UPDATE activities SET timezone = 'Asia/Singapore' WHERE timezone IN ('SGT', 'Singapore');
        UPDATE activities SET timezone = 'Asia/Hong_Kong' WHERE timezone IN ('HKT', 'Hong Kong', 'Hongkong');
        UPDATE activities SET timezone = 'Asia/Shanghai' WHERE timezone IN ('China', 'Beijing', 'Asia/Beijing', 'PRC', 'China Standard');
        UPDATE activities SET timezone = 'Asia/Taipei' WHERE timezone IN ('Taipei', 'Taiwan', 'ROC');
        UPDATE activities SET timezone = 'Asia/Tokyo' WHERE timezone IN ('JST', 'Tokyo', 'Japan');
        UPDATE activities SET timezone = 'Asia/Seoul' WHERE timezone IN ('KST', 'Korea', 'Seoul', 'ROK');
        UPDATE activities SET timezone = 'Australia/Perth' WHERE timezone IN ('AWST', 'Perth', 'Australia/West');
        UPDATE activities SET timezone = 'Australia/Brisbane' WHERE timezone IN ('Brisbane', 'Queensland', 'Australia/Queensland');
        UPDATE activities SET timezone = 'Australia/Sydney' WHERE timezone IN ('AEST', 'AEDT', 'Sydney', 'Australia/NSW');
        UPDATE activities SET timezone = 'Australia/Melbourne' WHERE timezone IN ('Melbourne', 'Victoria', 'Australia/Victoria');
        UPDATE activities SET timezone = 'Pacific/Auckland' WHERE timezone IN ('NZST', 'NZDT', 'Auckland', 'New Zealand', 'NZ');
        UPDATE activities SET timezone = 'Pacific/Fiji' WHERE timezone IN ('FJT', 'Fiji');

        -- =====================================================
        -- Lodging table
        -- =====================================================
        UPDATE lodging SET timezone = 'America/New_York' WHERE timezone IN ('Eastern', 'EST', 'EDT', 'Eastern Time', 'US/Eastern', 'ET');
        UPDATE lodging SET timezone = 'America/Chicago' WHERE timezone IN ('Central', 'CST', 'CDT', 'Central Time', 'US/Central', 'CT');
        UPDATE lodging SET timezone = 'America/Denver' WHERE timezone IN ('Mountain', 'MST', 'MDT', 'Mountain Time', 'US/Mountain', 'MT');
        UPDATE lodging SET timezone = 'America/Los_Angeles' WHERE timezone IN ('Pacific', 'PST', 'PDT', 'Pacific Time', 'US/Pacific', 'PT');
        UPDATE lodging SET timezone = 'America/Anchorage' WHERE timezone IN ('Alaska', 'AKST', 'AKDT', 'US/Alaska', 'AKT');
        UPDATE lodging SET timezone = 'Pacific/Honolulu' WHERE timezone IN ('Hawaii', 'HST', 'US/Hawaii', 'HT');
        UPDATE lodging SET timezone = 'America/Phoenix' WHERE timezone IN ('Arizona', 'US/Arizona');
        UPDATE lodging SET timezone = 'America/Halifax' WHERE timezone IN ('Atlantic', 'AST', 'ADT', 'Atlantic Time', 'Canada/Atlantic');
        UPDATE lodging SET timezone = 'America/Sao_Paulo' WHERE timezone IN ('BRT', 'BRST', 'Brazil', 'Sao Paulo', 'Brazil/East');
        UPDATE lodging SET timezone = 'Europe/London' WHERE timezone IN ('GMT', 'BST', 'London', 'GB', 'UK', 'Britain');
        UPDATE lodging SET timezone = 'Europe/Lisbon' WHERE timezone IN ('WET', 'WEST', 'Lisbon', 'Portugal');
        UPDATE lodging SET timezone = 'Europe/Paris' WHERE timezone IN ('CET', 'CEST', 'Paris', 'France');
        UPDATE lodging SET timezone = 'Europe/Berlin' WHERE timezone IN ('Berlin', 'Germany');
        UPDATE lodging SET timezone = 'Europe/Rome' WHERE timezone IN ('Rome', 'Italy');
        UPDATE lodging SET timezone = 'Europe/Amsterdam' WHERE timezone IN ('Amsterdam', 'Netherlands');
        UPDATE lodging SET timezone = 'Europe/Madrid' WHERE timezone IN ('Madrid', 'Spain');
        UPDATE lodging SET timezone = 'Europe/Athens' WHERE timezone IN ('EET', 'EEST', 'Athens', 'Greece');
        UPDATE lodging SET timezone = 'Europe/Helsinki' WHERE timezone IN ('Helsinki', 'Finland');
        UPDATE lodging SET timezone = 'Europe/Moscow' WHERE timezone IN ('MSK', 'Moscow', 'Russia');
        UPDATE lodging SET timezone = 'Europe/Istanbul' WHERE timezone IN ('TRT', 'Istanbul', 'Turkey');
        UPDATE lodging SET timezone = 'Africa/Cairo' WHERE timezone IN ('Cairo', 'Egypt');
        UPDATE lodging SET timezone = 'Africa/Johannesburg' WHERE timezone IN ('SAST', 'Johannesburg', 'South Africa');
        UPDATE lodging SET timezone = 'Asia/Riyadh' WHERE timezone IN ('Riyadh', 'Saudi Arabia');
        UPDATE lodging SET timezone = 'Asia/Dubai' WHERE timezone IN ('GST', 'Dubai', 'UAE', 'Gulf');
        UPDATE lodging SET timezone = 'Asia/Karachi' WHERE timezone IN ('PKT', 'Karachi', 'Pakistan');
        UPDATE lodging SET timezone = 'Asia/Kolkata' WHERE timezone IN ('IST', 'India', 'Kolkata', 'Mumbai', 'Asia/Calcutta', 'Indian');
        UPDATE lodging SET timezone = 'Asia/Dhaka' WHERE timezone IN ('Dhaka', 'Bangladesh');
        UPDATE lodging SET timezone = 'Asia/Bangkok' WHERE timezone IN ('ICT', 'Bangkok', 'Thailand');
        UPDATE lodging SET timezone = 'Asia/Jakarta' WHERE timezone IN ('WIB', 'Jakarta', 'Indonesia');
        UPDATE lodging SET timezone = 'Asia/Ho_Chi_Minh' WHERE timezone IN ('Ho Chi Minh', 'Vietnam', 'Saigon', 'Asia/Saigon');
        UPDATE lodging SET timezone = 'Asia/Singapore' WHERE timezone IN ('SGT', 'Singapore');
        UPDATE lodging SET timezone = 'Asia/Hong_Kong' WHERE timezone IN ('HKT', 'Hong Kong', 'Hongkong');
        UPDATE lodging SET timezone = 'Asia/Shanghai' WHERE timezone IN ('China', 'Beijing', 'Asia/Beijing', 'PRC', 'China Standard');
        UPDATE lodging SET timezone = 'Asia/Taipei' WHERE timezone IN ('Taipei', 'Taiwan', 'ROC');
        UPDATE lodging SET timezone = 'Asia/Tokyo' WHERE timezone IN ('JST', 'Tokyo', 'Japan');
        UPDATE lodging SET timezone = 'Asia/Seoul' WHERE timezone IN ('KST', 'Korea', 'Seoul', 'ROK');
        UPDATE lodging SET timezone = 'Australia/Perth' WHERE timezone IN ('AWST', 'Perth', 'Australia/West');
        UPDATE lodging SET timezone = 'Australia/Brisbane' WHERE timezone IN ('Brisbane', 'Queensland', 'Australia/Queensland');
        UPDATE lodging SET timezone = 'Australia/Sydney' WHERE timezone IN ('AEST', 'AEDT', 'Sydney', 'Australia/NSW');
        UPDATE lodging SET timezone = 'Australia/Melbourne' WHERE timezone IN ('Melbourne', 'Victoria', 'Australia/Victoria');
        UPDATE lodging SET timezone = 'Pacific/Auckland' WHERE timezone IN ('NZST', 'NZDT', 'Auckland', 'New Zealand', 'NZ');
        UPDATE lodging SET timezone = 'Pacific/Fiji' WHERE timezone IN ('FJT', 'Fiji');

        -- =====================================================
        -- Transportation table (start_timezone)
        -- =====================================================
        UPDATE transportation SET start_timezone = 'America/New_York' WHERE start_timezone IN ('Eastern', 'EST', 'EDT', 'Eastern Time', 'US/Eastern', 'ET');
        UPDATE transportation SET start_timezone = 'America/Chicago' WHERE start_timezone IN ('Central', 'CST', 'CDT', 'Central Time', 'US/Central', 'CT');
        UPDATE transportation SET start_timezone = 'America/Denver' WHERE start_timezone IN ('Mountain', 'MST', 'MDT', 'Mountain Time', 'US/Mountain', 'MT');
        UPDATE transportation SET start_timezone = 'America/Los_Angeles' WHERE start_timezone IN ('Pacific', 'PST', 'PDT', 'Pacific Time', 'US/Pacific', 'PT');
        UPDATE transportation SET start_timezone = 'America/Anchorage' WHERE start_timezone IN ('Alaska', 'AKST', 'AKDT', 'US/Alaska', 'AKT');
        UPDATE transportation SET start_timezone = 'Pacific/Honolulu' WHERE start_timezone IN ('Hawaii', 'HST', 'US/Hawaii', 'HT');
        UPDATE transportation SET start_timezone = 'America/Phoenix' WHERE start_timezone IN ('Arizona', 'US/Arizona');
        UPDATE transportation SET start_timezone = 'America/Halifax' WHERE start_timezone IN ('Atlantic', 'AST', 'ADT', 'Atlantic Time', 'Canada/Atlantic');
        UPDATE transportation SET start_timezone = 'America/Sao_Paulo' WHERE start_timezone IN ('BRT', 'BRST', 'Brazil', 'Sao Paulo', 'Brazil/East');
        UPDATE transportation SET start_timezone = 'Europe/London' WHERE start_timezone IN ('GMT', 'BST', 'London', 'GB', 'UK', 'Britain');
        UPDATE transportation SET start_timezone = 'Europe/Lisbon' WHERE start_timezone IN ('WET', 'WEST', 'Lisbon', 'Portugal');
        UPDATE transportation SET start_timezone = 'Europe/Paris' WHERE start_timezone IN ('CET', 'CEST', 'Paris', 'France');
        UPDATE transportation SET start_timezone = 'Europe/Berlin' WHERE start_timezone IN ('Berlin', 'Germany');
        UPDATE transportation SET start_timezone = 'Europe/Rome' WHERE start_timezone IN ('Rome', 'Italy');
        UPDATE transportation SET start_timezone = 'Europe/Amsterdam' WHERE start_timezone IN ('Amsterdam', 'Netherlands');
        UPDATE transportation SET start_timezone = 'Europe/Madrid' WHERE start_timezone IN ('Madrid', 'Spain');
        UPDATE transportation SET start_timezone = 'Europe/Athens' WHERE start_timezone IN ('EET', 'EEST', 'Athens', 'Greece');
        UPDATE transportation SET start_timezone = 'Europe/Helsinki' WHERE start_timezone IN ('Helsinki', 'Finland');
        UPDATE transportation SET start_timezone = 'Europe/Moscow' WHERE start_timezone IN ('MSK', 'Moscow', 'Russia');
        UPDATE transportation SET start_timezone = 'Europe/Istanbul' WHERE start_timezone IN ('TRT', 'Istanbul', 'Turkey');
        UPDATE transportation SET start_timezone = 'Africa/Cairo' WHERE start_timezone IN ('Cairo', 'Egypt');
        UPDATE transportation SET start_timezone = 'Africa/Johannesburg' WHERE start_timezone IN ('SAST', 'Johannesburg', 'South Africa');
        UPDATE transportation SET start_timezone = 'Asia/Riyadh' WHERE start_timezone IN ('Riyadh', 'Saudi Arabia');
        UPDATE transportation SET start_timezone = 'Asia/Dubai' WHERE start_timezone IN ('GST', 'Dubai', 'UAE', 'Gulf');
        UPDATE transportation SET start_timezone = 'Asia/Karachi' WHERE start_timezone IN ('PKT', 'Karachi', 'Pakistan');
        UPDATE transportation SET start_timezone = 'Asia/Kolkata' WHERE start_timezone IN ('IST', 'India', 'Kolkata', 'Mumbai', 'Asia/Calcutta', 'Indian');
        UPDATE transportation SET start_timezone = 'Asia/Dhaka' WHERE start_timezone IN ('Dhaka', 'Bangladesh');
        UPDATE transportation SET start_timezone = 'Asia/Bangkok' WHERE start_timezone IN ('ICT', 'Bangkok', 'Thailand');
        UPDATE transportation SET start_timezone = 'Asia/Jakarta' WHERE start_timezone IN ('WIB', 'Jakarta', 'Indonesia');
        UPDATE transportation SET start_timezone = 'Asia/Ho_Chi_Minh' WHERE start_timezone IN ('Ho Chi Minh', 'Vietnam', 'Saigon', 'Asia/Saigon');
        UPDATE transportation SET start_timezone = 'Asia/Singapore' WHERE start_timezone IN ('SGT', 'Singapore');
        UPDATE transportation SET start_timezone = 'Asia/Hong_Kong' WHERE start_timezone IN ('HKT', 'Hong Kong', 'Hongkong');
        UPDATE transportation SET start_timezone = 'Asia/Shanghai' WHERE start_timezone IN ('China', 'Beijing', 'Asia/Beijing', 'PRC', 'China Standard');
        UPDATE transportation SET start_timezone = 'Asia/Taipei' WHERE start_timezone IN ('Taipei', 'Taiwan', 'ROC');
        UPDATE transportation SET start_timezone = 'Asia/Tokyo' WHERE start_timezone IN ('JST', 'Tokyo', 'Japan');
        UPDATE transportation SET start_timezone = 'Asia/Seoul' WHERE start_timezone IN ('KST', 'Korea', 'Seoul', 'ROK');
        UPDATE transportation SET start_timezone = 'Australia/Perth' WHERE start_timezone IN ('AWST', 'Perth', 'Australia/West');
        UPDATE transportation SET start_timezone = 'Australia/Brisbane' WHERE start_timezone IN ('Brisbane', 'Queensland', 'Australia/Queensland');
        UPDATE transportation SET start_timezone = 'Australia/Sydney' WHERE start_timezone IN ('AEST', 'AEDT', 'Sydney', 'Australia/NSW');
        UPDATE transportation SET start_timezone = 'Australia/Melbourne' WHERE start_timezone IN ('Melbourne', 'Victoria', 'Australia/Victoria');
        UPDATE transportation SET start_timezone = 'Pacific/Auckland' WHERE start_timezone IN ('NZST', 'NZDT', 'Auckland', 'New Zealand', 'NZ');
        UPDATE transportation SET start_timezone = 'Pacific/Fiji' WHERE start_timezone IN ('FJT', 'Fiji');

        -- =====================================================
        -- Transportation table (end_timezone)
        -- =====================================================
        UPDATE transportation SET end_timezone = 'America/New_York' WHERE end_timezone IN ('Eastern', 'EST', 'EDT', 'Eastern Time', 'US/Eastern', 'ET');
        UPDATE transportation SET end_timezone = 'America/Chicago' WHERE end_timezone IN ('Central', 'CST', 'CDT', 'Central Time', 'US/Central', 'CT');
        UPDATE transportation SET end_timezone = 'America/Denver' WHERE end_timezone IN ('Mountain', 'MST', 'MDT', 'Mountain Time', 'US/Mountain', 'MT');
        UPDATE transportation SET end_timezone = 'America/Los_Angeles' WHERE end_timezone IN ('Pacific', 'PST', 'PDT', 'Pacific Time', 'US/Pacific', 'PT');
        UPDATE transportation SET end_timezone = 'America/Anchorage' WHERE end_timezone IN ('Alaska', 'AKST', 'AKDT', 'US/Alaska', 'AKT');
        UPDATE transportation SET end_timezone = 'Pacific/Honolulu' WHERE end_timezone IN ('Hawaii', 'HST', 'US/Hawaii', 'HT');
        UPDATE transportation SET end_timezone = 'America/Phoenix' WHERE end_timezone IN ('Arizona', 'US/Arizona');
        UPDATE transportation SET end_timezone = 'America/Halifax' WHERE end_timezone IN ('Atlantic', 'AST', 'ADT', 'Atlantic Time', 'Canada/Atlantic');
        UPDATE transportation SET end_timezone = 'America/Sao_Paulo' WHERE end_timezone IN ('BRT', 'BRST', 'Brazil', 'Sao Paulo', 'Brazil/East');
        UPDATE transportation SET end_timezone = 'Europe/London' WHERE end_timezone IN ('GMT', 'BST', 'London', 'GB', 'UK', 'Britain');
        UPDATE transportation SET end_timezone = 'Europe/Lisbon' WHERE end_timezone IN ('WET', 'WEST', 'Lisbon', 'Portugal');
        UPDATE transportation SET end_timezone = 'Europe/Paris' WHERE end_timezone IN ('CET', 'CEST', 'Paris', 'France');
        UPDATE transportation SET end_timezone = 'Europe/Berlin' WHERE end_timezone IN ('Berlin', 'Germany');
        UPDATE transportation SET end_timezone = 'Europe/Rome' WHERE end_timezone IN ('Rome', 'Italy');
        UPDATE transportation SET end_timezone = 'Europe/Amsterdam' WHERE end_timezone IN ('Amsterdam', 'Netherlands');
        UPDATE transportation SET end_timezone = 'Europe/Madrid' WHERE end_timezone IN ('Madrid', 'Spain');
        UPDATE transportation SET end_timezone = 'Europe/Athens' WHERE end_timezone IN ('EET', 'EEST', 'Athens', 'Greece');
        UPDATE transportation SET end_timezone = 'Europe/Helsinki' WHERE end_timezone IN ('Helsinki', 'Finland');
        UPDATE transportation SET end_timezone = 'Europe/Moscow' WHERE end_timezone IN ('MSK', 'Moscow', 'Russia');
        UPDATE transportation SET end_timezone = 'Europe/Istanbul' WHERE end_timezone IN ('TRT', 'Istanbul', 'Turkey');
        UPDATE transportation SET end_timezone = 'Africa/Cairo' WHERE end_timezone IN ('Cairo', 'Egypt');
        UPDATE transportation SET end_timezone = 'Africa/Johannesburg' WHERE end_timezone IN ('SAST', 'Johannesburg', 'South Africa');
        UPDATE transportation SET end_timezone = 'Asia/Riyadh' WHERE end_timezone IN ('Riyadh', 'Saudi Arabia');
        UPDATE transportation SET end_timezone = 'Asia/Dubai' WHERE end_timezone IN ('GST', 'Dubai', 'UAE', 'Gulf');
        UPDATE transportation SET end_timezone = 'Asia/Karachi' WHERE end_timezone IN ('PKT', 'Karachi', 'Pakistan');
        UPDATE transportation SET end_timezone = 'Asia/Kolkata' WHERE end_timezone IN ('IST', 'India', 'Kolkata', 'Mumbai', 'Asia/Calcutta', 'Indian');
        UPDATE transportation SET end_timezone = 'Asia/Dhaka' WHERE end_timezone IN ('Dhaka', 'Bangladesh');
        UPDATE transportation SET end_timezone = 'Asia/Bangkok' WHERE end_timezone IN ('ICT', 'Bangkok', 'Thailand');
        UPDATE transportation SET end_timezone = 'Asia/Jakarta' WHERE end_timezone IN ('WIB', 'Jakarta', 'Indonesia');
        UPDATE transportation SET end_timezone = 'Asia/Ho_Chi_Minh' WHERE end_timezone IN ('Ho Chi Minh', 'Vietnam', 'Saigon', 'Asia/Saigon');
        UPDATE transportation SET end_timezone = 'Asia/Singapore' WHERE end_timezone IN ('SGT', 'Singapore');
        UPDATE transportation SET end_timezone = 'Asia/Hong_Kong' WHERE end_timezone IN ('HKT', 'Hong Kong', 'Hongkong');
        UPDATE transportation SET end_timezone = 'Asia/Shanghai' WHERE end_timezone IN ('China', 'Beijing', 'Asia/Beijing', 'PRC', 'China Standard');
        UPDATE transportation SET end_timezone = 'Asia/Taipei' WHERE end_timezone IN ('Taipei', 'Taiwan', 'ROC');
        UPDATE transportation SET end_timezone = 'Asia/Tokyo' WHERE end_timezone IN ('JST', 'Tokyo', 'Japan');
        UPDATE transportation SET end_timezone = 'Asia/Seoul' WHERE end_timezone IN ('KST', 'Korea', 'Seoul', 'ROK');
        UPDATE transportation SET end_timezone = 'Australia/Perth' WHERE end_timezone IN ('AWST', 'Perth', 'Australia/West');
        UPDATE transportation SET end_timezone = 'Australia/Brisbane' WHERE end_timezone IN ('Brisbane', 'Queensland', 'Australia/Queensland');
        UPDATE transportation SET end_timezone = 'Australia/Sydney' WHERE end_timezone IN ('AEST', 'AEDT', 'Sydney', 'Australia/NSW');
        UPDATE transportation SET end_timezone = 'Australia/Melbourne' WHERE end_timezone IN ('Melbourne', 'Victoria', 'Australia/Victoria');
        UPDATE transportation SET end_timezone = 'Pacific/Auckland' WHERE end_timezone IN ('NZST', 'NZDT', 'Auckland', 'New Zealand', 'NZ');
        UPDATE transportation SET end_timezone = 'Pacific/Fiji' WHERE end_timezone IN ('FJT', 'Fiji');

        -- Record that this migration has been applied
        INSERT INTO _manual_migrations (name) VALUES ('001_standardize_timezones');

        RAISE NOTICE 'Migration 001_standardize_timezones completed successfully.';
    END IF;
END $$;
