import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { UserRole } from "@/lib/auth/callbacks";
import { isId } from "@/lib/ids";
import { MAX_CLASS_NAME_LENGTH } from "@/lib/year-rules";

// 対応: docs/requirements.md §3-1（年度一括セットアップが「作成」の正規入口）・design/04-screen.md SC-19。
// 先行方針で組んでいる（06 の列は現行のまま。決着したら変わる箇所は、各項の先行方針に書かれた範囲）:
//   H-57 年度は先生が整数で入力する。同じ year はエラーで拒む（UNIQUE）／
//   H-27 資料枠の締切は NULL（未設定）で生成する。
// 決着済み（decisions.md 2026-11-02）: クラス名は前年度のクラスを初期値に出し（前年度が無ければ空）、確定の前に先生が編集できる。クラスが 0 件のときは確定させない。
//   クラスは年度セットアップが作る（チーム管理の側には作成を持たせない）。セットアップの後に SC-19 でクラスを足す・名前を直すことも決まっており、updateFiscalYear が受け持つ（削除は決めていないので持たない）。
//   チーム登録は年度セットアップの後（H-9 の「順序を強制しない」は 2026-11-02 の【変更】の行で改めた。2 つが別の操作であることと、セットアップがチームを作らないことは変わらない）。
// 認可の一次防衛線はここに置く（画面や Server Action が先に弾いても、ここでも必ず確かめる）。

type Db = Pick<PrismaClient, "fiscalYear">;

// 実行主体。#125（lib/data/teams.ts）の Actor と同じ形（userId は users.id を文字列にした値・H-30 に備えて別名にしている）。
export type ActorUserId = string;
export type Actor = { userId: ActorUserId; role: UserRole };

export type YearErrorCode = "forbidden" | "invalid_input" | "duplicate_year" | "duplicate_class" | "year_not_found";

export class YearError extends Error {
  constructor(readonly code: YearErrorCode) {
    super(code);
    this.name = "YearError";
  }
}

// 回種別は固定 4 種・順序つき（design/06-data.md 6-4）。この並びで作るので、id の昇順が種別の順序になる。
// 並びの唯一の源として export する（id の昇順に頼らず、この並びで比べる）。
export const EVENT_KINDS = ["企画", "設計", "試作", "最終"] as const;

// 定番の資料枠（requirements.md §3-1。decisions.md 2026-10-09）。4 発表会すべてに概要とプレゼン資料の 2 枠で、既定はどちらも必須。
// deadline・template_url は未設定で生成する（H-27）。
const STANDARD_SLOTS = [
  { slotType: "概要", isRequired: true },
  { slotType: "プレゼン資料", isRequired: true },
] as const;

export type SetupYearInput = { year: number; classNames: string[] };
// id があるクラスは名前を直し、id が無いクラスは足す。入力に含まれない既存のクラスは、そのまま残す（削除は持たない）。
export type UpdateYearInput = { year: number; classes: { id?: number; name: string }[] };

// 年度は西暦 4 桁（design/06-data.md 6-3 の fiscal_years.year）。範囲外の値は DB に渡さない（integer の範囲を超えると Prisma が例外を投げる）。
const isValidYear = (year: unknown) => Number.isInteger(year) && (year as number) >= 1000 && (year as number) <= 9999;

// クラス名の規則：空でない・上限（year-rules.ts）以内・同じ名前の重複は無い。NUL 文字（\0）と、列の上限を超える長さは、PostgreSQL が拒み、
// YearError ではない例外（P2039 など）になって画面が 500 になるので、ここで入力の誤りにする。
const isValidClassNames = (names: string[]) =>
  names.every((n) => n !== "" && n.length <= MAX_CLASS_NAME_LENGTH && !n.includes("\0")) && new Set(names).size === names.length;

function assertTeacher(actor: Actor) {
  if (actor.role !== "teacher") throw new YearError("forbidden");
}

// クラス名の初期値は、コードに持たず前年度のクラスから引く（decisions.md 2026-09-04 の H-3「コードに焼き込むと来年度の変更にコード修正が要る」）。
// 前年度は、すでにある年度のうち year が最大のもの。無ければ空（初年度は先生が入力する）。
// 使う画面の SC-19 は先生専用（04-screen.md §4-4 で T だけ）なので、行の絞り込みではなくロールで止める。
export async function listClassNameDefaults(db: Db, actor: Actor): Promise<string[]> {
  assertTeacher(actor);
  const previous = await db.fiscalYear.findFirst({
    orderBy: { year: "desc" },
    select: { classes: { select: { name: true }, orderBy: { name: "asc" } } },
  });
  return previous?.classes.map((c) => c.name) ?? [];
}

