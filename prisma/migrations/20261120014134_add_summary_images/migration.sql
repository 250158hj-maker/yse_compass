-- CreateTable
CREATE TABLE "summary_images" (
    "id" SERIAL NOT NULL,
    "summary_id" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,
    "image_data" BYTEA NOT NULL,

    CONSTRAINT "summary_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "summary_images_summary_id_display_order_key" ON "summary_images"("summary_id", "display_order");

-- AddForeignKey
ALTER TABLE "summary_images" ADD CONSTRAINT "summary_images_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "summaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
