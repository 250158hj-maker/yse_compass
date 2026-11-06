import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { YearError, listClassNameDefaults, listFiscalYears } from "@/lib/data/years";
import { prisma } from "@/lib/prisma";
import { YearRow } from "./YearRow";
import { YearsHeader } from "./YearsHeader";

// 対応: docs/design/04-screen.md SC-19（年度管理・T 専用）／docs/requirements.md §3-1・§3-7。Issue #184（モックの画面を本番仕様にする）。
// 見た目はモックのまま（見出しの【+ 年度を開始】・年度のカード・アーカイブのボタン）、データは data 層、ユーザーは requireSessionUser から読む。
// 先生だけが使える（関数が先生以外を拒む）。拒否されたときは、案内だけを出す。画面で権限の判定をしない。
// 年度を開始するときの入力（年度・クラス名）は、decisions.md 2026-11-02 のクラスの入力の行と H-57 の先行方針のとおり。
// 含めない: 年度ごとの発表会の一覧（SC-03・SC-05）、セットアップの後のクラスの追加・修正（関数がまだ無い）。
export default async function AdminYearsPage() {
  const user = await requireSessionUser("/admin/years");
  const actor = { userId: user.id, role: user.role };
  let years;
  let defaultClassNames;
  try {
    [years, defaultClassNames] = await Promise.all([listFiscalYears(prisma, actor), listClassNameDefaults(prisma, actor)]);
  } catch (e) {
    if (e instanceof YearError && e.code === "forbidden") {
      return (
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "年度管理" }]} />
          <PageHeader title="年度管理" />
          <div className="mt-6">
            <InlineNotice tone="warning">年度管理は、先生だけが使えます。</InlineNotice>
          </div>
        </div>
      );
    }
    throw e;
  }
  // 前年度 = すでにある年度のうち year が最大のもの（クラス名の初期値の出どころ。listClassNameDefaults と同じ）。
  const previousYear = years[0]?.year ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "年度管理" }]} />
      {/* 年度を開始したら、前年度が変わりクラス名の初期値も変わる。フォームを作り直す。 */}
      <YearsHeader key={years[0]?.id ?? "none"} defaultClassNames={defaultClassNames} previousYear={previousYear} />

      <div className="mt-6 flex flex-col gap-3">
        {years.length === 0 ? (
          <EmptyState message="まだ年度がありません。右上の【+ 年度を開始】から、最初の年度を開始してください。" />
        ) : (
          years.map((y) => <YearRow key={y.id} id={y.id} year={y.year} isArchived={y.isArchived} />)
        )}
      </div>
    </div>
  );
}
