import type { PrismaClient } from "@/generated/prisma/client";
import { parseId } from "@/lib/ids";
import { getCurrentYearOccasions } from "@/lib/data/occasions";
import type { Actor } from "@/lib/data/years";

// 対応: docs/design/04-screen.md SC-02（ホームの自チーム）・Issue #184（鈴木さんの依頼 2026-11-06。画面で「自チームを探す」判定をしないため）。
// 先行方針で組んでいる:
//   H-54 「当年度」は未アーカイブの年度のうち year が最大のもの（getCurrentYearOccasions と同じ求め方）。
// 先生には自チームが無いので、エラーにせず not_student を返す。生徒でも先生でもない主体は、getCurrentYearOccasions と同じく forbidden（YearError）。
// 生徒が当年度のチームに結びついていない（H-25 の引き換えの前など）ときは unlinked。結びつきの有無を、画面が「属さない」と区別できる形で返す（#174 の問い 6）。
// メンバーの userId は返さない：画面が判定に使わないようにするため（#184 の「画面で判定しない」）。

type Db = Pick<PrismaClient, "fiscalYear" | "eventOccasion" | "teamMember">;

export type OwnTeamResult =
  | { kind: "no_current_year" }
  | { kind: "not_student" }
  | { kind: "unlinked" }
  | {
      kind: "member";
      team: { id: number; name: string; class: { id: number; name: string }; members: { id: number; name: string; isLeader: boolean }[] };
    };

export async function getOwnTeam(db: Db, actor: Actor): Promise<OwnTeamResult> {
  // 先生でも生徒でもない主体は、ここで弾かれる（forbidden）。
  const current = await getCurrentYearOccasions(db, actor);
  if (actor.role !== "student") return { kind: "not_student" };
  if (!current) return { kind: "no_current_year" };

  // 実行主体の userId は文字列（H-30 に備えた別名）。メンバー行の user_id（整数）と突き合わせる。整数にできなければ、どのメンバー行にも結びつかない。
  const userId = parseId(actor.userId);
  if (userId === null) return { kind: "unlinked" };

  const row = await db.teamMember.findFirst({
    where: { userId, team: { class: { fiscalYearId: current.fiscalYear.id } } },
    select: {
      team: {
        select: {
          id: true,
          name: true,
          leaderMemberId: true,
          class: { select: { id: true, name: true } },
          members: { orderBy: { id: "asc" }, select: { id: true, name: true } },
        },
      },
    },
  });
  if (!row) return { kind: "unlinked" };

  const { team } = row;
  return {
    kind: "member",
    team: {
      id: team.id,
      name: team.name,
      class: team.class,
      members: team.members.map((m) => ({ id: m.id, name: m.name, isLeader: m.id === team.leaderMemberId })),
    },
  };
}
