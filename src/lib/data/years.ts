import { Prisma, type PrismaClient } from "@/generated/prisma/client";

// 対応: docs/requirements.md §3-1（年度一括セットアップが「作成」の正規入口）・design/04-screen.md SC-19。
// 先行方針で組んでいる（06 の列は現行のまま。決着したら変わる箇所は、各項の先行方針に書かれた範囲）:
//   H-57 年度は先生が整数で入力する。クラス名は現行値を初期値に出し、確定の前に先生が編集できる。同じ year はエラーで拒む（UNIQUE）／
//   H-27 資料枠の締切は NULL（未設定）で生成する／H-9 年度セットアップとチーム登録は独立した操作で、順序を強制しない／
//   H-46 クラスは年度セットアップが作る（チーム管理の側には作成を持たせない）。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。

type Db = Pick<PrismaClient, "fiscalYear">;

export type Actor = { role: "teacher" | "student" };

export type YearErrorCode = "forbidden" | "invalid_input" | "duplicate_year";

export class YearError extends Error {
  constructor(readonly code: YearErrorCode) {
    super(code);
    this.name = "YearError";
  }
}

// 回種別は固定 4 種・順序つき（design/06-data.md 6-4）。この並びで作るので、id の昇順が種別の順序になる。
const EVENT_KINDS = ["企画", "設計", "試作", "最終"] as const;

// 定番の資料枠（requirements.md §3-1。decisions.md 2026-10-09）。4 発表会すべてに概要とプレゼン資料の 2 枠で、既定はどちらも必須。
// deadline・template_url は未設定で生成する（H-27）。
const STANDARD_SLOTS = [
  { slotType: "概要", isRequired: true },
  { slotType: "プレゼン資料", isRequired: true },
] as const;

// クラス名の初期値（design/06-data.md 6-4 の現行値。学科構成は変わりうるので、先生が確定の前に編集できる・H-57）。
export const DEFAULT_CLASS_NAMES = ["AI21", "BD21", "GS21", "IG21", "IG22"] as const;

export type SetupYearInput = { year: number; classNames: string[] };

function assertTeacher(actor: Actor) {
  if (actor.role !== "teacher") throw new YearError("forbidden");
}

// Prisma のエラーコード: P2002 一意制約違反。
function hasCode(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

// 年度・クラス・4 発表会・定番の資料枠を、1 回の作成（Prisma の入れ子の作成は 1 トランザクション）で生成する。
// チームは作らない（H-9）。発表（presentations）も作らない：チームがまだ無く、チーム作成時に既存の発表会の分を作る（decisions.md 2026-09-21）。
export async function setupFiscalYear(db: Db, actor: Actor, input: SetupYearInput) {
  assertTeacher(actor);
  if (!Number.isInteger(input.year) || input.year <= 0) throw new YearError("invalid_input");
  const classNames = input.classNames.map((n) => n.trim());
  // 空の名前と、同じ名前の重複は、DB の UNIQUE(fiscal_year_id, name) に任せず入力の誤りとして先に返す（year の重複と区別するため）。
  if (classNames.some((n) => n === "") || new Set(classNames).size !== classNames.length) throw new YearError("invalid_input");

  try {
    return await db.fiscalYear.create({
      data: {
        year: input.year,
        classes: { create: classNames.map((name) => ({ name })) },
        eventOccasions: {
          create: EVENT_KINDS.map((kind) => ({ kind, materialSlots: { create: STANDARD_SLOTS.map((s) => ({ ...s })) } })),
        },
      },
      select: { id: true, year: true },
    });
  } catch (e) {
    if (hasCode(e, "P2002")) throw new YearError("duplicate_year");
    throw e;
  }
}
