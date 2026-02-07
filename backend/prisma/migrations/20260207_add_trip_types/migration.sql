-- AlterTable: Add tripTypes JSON field to users table
ALTER TABLE "users" ADD COLUMN "trip_types" JSONB NOT NULL DEFAULT '[{"name":"Leisure","emoji":"🏖️"},{"name":"Business","emoji":"💼"},{"name":"Road Trip","emoji":"🚗"},{"name":"Backpacking","emoji":"🎒"},{"name":"Cruise","emoji":"🚢"},{"name":"Study Abroad","emoji":"📚"},{"name":"Volunteer","emoji":"🤝"},{"name":"Pilgrimage","emoji":"🕊️"},{"name":"Adventure","emoji":"🧗"},{"name":"Family","emoji":"👨‍👩‍👧‍👦"},{"name":"Honeymoon","emoji":"💕"},{"name":"Other","emoji":"📌"}]';

-- AlterTable: Add tripType and tripTypeEmoji fields to trips table
ALTER TABLE "trips" ADD COLUMN "trip_type" VARCHAR(100);
ALTER TABLE "trips" ADD COLUMN "trip_type_emoji" VARCHAR(10);
