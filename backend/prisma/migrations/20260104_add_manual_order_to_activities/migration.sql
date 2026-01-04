-- AlterTable
ALTER TABLE "activities" ADD COLUMN "manual_order" INTEGER;

-- CreateIndex
CREATE INDEX "activities_trip_id_manual_order_idx" ON "activities"("trip_id", "manual_order");
