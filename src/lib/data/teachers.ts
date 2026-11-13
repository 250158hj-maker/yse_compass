import type { PrismaClient } from "@/generated/prisma/client";
import { isId, parseId } from "@/lib/ids";
import type { Actor } from "@/lib/data/years";

// 対応: docs/requirements.md §3-6（ロール）・design/04-screen.md SC-20（先生の登録・解除）・decisions.md 2026-09-05（H-10: 先生ホワイトリスト方式）・2026-09-06（H-11）。
// 先生は users.role = 'teacher' の行で表す（別テーブルを持たない）。登録できるのは、一度サインインして users の行がある人だけ（open-questions.md H-26 の先行方針「初回サインイン後の昇格のみ」。決着したら変わるのは、
// 候補の出し方と registerTeacher の入口）。サインインで行ができたときのロールは生徒で、既存の行のロールは、この画面の操作だけが変える（lib/auth/callbacks.ts）。
// 登録・解除は、その人が次にサインインしたときから効く。サインイン済みのトークンのロールは失効まで残り、即時には変わらない（H-30。決着したら変わるのは、解除の即時性だけ）。
// 自分自身は解除できない。これでホワイトリストは空にならないので、「最後の 1 人か」を判定する分岐は持たない（SC-20「できないこと」）。
// 先生だけが呼べる（ロールの判定のみ。生徒には、一覧も操作も返さない）。認可の一次防衛線はここに置く。

type Db = Pick<PrismaClient, "user">;

export type TeacherErrorCode = "forbidden" | "invalid_input" | "user_not_found" | "self_unregister";

export class TeacherError extends Error {
  constructor(readonly code: TeacherErrorCode) {
    super(code);
    this.name = "TeacherError";
  }
}

function assertTeacher(actor: Actor) {
  if (actor.role !== "teacher") throw new TeacherError("forbidden");
}

const select = { id: true, name: true, email: true } as const;

// 先生の一覧（登録順＝ id の昇順）と、登録の候補（サインイン済みで、いま先生でない人）。
// 解除できるかは、各先生の canUnregister で返す（自分自身は false）。画面は ID を比べない。
export async function listTeacherRoster(db: Db, actor: Actor) {
  assertTeacher(actor);
  const selfId = parseId(actor.userId);
  const [teachers, candidates] = await Promise.all([
    db.user.findMany({ where: { role: "teacher" }, orderBy: { id: "asc" }, select }),
    db.user.findMany({ where: { NOT: { role: "teacher" } }, orderBy: [{ name: "asc" }, { id: "asc" }], select }),
  ]);
  return {
    teachers: teachers.map((u) => ({ ...u, isSelf: u.id === selfId, canUnregister: u.id !== selfId })),
    candidates,
  };
}

// すでに先生の人への登録は、何もしないで成功にする（同じ操作の再送で失敗させない）。
export async function registerTeacher(db: Db, actor: Actor, userId: number) {
  assertTeacher(actor);
  if (!isId(userId)) throw new TeacherError("invalid_input");
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) throw new TeacherError("user_not_found");
  if (target.role !== "teacher") await db.user.update({ where: { id: userId }, data: { role: "teacher" } });
  return { id: userId, role: "teacher" as const };
}

// 先生でない人への解除は、何もしないで成功にする。自分自身は、先生であっても解除できない。
export async function unregisterTeacher(db: Db, actor: Actor, userId: number) {
  assertTeacher(actor);
  if (!isId(userId)) throw new TeacherError("invalid_input");
  if (parseId(actor.userId) === userId) throw new TeacherError("self_unregister");
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) throw new TeacherError("user_not_found");
  if (target.role === "teacher") await db.user.update({ where: { id: userId }, data: { role: "student" } });
  return { id: userId, role: "student" as const };
}
