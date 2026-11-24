import type { PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { renderSummaryBooklet, type BookletTeam } from "@/lib/pdf/summary-booklet";
import type { Actor } from "@/lib/data/years";
import { toExtraSections } from "@/lib/data/summaries";

// 対応: docs/requirements.md §3-3（概要集の生成）・design/04-screen.md SC-11（概要集生成。先生だけ）・decisions.md 2026-10-22（H-7・H-8）・2026-10-26（H-51 (a)）。
// 入れるチーム・スキップするチームは、発表会の発表（presentations）に載るチームを、概要の提出の有無で分ける。提出済みかどうかは、概要の行の有無で見る（summaries.ts と同じ）。
// 並びは発表順（presentations.display_order）の昇順。発表順が未設定のチームは、末尾にチーム名順で並べる（04 SC-11・H-51 (a) の行）。
// 生成のたびに、その時点の概要と発表順から作って返す。生成した PDF の保存も、生成日時の記録もしない（decisions.md 2026-10-22）。
// スキップするチームがあるときは、先生の了承（skipConfirmed）が要る（requirements.md §3-3）。全チームが未提出のときは、束ねるものが無いので生成しない。
// 目次とページ番号は、形は decisions.md 2026-11-24 で決まったが、まだ入れていない（pdf/summary-booklet.tsx の冒頭）。
// 認可の一次防衛線はここに置く（先生だけ）。

type Db = Pick<PrismaClient, "eventOccasion" | "presentation">;

export type BookletErrorCode = "forbidden" | "invalid_input" | "occasion_not_found" | "nothing_to_bundle" | "skip_not_confirmed";

export class BookletError extends Error {
  constructor(readonly code: BookletErrorCode) {
    super(code);
    this.name = "BookletError";
  }
}

// 一覧の 1 行（04 SC-11：番号／チーム名／作品名）。displayOrder が null のチームは、発表順が未設定。
export type BookletPlanItem = { teamId: number; teamName: string; workTitle: string | null; displayOrder: number | null };

export type BookletPlan = { included: BookletPlanItem[]; skipped: BookletPlanItem[] };

type Loaded = { plan: BookletPlan; teams: Map<number, BookletTeam>; fileName: string };

function compareTeamName(a: string, b: string) {
  return a.localeCompare(b, "ja");
}

// 発表順の昇順。未設定は末尾に、チーム名順。
function byBookletOrder(a: BookletPlanItem, b: BookletPlanItem) {
  if (a.displayOrder !== null && b.displayOrder !== null) return a.displayOrder - b.displayOrder;
  if (a.displayOrder !== null) return -1;
  if (b.displayOrder !== null) return 1;
  return compareTeamName(a.teamName, b.teamName);
}

async function load(db: Db, actor: Actor, occasionId: number): Promise<Loaded> {
  if (actor.role !== "teacher") throw new BookletError("forbidden");
  if (!isId(occasionId)) throw new BookletError("invalid_input");
  const occasion = await db.eventOccasion.findUnique({ where: { id: occasionId }, select: { kind: true, fiscalYear: { select: { year: true } } } });
  if (!occasion) throw new BookletError("occasion_not_found");

  const rows = await db.presentation.findMany({
    where: { eventOccasionId: occasionId },
    select: {
      displayOrder: true,
      team: {
        select: {
          id: true,
          name: true,
          class: { select: { name: true } },
          work: { select: { title: true } },
          // 登録の順（team_members.id の順。H-69 ②(a)）。表示名は、結びついた利用者がいればそのフルネーム、いなければメンバー行の名前（06 6-6）。
          members: { orderBy: { id: "asc" }, select: { name: true, user: { select: { name: true } } } },
          summaries: {
            where: { eventOccasionId: occasionId },
            select: {
              introduction: true,
              workOverview: true,
              techStack: true,
              closing: true,
              extraSections: true,
              images: { orderBy: { displayOrder: "asc" }, select: { imageData: true } },
            },
          },
        },
      },
    },
  });

  const included: BookletPlanItem[] = [];
  const skipped: BookletPlanItem[] = [];
  const teams = new Map<number, BookletTeam>();
  for (const { displayOrder, team } of rows) {
    const item: BookletPlanItem = { teamId: team.id, teamName: team.name, workTitle: team.work?.title ?? null, displayOrder };
    const summary = team.summaries[0];
    if (!summary) {
      skipped.push(item);
      continue;
    }
    included.push(item);
    teams.set(team.id, {
      className: team.class.name,
      teamName: team.name,
      memberNames: team.members.map((m) => m.user?.name ?? m.name),
      workTitle: item.workTitle,
      introduction: summary.introduction,
      workOverview: summary.workOverview,
      techStack: summary.techStack,
      closing: summary.closing,
      extraSections: toExtraSections(summary.extraSections),
      images: summary.images.map((image) => image.imageData),
    });
  }
  // 名前は H-50 の先行方針（<年度>_<発表会名>_概要集.pdf・生成の日時を入れない）。発表会名は、本実装の画面と同じく種別から作る（名称の列は無い：H-63）。
  const fileName = `${occasion.fiscalYear.year}_${occasion.kind}発表会_概要集.pdf`;
  return { plan: { included: included.toSorted(byBookletOrder), skipped: skipped.toSorted(byBookletOrder) }, teams, fileName };
}

// 生成の前の「この順で束ねます」の一覧（入るチーム・スキップするチーム）。
export async function getSummaryBookletPlan(db: Db, actor: Actor, occasionId: number): Promise<BookletPlan> {
  return (await load(db, actor, occasionId)).plan;
}

export type SummaryBooklet = BookletPlan & { pdf: Buffer; pageCount: number; fileName: string };

// 結果の欄（ファイル名・ページ数・入ったチーム・スキップしたチーム）と PDF は、同じ 1 回の読み込みから作る（04 SC-11）。ファイル名は H-50 の先行方針で仮置き。
export async function generateSummaryBooklet(db: Db, actor: Actor, occasionId: number, options: { skipConfirmed: boolean }): Promise<SummaryBooklet> {
  const { plan, teams, fileName } = await load(db, actor, occasionId);
  if (plan.included.length === 0) throw new BookletError("nothing_to_bundle");
  if (plan.skipped.length > 0 && !options.skipConfirmed) throw new BookletError("skip_not_confirmed");
  const ordered = plan.included.map((item) => teams.get(item.teamId)!);
  return { ...plan, ...(await renderSummaryBooklet(ordered)), fileName };
}
