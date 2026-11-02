import type { PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { SubmissionError } from "@/lib/data/submissions";
import { byDisplayOrder } from "@/lib/data/timetable";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-5・design/04-screen.md SC-04（公開済みなら発表（チーム）一覧 → 発表詳細へ。非公開のあいだ、生徒には「公開後に閲覧できます」の案内）。Issue #184 の鈴木さんの依頼（合意した形）。
// 先生には公開前も一覧を返す（SC-12 の T は公開前も見られる）。生徒には、公開済みなら一覧、非公開のあいだは not_published を返し、一覧（チーム名・作品名）は返さない。自チームの生徒も同じ。
// 一覧を出すか案内に切り替えるかの判定はここが持つ。画面は is_published やロールを見ない（#184 の方針）。
// 生徒はアーカイブ済みの年度の発表会を読めない（H-60 の先行方針と同じ線引き。getOccasion・getTimetable と同じ）。外れた行は「無い」と同じ occasion_not_found にする。
// 並びは getTimetable と同じ（発表順の昇順。未設定は最後。同じなら発表の id 順）。エラーは SubmissionError を使う（forbidden・invalid_input・occasion_not_found）。

type Db = Pick<PrismaClient, "eventOccasion" | "presentation">;

export type PresentationListItem = { teamId: number; teamName: string; workTitle: string | null };

export type PresentationList = { kind: "list"; presentations: PresentationListItem[] } | { kind: "not_published" };

export async function listOccasionPresentations(db: Db, actor: Actor, occasionId: number): Promise<PresentationList> {
  if (actor.role !== "teacher" && actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(occasionId)) throw new SubmissionError("invalid_input");
  const occasion = await db.eventOccasion.findFirst({
    where: { id: occasionId, ...(actor.role === "teacher" ? {} : { fiscalYear: { isArchived: false } }) },
    select: { isPublished: true },
  });
  if (!occasion) throw new SubmissionError("occasion_not_found");
  // 自チームの生徒にも、公開前は一覧を出さない。04 SC-04 の共通の欄（生徒は S1・S2 とも一覧を見る。非公開のあいだは「公開後に閲覧できます」の案内）に合わせた。
  // §4-4 の SC-04 の行は、公開前に一覧へ行けないのを「チームを持たない生徒」と書いていて、読みがずれる（H-33。決着したら変わるのはこの行）。
  if (actor.role === "student" && !occasion.isPublished) return { kind: "not_published" };

  const rows = await db.presentation.findMany({
    where: { eventOccasionId: occasionId },
    select: { id: true, teamId: true, displayOrder: true, team: { select: { name: true, work: { select: { title: true } } } } },
  });
  return {
    kind: "list",
    presentations: rows.toSorted(byDisplayOrder).map((p) => ({ teamId: p.teamId, teamName: p.team.name, workTitle: p.team.work?.title ?? null })),
  };
}
