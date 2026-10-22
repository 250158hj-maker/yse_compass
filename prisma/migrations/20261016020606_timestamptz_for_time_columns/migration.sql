-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "material_slots" ALTER COLUMN "deadline" SET DATA TYPE TIMESTAMPTZ(3) USING "deadline" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "submissions" ALTER COLUMN "first_submitted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "first_submitted_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_submitted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_submitted_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "summaries" ALTER COLUMN "first_submitted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "first_submitted_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_submitted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_submitted_at" AT TIME ZONE 'UTC';
