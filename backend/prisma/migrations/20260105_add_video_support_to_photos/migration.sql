-- AlterTable
ALTER TABLE "photos" ADD COLUMN "media_type" VARCHAR(20) NOT NULL DEFAULT 'photo';
ALTER TABLE "photos" ADD COLUMN "duration" INTEGER;
