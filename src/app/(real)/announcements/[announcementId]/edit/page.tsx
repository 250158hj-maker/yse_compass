import { notFound } from "next/navigation";
import { PhaseBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireSessionUser } from "@/lib/auth/session";
import { getOccasion } from "@/lib/data/occasions";
import { SlotError, listMaterialSlots } from "@/lib/data/slots";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import type { AnnouncementPhase } from "@/lib/types";
import { OccasionDateForm } from "./OccasionDateForm";
import { SlotList } from "./SlotList";

// 対応: docs/design/04-screen.md SC-05（発表会編集・T のみ）／docs/requirements.md §3-1。Issue #184（モックの画面を本番仕様にする）。
// データは data 層（getOccasion・listMaterialSlots と、日程・資料枠の Action）、ユーザーは requireSessionUser から読む。画面で権限や値の規則を判定しない。
// 出すもの: 開催日の編集、資料枠（種類・必須／任意・締切・テンプレートのリンク）の追加・編集・削除。保存は、日程と資料枠ごと。
// 先生以外は、関数が forbidden で拒む。拒否されたときは、案内だけを出す。
// 含めない:
//   - 発表会名の編集：event_occasions に名称の列が無い（H-63 の決着まで。禁則 1）。発表会の名前は、種別から作る表示（SC-04 と同じ）。
//   - 発表会に 1 つの「提出締切」：締切は資料枠ごと（H-61 の決着）。モックにあった発表会の締切欄は置かない。
//   - テンプレートを一覧から選ぶ形：関数は https のリンクを受ける（モックの一覧は仮データ）。リンクを入力する。
// 概要の枠の種類の変更・削除、提出のある枠の削除は、関数が拒む。拒否の文言は lib/slot-messages.ts。

export default async function OccasionEditPage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const user = await requireSessionUser(`/announcements/${announcementId}/edit`);
  // URL の ID は、形と integer の範囲を確かめてから DB に渡す（範囲外を渡すと Prisma が例外を投げ、500 になる）。
  const id = parseId(announcementId);
  const actor = { userId: user.id, role: user.role };
  const occasion = id !== null ? await getOccasion(prisma, actor, id) : null;
  if (!occasion) notFound();
  const title = `${occasion.kind}発表会`;

  let slots;
  try {
    slots = await listMaterialSlots(prisma, actor, occasion.id);
  } catch (e) {
    if (e instanceof SlotError && e.code === "forbidden") {
      return (
        <div className="mx-auto max-w-2xl">
          <InlineNotice tone="info">この操作は先生のみ行えます。</InlineNotice>
        </div>
      );
    }
    if (e instanceof SlotError && e.code === "occasion_not_found") notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "発表会一覧", href: "/announcements" },
          { label: title, href: `/announcements/${occasion.id}` },
          { label: "編集" },
        ]}
      />
      <PageHeader eyebrow="発表会編集" title={title} meta={<PhaseBadge phase={occasion.kind as AnnouncementPhase} />} />

      <div className="mt-6 flex flex-col gap-8">
        <section>
          <OccasionDateForm occasionId={occasion.id} initial={occasion.eventDate ? occasion.eventDate.toISOString().slice(0, 10) : ""} />
        </section>
        <section>
          <SectionHeading>資料枠</SectionHeading>
          <SlotList
            occasionId={occasion.id}
            slots={slots.map((s) => ({
              id: s.id,
              slotType: s.slotType,
              isRequired: s.isRequired,
              deadlineIso: s.deadline ? s.deadline.toISOString() : null,
              templateUrl: s.templateUrl,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
