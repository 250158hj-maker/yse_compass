-- AlterTable
ALTER TABLE "summaries" ADD COLUMN     "closing" TEXT,
ADD COLUMN     "extra_sections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "introduction" TEXT,
ADD COLUMN     "work_overview" TEXT;
