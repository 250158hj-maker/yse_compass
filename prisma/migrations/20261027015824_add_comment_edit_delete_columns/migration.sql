-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "edited_at" TIMESTAMPTZ(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;
