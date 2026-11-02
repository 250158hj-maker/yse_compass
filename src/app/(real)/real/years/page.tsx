import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { listClassNameDefaults, listFiscalYears } from "@/lib/data/years";
import { prisma } from "@/lib/prisma";
import { StartYearForm } from "./StartYearForm";
import { YearRow } from "./YearRow";

// 対応: docs/design/04-screen.md SC-19（年度管理・T 専用）／docs/requirements.md §3-1・§3-7。
// 先行方針: H-57（年度セットアップの入力）。含めない: 年度ごとの発表会の一覧（SC-03・SC-05）。
export default async function RealYearsPage() {
  const user = await requireSessionUser("/real/years");
  if (user.role !== "teacher") {
    return (
      <div>
        <PageHeader title="年度管理" />
        <div className="mt-6">
          <InlineNotice tone="warning">年度管理は、先生だけが使えます。</InlineNotice>
        </div>
      </div>
    );
  }
  const actor = { userId: user.id, role: user.role };
  const [years, defaultClassNames] = await Promise.all([listFiscalYears(prisma, actor), listClassNameDefaults(prisma, actor)]);
  // 前年度 = すでにある年度のうち year が最大のもの（クラス名の初期値の出どころ。listClassNameDefaults と同じ）。
  const previousYear = years[0]?.year ?? null;

  return (
    <div>
      <PageHeader title="年度管理" meta={<span>{years.length}年度</span>} />
      <div className="mt-6 space-y-6">
        {/* 年度を開始したら、前年度が変わりクラス名の初期値も変わる。フォームを作り直す。 */}
        <StartYearForm key={years[0]?.id ?? "none"} defaultClassNames={defaultClassNames} previousYear={previousYear} />

        {years.length === 0 ? (
          <EmptyState message="まだ年度がありません。上のフォームで、最初の年度を開始してください。" />
        ) : (
          <div className="flex flex-col gap-3">
            {years.map((y) => (
              <YearRow key={y.id} id={y.id} year={y.year} isArchived={y.isArchived} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
