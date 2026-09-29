-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "fiscal_year_id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "leader_member_id" INTEGER,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "works" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "title" VARCHAR,
    "publication_consent" VARCHAR NOT NULL DEFAULT 'unset',
    "consent_set_by" INTEGER,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "role" VARCHAR NOT NULL DEFAULT 'student',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_occasions" (
    "id" SERIAL NOT NULL,
    "fiscal_year_id" INTEGER NOT NULL,
    "kind" VARCHAR NOT NULL,
    "event_date" DATE,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "current_presentation_id" INTEGER,

    CONSTRAINT "event_occasions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_slots" (
    "id" SERIAL NOT NULL,
    "event_occasion_id" INTEGER NOT NULL,
    "slot_type" VARCHAR NOT NULL,
    "deadline" TIMESTAMP(3),
    "is_required" BOOLEAN NOT NULL,
    "template_url" TEXT,

    CONSTRAINT "material_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "material_slot_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "first_submitted_at" TIMESTAMP(3) NOT NULL,
    "last_submitted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "event_occasion_id" INTEGER NOT NULL,
    "tech_stack" TEXT,
    "first_submitted_at" TIMESTAMP(3) NOT NULL,
    "last_submitted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentations" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "event_occasion_id" INTEGER NOT NULL,
    "display_order" INTEGER,

    CONSTRAINT "presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "presentation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "parent_comment_id" INTEGER,
    "label" VARCHAR,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_likes" (
    "id" SERIAL NOT NULL,
    "presentation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "presentation_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_year_key" ON "fiscal_years"("year");

-- CreateIndex
CREATE UNIQUE INDEX "classes_fiscal_year_id_name_key" ON "classes"("fiscal_year_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_class_id_name_key" ON "teams"("class_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_leader_member_id_id_key" ON "teams"("leader_member_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_user_id_key" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_id_team_id_key" ON "team_members"("id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "works_team_id_key" ON "works"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "event_occasions_current_presentation_id_id_key" ON "event_occasions"("current_presentation_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_team_id_material_slot_id_key" ON "submissions"("team_id", "material_slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "summaries_team_id_event_occasion_id_key" ON "summaries"("team_id", "event_occasion_id");

-- CreateIndex
CREATE UNIQUE INDEX "presentations_id_event_occasion_id_key" ON "presentations"("id", "event_occasion_id");

-- CreateIndex
CREATE UNIQUE INDEX "presentations_team_id_event_occasion_id_key" ON "presentations"("team_id", "event_occasion_id");

-- CreateIndex
CREATE UNIQUE INDEX "presentation_likes_presentation_id_user_id_key" ON "presentation_likes"("presentation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_comment_id_user_id_key" ON "comment_likes"("comment_id", "user_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_member_id_id_fkey" FOREIGN KEY ("leader_member_id", "id") REFERENCES "team_members"("id", "team_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_consent_set_by_fkey" FOREIGN KEY ("consent_set_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_occasions" ADD CONSTRAINT "event_occasions_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_occasions" ADD CONSTRAINT "event_occasions_current_presentation_id_id_fkey" FOREIGN KEY ("current_presentation_id", "id") REFERENCES "presentations"("id", "event_occasion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_slots" ADD CONSTRAINT "material_slots_event_occasion_id_fkey" FOREIGN KEY ("event_occasion_id") REFERENCES "event_occasions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_material_slot_id_fkey" FOREIGN KEY ("material_slot_id") REFERENCES "material_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_event_occasion_id_fkey" FOREIGN KEY ("event_occasion_id") REFERENCES "event_occasions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_event_occasion_id_fkey" FOREIGN KEY ("event_occasion_id") REFERENCES "event_occasions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_presentation_id_fkey" FOREIGN KEY ("presentation_id") REFERENCES "presentations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_likes" ADD CONSTRAINT "presentation_likes_presentation_id_fkey" FOREIGN KEY ("presentation_id") REFERENCES "presentations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_likes" ADD CONSTRAINT "presentation_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 以下、docs/design/06-data.md 6-7 が挙げる「Prisma の DSL で宣言できない項目」を手書きで追加する。
-- `prisma migrate dev` を再実行すると、この部分が失われる可能性がある（6-7 の注記）。

-- DEFERRABLE INITIALLY DEFERRED（6-7：1件）
-- 発表順の並び替え（`hearing.md` §7-1「ほぼ毎回」）で、1トランザクション内の一括更新が
-- 一時的な重複を経由できるようにする（`decisions.md` 2026-09-21）。
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_event_occasion_id_display_order_key"
    UNIQUE ("event_occasion_id", "display_order") DEFERRABLE INITIALLY DEFERRED;

-- CHECK制約（6-7：5件）。役割が閉じた集合の列に、仕様上の値を固定する。
-- クラス・資料枠種類はCHECKを張らない（06-data.md 6-4 の決定）ため、ここには含まない。
ALTER TABLE "users" ADD CONSTRAINT "users_role_check"
    CHECK ("role" IN ('teacher', 'student'));

ALTER TABLE "event_occasions" ADD CONSTRAINT "event_occasions_kind_check"
    CHECK ("kind" IN ('企画', '設計', '試作', '最終'));

ALTER TABLE "comments" ADD CONSTRAINT "comments_label_check"
    CHECK ("label" IN ('感想', '批評', 'その他'));

ALTER TABLE "works" ADD CONSTRAINT "works_publication_consent_check"
    CHECK ("publication_consent" IN ('unset', 'approved', 'rejected'));

-- 「未設定なのに設定者がいる」「許可／拒否なのに設定者が不明」という
-- 整合しない組み合わせを構造で塞ぐ（decisions.md 2026-09-11・H-22）。
ALTER TABLE "works" ADD CONSTRAINT "works_consent_set_by_consistency_check"
    CHECK (("publication_consent" = 'unset') = ("consent_set_by" IS NULL));

-- 部分インデックス（6-7：2件）
-- 概要枠（slot_type='概要'）は発表会に1件ずつ存在する。`summaries` は material_slot_id を
-- 持たないため、この一意性で event_occasion_id から一意に引けることを保証する（06-data.md 6-3）。
CREATE UNIQUE INDEX "material_slots_summary_slot_unique"
    ON "material_slots" ("event_occasion_id") WHERE "slot_type" = '概要';

-- アーカイブ検索は公開許可済み（'approved'）の作品のみを対象とする（06-data.md 6-5）。
CREATE INDEX "works_approved_partial_idx"
    ON "works" ("id") WHERE "publication_consent" = 'approved';

