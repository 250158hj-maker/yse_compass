"use server";

import { auth } from "@/auth";
import { isId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { BookletError, getSummaryBookletPlan, type BookletErrorCode, type BookletPlan } from "@/lib/data/summary-booklet";

// 対応: docs/design/04-screen.md SC-11（生成の前に「この順で束ねます」の一覧を出す）・requirements.md §3-3。規則と認可の本体は lib/data/summary-booklet.ts にある（一次防衛線。先生だけ）。
// ここは、サインイン済みのロールを取り出して渡し、BookletError を画面が扱える結果に直すだけの薄い層。PDF の生成は、別タブで開く形のため API（app/api/summary-booklet）にある。

export type BookletActionResult<T> = { ok: true; data: T } | { ok: false; code: BookletErrorCode | "unauthenticated" };

// 一覧は、読むたびにその時点の概要と発表順から作る（生成のときと同じ読み込み）。一覧を見たあとに提出や発表順が変わると、生成の結果の欄と食い違いうるので、
// 画面は、生成の結果の欄（同じ 1 回の生成から出す）を正とする。
export async function getSummaryBookletPlanAction(occasionId: number): Promise<BookletActionResult<BookletPlan>> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "unauthenticated" };
  if (!isId(occasionId)) return { ok: false, code: "invalid_input" };
  try {
    return { ok: true, data: await getSummaryBookletPlan(prisma, { userId: session.user.id, role: session.user.role }, occasionId) };
  } catch (e) {
    if (e instanceof BookletError) return { ok: false, code: e.code };
    throw e;
  }
}
