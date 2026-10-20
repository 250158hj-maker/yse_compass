import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { UserRole } from "@/lib/auth/callbacks";

// 対応: docs/requirements.md §3-8（チーム・メンバー管理）。チーム作成・メンバー割り当ての操作主体は先生（decisions.md 2026-09-04・#6）。
// 先行方針で組んでいる（06 の列は現行のまま。決着したら変わる箇所は、各項の先行方針に書かれた範囲）:
//   H-40 名簿は 1 人ずつ入力・リーダーは作成後の指定も可（NULL 可）／H-41 メンバーの削除と移動は作らない（追加は許す）／
//   H-43 作品名は先生のみ／H-46 選べるクラスは既存のクラスに限り、クラスの作成はここに持たせない／
//   H-54 「当年度」は未アーカイブの年度のうち year が最大のもの／H-55 編集は年度の状態で塞がない（作成だけ未アーカイブの年度に限る）／
//   H-56 同姓同名を禁じず、長さの上限を置かない（リーダーは氏名でなくメンバー行で指す）。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。読み取りも同じ（decisions.md 2026-09-06・H-16）。
//   読み取りの先行方針（H-45・Stage 1・安全側）: 先生は全年度、生徒は未アーカイブの年度だけ読める。決着したら変わるのは readableBy だけ。

// $transaction があるのは素の PrismaClient のとき。トランザクションの中（テスト、呼び出し側のまとまり）では無い。
type Db = Pick<PrismaClient, "team" | "teamMember" | "schoolClass" | "fiscalYear"> & Partial<Pick<PrismaClient, "$transaction">>;

// userId は生徒の文脈判定（自チームか・リーダーか）に使う（decisions.md 2026-09-26）。型は H-30 の決着に合わせて変えやすいよう別名にする。
export type ActorUserId = string;
export type Actor = { userId: ActorUserId; role: UserRole };

export type TeamErrorCode =
  | "forbidden"
  | "invalid_input"
  | "class_not_found"
  | "year_archived"
  | "team_not_found"
  | "member_not_found"
  | "duplicate_team_name"
  | "leader_not_in_team";

export class TeamError extends Error {
  constructor(readonly code: TeamErrorCode) {
    super(code);
    this.name = "TeamError";
  }
}

function assertTeacher(actor: Actor) {
  if (actor.role !== "teacher") throw new TeamError("forbidden");
}

// 読んでよい行の条件。サインイン済み（actor がある）なら当年度は全員が読める（requirements.md §4-4・SC-13/14）。
// 見えない行は「無い」と同じ結果にする（存在の有無を漏らさない）。
function readableBy(actor: Actor): Prisma.TeamWhereInput {
  return actor.role === "teacher" ? {} : { class: { fiscalYear: { isArchived: false } } };
}

// 渡されたのがトランザクションならそのまま使い、素のクライアントなら $transaction で包む。
function inTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  return db.$transaction ? db.$transaction((tx) => fn(tx)) : fn(db);
}

function requiredText(value: string): string {
  const text = value.trim();
  if (text === "") throw new TeamError("invalid_input");
  return text;
}

// works.title は NULL が「未入力」で、公開許可を「許可」にする操作が NULL かどうかで必須を判定する（decisions.md 2026-09-21）。
// 空文字を入れるとその判定をすり抜けるので、空は NULL に寄せる。
function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

