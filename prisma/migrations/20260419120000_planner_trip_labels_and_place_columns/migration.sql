-- Planner fields: keep idempotent so DBs that partially drifted from older migrations still match schema.prisma.
-- Trip.plannerDayLabels was missing from earlier migrations; PATCH /api/trips/[id] with plannerDayLabels fails without this column.

ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "plannerDay" INTEGER;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "plannerOrder" INTEGER;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "timeSlot" TEXT;

ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "plannerDayLabels" JSONB;
