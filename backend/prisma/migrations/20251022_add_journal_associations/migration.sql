-- CreateTable
CREATE TABLE "journal_activities" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lodgings" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "lodging_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_lodgings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_transportations" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "transportation_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_transportations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_activities_journal_id_activity_id_key" ON "journal_activities"("journal_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_lodgings_journal_id_lodging_id_key" ON "journal_lodgings"("journal_id", "lodging_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_transportations_journal_id_transportation_id_key" ON "journal_transportations"("journal_id", "transportation_id");

-- AddForeignKey
ALTER TABLE "journal_activities" ADD CONSTRAINT "journal_activities_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_activities" ADD CONSTRAINT "journal_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lodgings" ADD CONSTRAINT "journal_lodgings_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lodgings" ADD CONSTRAINT "journal_lodgings_lodging_id_fkey" FOREIGN KEY ("lodging_id") REFERENCES "lodging"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_transportations" ADD CONSTRAINT "journal_transportations_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_transportations" ADD CONSTRAINT "journal_transportations_transportation_id_fkey" FOREIGN KEY ("transportation_id") REFERENCES "transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
