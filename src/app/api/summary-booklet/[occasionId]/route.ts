import { auth } from "@/auth";
import { parseId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { BookletError, generateSummaryBooklet, type BookletErrorCode } from "@/lib/data/summary-booklet";

// 対応: docs/requirements.md §3-3・design/04-screen.md SC-11（生成した PDF を別タブで開く・ダウンロードする）。規則と認可の本体は lib/data/summary-booklet.ts にある（一次防衛線）。
// ここは、サインイン済みのロールを取り出して渡し、結果を HTTP の応答に直すだけの薄い層。
// PDF は 1 回の生成ごとに作って返し、保存しない（decisions.md 2026-10-22）。GET だが、毎回作り直すのでキャッシュさせない。
//   ?skip=1        スキップするチームがあるのを、先生が了承した（SC-11 の確認）。無いと、スキップがあるとき 409 を返す。
//   ?download=1    ダウンロードにする（無ければ別タブで開く形）。
// ファイル名は H-50 の先行方針（<年度>_<発表会名>_概要集.pdf）。日本語は filename*=UTF-8''（RFC 5987）で渡す。ブラウザで保存したときの名前は未確認。
// 結果の欄（ファイル名・ページ数・入ったチーム・スキップしたチーム）と PDF は、同じ 1 回の生成から出す（04 SC-11）。いまはこの応答が PDF だけを返すので、
// 画面を本実装に置き換えるときに、結果の欄も同じ応答から渡す形を、画面の担当と決める。

const STATUS: Record<BookletErrorCode, number> = {
  forbidden: 403,
  invalid_input: 400,
  occasion_not_found: 404,
  nothing_to_bundle: 409,
  skip_not_confirmed: 409,
};

export async function GET(request: Request, { params }: { params: Promise<{ occasionId: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ code: "unauthenticated" }, { status: 401 });

  const { occasionId } = await params;
  const query = new URL(request.url).searchParams;
  try {
    const { pdf, fileName } = await generateSummaryBooklet(prisma, { userId: session.user.id, role: session.user.role }, parseId(occasionId) ?? 0, {
      skipConfirmed: query.get("skip") === "1",
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${query.get("download") === "1" ? "attachment" : "inline"}; filename="summary-booklet.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof BookletError) return Response.json({ code: e.code }, { status: STATUS[e.code] });
    throw e;
  }
}
