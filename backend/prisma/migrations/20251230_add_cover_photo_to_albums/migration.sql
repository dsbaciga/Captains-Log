-- Add cover_photo_id column to photo_albums table
ALTER TABLE "photo_albums" ADD COLUMN "cover_photo_id" INTEGER;

-- Add foreign key constraint
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_cover_photo_id_fkey" 
    FOREIGN KEY ("cover_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

