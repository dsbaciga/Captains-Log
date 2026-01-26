-- AddColumn
ALTER TABLE "flight_tracking" ADD COLUMN IF NOT EXISTS "departure_delay" INTEGER;

-- AddColumn
ALTER TABLE "flight_tracking" ADD COLUMN IF NOT EXISTS "arrival_delay" INTEGER;

-- AddColumn
ALTER TABLE "flight_tracking" ADD COLUMN IF NOT EXISTS "scheduled_departure" TIMESTAMP(3);

-- AddColumn
ALTER TABLE "flight_tracking" ADD COLUMN IF NOT EXISTS "actual_departure" TIMESTAMP(3);

-- AddColumn
ALTER TABLE "flight_tracking" ADD COLUMN IF NOT EXISTS "scheduled_arrival" TIMESTAMP(3);

-- AddColumn
ALTER TABLE "flight_tracking" ADD COLUMN IF NOT EXISTS "actual_arrival" TIMESTAMP(3);