// Prisma のエラーコード: P2002 一意制約違反／P2003 外部キー違反／P2025 対象の行が無い。
function hasCode(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

// 先行方針（H-54）: 未アーカイブの年度のうち year が最大のものを既定にし、フォームで別の未アーカイブの年度に切り替えられる。
// 返すのは未アーカイブの年度だけなので、生徒にも先生にも同じ結果。actor は規約（読み取りも主体を取る）のために受け取る。
export async function listClassOptions(db: Db, actor: Actor) {
  void actor;
  const years = await db.fiscalYear.findMany({
    where: { isArchived: false },
    orderBy: { year: "desc" },
    select: { id: true, year: true, classes: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
  });
  return { years, defaultFiscalYearId: years[0]?.id ?? null };
}

const teamSelect = {
  id: true,
  name: true,
  leaderMemberId: true,
  class: { select: { id: true, name: true, fiscalYearId: true, fiscalYear: { select: { year: true, isArchived: true } } } },
  work: { select: { title: true } },
  members: { select: { id: true, name: true, userId: true }, orderBy: { id: "asc" } },
} satisfies Prisma.TeamSelect;

export function listTeams(db: Db, actor: Actor, fiscalYearId: number) {
  return db.team.findMany({
    where: { AND: [{ class: { fiscalYearId } }, readableBy(actor)] },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
    select: teamSelect,
  });
}

export function getTeam(db: Db, actor: Actor, teamId: number) {
  return db.team.findFirst({ where: { AND: [{ id: teamId }, readableBy(actor)] }, select: teamSelect });
}

export type CreateTeamInput = {
  classId: number;
  name: string;
  workTitle?: string | null;
  // 名簿は 1 人ずつ入力した氏名の並び（H-40）。leaderIndex はこの配列の添字で、未指定なら作成後に指定する。
  members: string[];
  leaderIndex?: number;
};

export async function createTeam(db: Db, actor: Actor, input: CreateTeamInput) {
  assertTeacher(actor);
  const name = requiredText(input.name);
  const memberNames = input.members.map(requiredText);
  const { leaderIndex } = input;
  if (leaderIndex !== undefined && !(Number.isInteger(leaderIndex) && leaderIndex >= 0 && leaderIndex < memberNames.length)) {
    throw new TeamError("invalid_input");
  }

  const klass = await db.schoolClass.findUnique({ where: { id: input.classId }, select: { fiscalYear: { select: { isArchived: true } } } });
  if (!klass) throw new TeamError("class_not_found");
  if (klass.fiscalYear.isArchived) throw new TeamError("year_archived");

  // 作成とリーダーの指定は 1 まとまりにする（リーダーの指定だけ失敗して、リーダー未設定のチームが残るのを避ける）。
  // リーダーのメンバー行の id は、行ができるまで分からない。複合外部キーのため Prisma の関係 API でも指せない（schema.prisma の Team）ので、
  // 作成のあとに leaderMemberId を直接更新する。
  return inTransaction(db, async (tx) => {
    let team;
    try {
      team = await tx.team.create({
        data: {
          classId: input.classId,
          name,
          work: { create: { title: optionalText(input.workTitle) } },
          members: { create: memberNames.map((n) => ({ name: n })) },
        },
        select: { id: true, members: { select: { id: true, name: true }, orderBy: { id: "asc" } } },
      });
    } catch (e) {
      if (hasCode(e, "P2002")) throw new TeamError("duplicate_team_name");
      throw e;
    }

    if (leaderIndex === undefined) return { id: team.id, leaderMemberId: null, members: team.members };
    const leaderMemberId = team.members[leaderIndex].id;
    await tx.team.update({ where: { id: team.id }, data: { leaderMemberId } });
    return { id: team.id, leaderMemberId, members: team.members };
  });
}

// 編集は年度の状態で塞がない（H-55）。
export async function updateTeam(db: Db, actor: Actor, teamId: number, input: { name?: string; workTitle?: string | null }) {
  assertTeacher(actor);
  try {
    await db.team.update({
      where: { id: teamId },
      data: {
        ...(input.name !== undefined && { name: requiredText(input.name) }),
        ...(input.workTitle !== undefined && { work: { update: { title: optionalText(input.workTitle) } } }),
      },
    });
  } catch (e) {
    if (hasCode(e, "P2002")) throw new TeamError("duplicate_team_name");
    if (hasCode(e, "P2025")) throw new TeamError("team_not_found");
    throw e;
  }
}

// 追加は許す（H-41 の追記）。削除と、他チームへの移動は作らない。
export async function addMember(db: Db, actor: Actor, teamId: number, name: string) {
  assertTeacher(actor);
  try {
    return await db.teamMember.create({ data: { teamId, name: requiredText(name) }, select: { id: true, name: true } });
  } catch (e) {
    if (hasCode(e, "P2003")) throw new TeamError("team_not_found");
    throw e;
  }
}

export async function renameMember(db: Db, actor: Actor, memberId: number, name: string) {
  assertTeacher(actor);
  try {
    await db.teamMember.update({ where: { id: memberId }, data: { name: requiredText(name) } });
  } catch (e) {
    if (hasCode(e, "P2025")) throw new TeamError("member_not_found");
    throw e;
  }
}

// 引き換え前のメンバーも指せる（decisions.md 2026-09-22）。複合外部キーが、他チームのメンバーを拒否する。
export async function setLeader(db: Db, actor: Actor, teamId: number, memberId: number | null) {
  assertTeacher(actor);
  try {
    await db.team.update({ where: { id: teamId }, data: { leaderMemberId: memberId } });
  } catch (e) {
    if (hasCode(e, "P2003")) throw new TeamError("leader_not_in_team");
    if (hasCode(e, "P2025")) throw new TeamError("team_not_found");
    throw e;
  }
}