// SC-19「年度の一覧と状態（進行中／アーカイブ済み）」。新しい年度が先。SC-19 は先生専用なので、ロールで止める。
export async function listFiscalYears(db: Db, actor: Actor) {
  assertTeacher(actor);
  return db.fiscalYear.findMany({
    orderBy: { year: "desc" },
    select: { id: true, year: true, isArchived: true, classes: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
  });
}

// 年度のアーカイブ／解除（requirements.md §3-7・SC-19）。先生の明示操作で、時刻や条件による自動遷移は持たない（設計原則）。
// すでにその状態の年度への設定は、そのまま成功にする（同じ操作の再送で失敗させない）。
// 他のアーカイブ済みの規則（提出・チーム作成を塞ぐ範囲）はここで足さない：読み取りと作成の側が isArchived を見る（H-54・H-55・H-60）。
export async function setYearArchived(db: Db, actor: Actor, fiscalYearId: number, isArchived: boolean) {
  assertTeacher(actor);
  if (!isId(fiscalYearId) || typeof isArchived !== "boolean") throw new YearError("invalid_input");
  try {
    return await db.fiscalYear.update({ where: { id: fiscalYearId }, data: { isArchived }, select: { id: true, year: true, isArchived: true } });
  } catch (e) {
    if (hasCode(e, "P2025")) throw new YearError("year_not_found");
    throw e;
  }
}

// Prisma のエラーコード: P2002 一意制約違反／P2025 対象の行が無い。
function hasCode(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

// 年度・クラス・4 発表会・定番の資料枠を、1 回の作成（Prisma の入れ子の作成は 1 トランザクション）で生成する。
// チームは作らない（H-9）。発表（presentations）も作らない：チームがまだ無く、チーム作成時（teams.ts の createTeam）に既存の発表会の分を作る（decisions.md 2026-09-21）。
// 年度セットアップ側で既存のチームの分を補う処理は要らない：チーム登録は年度セットアップの後で、チームはセットアップが作ったクラスにだけ属するので、この時点でチームは無い（decisions.md 2026-11-02 の【変更】の行）。
export async function setupFiscalYear(db: Db, actor: Actor, input: SetupYearInput) {
  assertTeacher(actor);
  if (!isValidYear(input.year)) throw new YearError("invalid_input");
  const classNames = input.classNames.map((n) => n.trim());
  // クラスが 0 件のときは確定させない（decisions.md 2026-11-02 のクラスの入力の行）。空の名前と、同じ名前の重複は、DB の UNIQUE(fiscal_year_id, name) に任せず入力の誤りとして先に返す（year の重複と区別するため）。
  if (classNames.length === 0 || !isValidClassNames(classNames)) throw new YearError("invalid_input");

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

// 年度の訂正：年度の数字と、クラスの名前の直し・追加（decisions.md 2026-11-02 のクラスの入力の行。誤って登録したときの手当て）。
// 年度そのものの削除はしない（運用の方針）。クラスの削除も、チームが結びつくため決めていないので持たない。
// 1 回の更新（Prisma の入れ子の更新は 1 トランザクション）で、途中までの反映を残さない。
// アーカイブ済みの年度を編集できるかは未決（H-79 (b)・保留）だが、先行方針として、アーカイブ済みの年度にも編集を付けている（状態で塞がない。H-55 の先行方針に揃える）。ふさぐと決まったら、ここで isArchived を見て拒む。
// 発表会・資料枠・チームには触れない（年度の数字は fiscal_years.year だけが持ち、他の表は id で結びつく）。
// クラス名の入れ替え・連鎖の改名（IG21→IG22 と IG22→IG23 を同時に、など）は扱わない：Prisma が update を 1 件ずつ順に当てるので、
// 1 件目の時点で、まだ改名されていない相手の名前と重なり duplicate_class になる（何も保存されない。データは壊れない）。
// 先生は保存を 2 回に分ける（入れ替えは一時的な名前を挟む）。頻度が低いので、文言（year-messages.ts）でその案内を出すにとどめる。
export async function updateFiscalYear(db: Db, actor: Actor, fiscalYearId: number, input: UpdateYearInput) {
  assertTeacher(actor);
  if (!isId(fiscalYearId) || !isValidYear(input.year) || input.classes.some((c) => c.id !== undefined && !isId(c.id))) throw new YearError("invalid_input");
  const classes = input.classes.map((c) => ({ id: c.id, name: c.name.trim() }));
  if (!isValidClassNames(classes.map((c) => c.name))) throw new YearError("invalid_input");

  // year の重複は、先に確かめて duplicate_class と区別する（P2002 は year とクラス名のどちらの UNIQUE でも同じコードのため）。
  const taken = await db.fiscalYear.findFirst({ where: { year: input.year, NOT: { id: fiscalYearId } }, select: { id: true } });
  if (taken) throw new YearError("duplicate_year");

  try {
    return await db.fiscalYear.update({
      where: { id: fiscalYearId },
      data: {
        year: input.year,
        classes: {
          // where に別の年度のクラスの id が来ても、この年度のクラスでなければ P2025 になる。
          update: classes.flatMap((c) => (c.id === undefined ? [] : [{ where: { id: c.id }, data: { name: c.name } }])),
          create: classes.flatMap((c) => (c.id === undefined ? [{ name: c.name }] : [])),
        },
      },
      select: { id: true, year: true },
    });
  } catch (e) {
    if (hasCode(e, "P2025")) throw new YearError("year_not_found");
    // 年度の重複は上で除いたので、残る UNIQUE の違反は、入力に無い既存のクラスと名前が重なったとき（上の入れ替え・連鎖の改名もここに来る）。
    // 上の確認と更新の間に、別の先生が同じ年度の数字を先に保存した場合も、年度の UNIQUE 違反がここに来て duplicate_class になる（文言が不正確。
    // 再度保存すれば duplicate_year になる。先生は少人数で窓が狭いので、直さない）。
    if (hasCode(e, "P2002")) throw new YearError("duplicate_class");
    throw e;
  }
}
