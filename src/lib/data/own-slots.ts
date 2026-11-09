import type { PrismaClient } from "@/generated/prisma/client";
import { isId } from "@/lib/ids";
import { SUMMARY_SLOT_TYPE } from "@/lib/data/slots";
import { isLate, isMemberOf, isReplacedAfterDeadline, SubmissionError } from "@/lib/data/submissions";
import type { Actor } from "@/lib/data/years";

// 対応: docs/design/04-screen.md SC-02（ホームの「自チームの資料枠」）・Issue #184（鈴木さんの依頼 2026-11-06。蒲山の提案 2026-11-06）。
// 自チームの、ある発表会の資料枠を、**概要を含めて**返す。listTeamSubmissions は SC-09 のために概要を除くので広げず、別の関数にした。
// 画面で判定しない（#184 の方針）ので、提出済みか・遅延・必須の未提出・「いま提出すると遅延になる」を、枠ごとの印で返す（SC-06 の getSubmissionMatrix と同じ考え方）。
// 概要は、提出（submissions）ではなく概要（summaries）の行の有無で見る（getSubmissionMatrix・提出状況サマリと同じ）。
// 遅延は初回提出日時で見る（decisions.md 2026-09-29・H-6）。締切が未設定の枠は、遅延の対象外（H-27 の先行方針）。
// 自チームの生徒だけに返す（先生は forbidden。先生には自チームが無い）。他チームの生徒には、発表会やチームの有無も漏らさない（先に自チームか否かを確かめる）。
// 年度のアーカイブ済みかどうかでは塞がない（listTeamSubmissions と同じ）。**H-60 の ② の側に仮置き**：自チームの生徒には、アーカイブ済みの年度でも返す。
// getOccasion・getPresentationDetail は先行方針 ① で、アーカイブ済みの年度を生徒に返さない（外れた行は「無い」と同じ）ので、同じ画面の流れでは、画面が getOccasion で先に止める。
// H-60 が ① に決まったら、ここでも塞ぐ（直すのはこの関数で、画面ではない）。返すのは自チームの枠の締切と提出の日時だけで、decisions.md 2026-11-02 の ⑥ には当たらない。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。

type Db = Pick<PrismaClient, "team" | "teamMember" | "eventOccasion" | "materialSlot" | "summary">;

export type OwnSlot = {
  slotId: number;
  slotType: string;
  // 概要の枠か（提出ではなく概要の行で見る枠。画面は、提出フォームではなく概要入力へ向ける）。
  isSummary: boolean;
  isRequired: boolean;
  deadline: Date | null;
  templateUrl: string | null;
  submitted: boolean;
  // 必須の枠で、かつ未提出。画面が submitted と isRequired を突き合わせずに、そのまま強調に使う。
  isRequiredMissing: boolean;
  // 提出済みで、初回提出日時が締切を過ぎている。
  isLate: boolean;
  // 未提出で、締切を過ぎている（いま提出すると遅延になる。SC-09 の警告と同じ）。
  warnLate: boolean;
  firstSubmittedAt: Date | null;
  lastSubmittedAt: Date | null;
  // 締切後に差し替えがあった（最終更新日時を添える。requirements.md §3-5）。
  showLastUpdated: boolean;
};

export async function listOwnSlots(db: Db, actor: Actor, teamId: number, occasionId: number, now: Date = new Date()): Promise<OwnSlot[]> {
  if (actor.role !== "student") throw new SubmissionError("forbidden");
  if (!isId(teamId) || !isId(occasionId)) throw new SubmissionError("invalid_input");
  if (!(await isMemberOf(db, actor, teamId))) throw new SubmissionError("forbidden");

  const team = await db.team.findUnique({ where: { id: teamId }, select: { class: { select: { fiscalYearId: true } } } });
  const occasion = await db.eventOccasion.findUnique({ where: { id: occasionId }, select: { fiscalYearId: true } });
  // 発表会やチームが無い、または年度が違う組み合わせは、無いのと同じ結果にする。
  if (!team || !occasion || occasion.fiscalYearId !== team.class.fiscalYearId) throw new SubmissionError("occasion_not_found");

  const slots = await db.materialSlot.findMany({
    where: { eventOccasionId: occasionId },
    // 定番の並び（概要→プレゼン資料）を保つため id の昇順。
    orderBy: { id: "asc" },
    select: {
      id: true,
      slotType: true,
      isRequired: true,
      deadline: true,
      templateUrl: true,
      submissions: { where: { teamId }, select: { firstSubmittedAt: true, lastSubmittedAt: true } },
    },
  });
  const summary = await db.summary.findUnique({
    where: { teamId_eventOccasionId: { teamId, eventOccasionId: occasionId } },
    select: { firstSubmittedAt: true, lastSubmittedAt: true },
  });

  return slots.map((slot) => {
    const isSummary = slot.slotType === SUMMARY_SLOT_TYPE;
    const found = isSummary ? summary : slot.submissions[0];
    const base = { slotId: slot.id, slotType: slot.slotType, isSummary, isRequired: slot.isRequired, deadline: slot.deadline, templateUrl: slot.templateUrl };
    if (!found) {
      return {
        ...base,
        submitted: false,
        isRequiredMissing: slot.isRequired,
        isLate: false,
        warnLate: slot.deadline !== null && now.getTime() > slot.deadline.getTime(),
        firstSubmittedAt: null,
        lastSubmittedAt: null,
        showLastUpdated: false,
      };
    }
    return {
      ...base,
      submitted: true,
      isRequiredMissing: false,
      isLate: isLate(found.firstSubmittedAt, slot.deadline),
      warnLate: false,
      firstSubmittedAt: found.firstSubmittedAt,
      lastSubmittedAt: found.lastSubmittedAt,
      showLastUpdated: isReplacedAfterDeadline(found.firstSubmittedAt, found.lastSubmittedAt, slot.deadline),
    };
  });
}
