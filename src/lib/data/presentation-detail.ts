import type { PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import { isMemberOf, isReplacedAfterDeadline, SubmissionError } from "@/lib/data/submissions";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-5（発表資料閲覧）・design/04-screen.md SC-12（チーム × 発表会）。
// 公開前の発表会の資料（概要を含む）は、先生と自チームの生徒にだけ返し、聴く生徒には返さない（decisions.md 2026-10-20 の H-45 の行の①）。
// 公開か否かは event_occasions.is_published で判定する（列は足さない）。聴く生徒に返さないときは forbidden（正典に返し方の定めは無い）。
// 概要の本文は 06 でまだ列が無い（H-37）ので、いまある使用技術と日時だけを返す。作品の説明は出さない（H-49 の先行方針）。
// エラーは submissions.ts の SubmissionError を使う（この層で出すのは forbidden・invalid_input・occasion_not_found）。

type Db = Pick<PrismaClient, "eventOccasion" | "team" | "teamMember" | "summary" | "submission">;

// SC-12: そのチームの、ある発表会の発表詳細。資料のリンクは、提出済みのものだけを返す（概要の行は出さない）。
export async function getPresentationDetail(db: Db, actor: Actor, teamId: number, occasionId: number) {
  if (actor.role !== "teacher" && actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(teamId) || !isId(occasionId)) throw new SubmissionError("invalid_input");

  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, class: { select: { fiscalYearId: true } }, work: { select: { title: true } }, members: { orderBy: { id: "asc" }, select: { name: true } } },
  });
  const occasion = await db.eventOccasion.findUnique({ where: { id: occasionId }, select: { fiscalYearId: true, isPublished: true } });
  // 発表会やチームが無い、または年度が違う組み合わせは、無いのと同じ結果にする。
  if (!team || !occasion || occasion.fiscalYearId !== team.class.fiscalYearId) throw new SubmissionError("occasion_not_found");
  if (!occasion.isPublished && actor.role === "student" && !(await isMemberOf(db, actor, teamId))) throw new SubmissionError("forbidden");

  const submissions = await db.submission.findMany({
    where: { teamId, materialSlot: { eventOccasionId: occasionId, NOT: { slotType: SUMMARY_SLOT_TYPE } } },
    orderBy: { materialSlotId: "asc" },
    select: { url: true, firstSubmittedAt: true, lastSubmittedAt: true, materialSlot: { select: { id: true, slotType: true, deadline: true } } },
  });
  const summary = await db.summary.findUnique({
    where: { teamId_eventOccasionId: { teamId, eventOccasionId: occasionId } },
    select: { techStack: true, firstSubmittedAt: true, lastSubmittedAt: true },
  });

  return {
    team: { id: team.id, name: team.name },
    workTitle: team.work?.title ?? null,
    members: team.members.map((m) => m.name),
    links: submissions.map((x) => ({
      slotId: x.materialSlot.id,
      slotType: x.materialSlot.slotType,
      url: x.url,
      firstSubmittedAt: x.firstSubmittedAt,
      // 締切後に差し替えがあったときだけ最終更新日時を添える（§3-5）。
      lastUpdatedAt: isReplacedAfterDeadline(x.firstSubmittedAt, x.lastSubmittedAt, x.materialSlot.deadline) ? x.lastSubmittedAt : null,
    })),
    summary,
  };
}
