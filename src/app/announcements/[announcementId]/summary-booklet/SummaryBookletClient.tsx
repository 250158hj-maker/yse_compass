"use client";

import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { NextStep, backToHub } from "@/components/flow/NextStep";
import { useBooklet, useTimetable } from "@/context/TeacherDemoContext";
import { teamSlotsInOrder } from "@/lib/demo/teacher-derived";
import { getYearById } from "@/lib/mock";
import { getTeacherDemoBookletPdf } from "@/lib/mock/teacher-demo";
import { formatDateTime } from "@/lib/format";
import type { Announcement } from "@/lib/types";

// SC-11 概要集生成。
// 生成後は概要集の中身を画面に描き直さず、「生成の結果」(ファイル名・日時・ページ数・入ったチーム・スキップしたチーム)だけを出す。
// 読む人が見るのは配られた PDF で、中身の描画は PDF の 1 か所に持つ(requirements §3-3「確認・修正せずそのまま配布」)。
// 並びは SC-08 で保存した発表順(useTimetable の slots)、中身はデモ用の時刻の時点で提出済みの概要(useBooklet)。
// 「生成」した事実は先生の共有状態に記録し(markGenerated)、ハブの工程表が読む。
export function SummaryBookletClient({ announcement: a }: { announcement: Announcement }) {
  const { entries, missing, generatedAt, markGenerated } = useBooklet(a.id);
  const { slots, orderConfirmed } = useTimetable(a.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const teamSlots = teamSlotsInOrder(slots);
  const orderByTeam = new Map(teamSlots.map((s, i) => [s.teamId, i + 1]));
  const orderText = entries.map((e) => e.team.name).join(" → ");
  const pdf = getTeacherDemoBookletPdf(a.id);
  const yearLabel = getYearById(a.yearId)?.label;
  // 正典に概要集の命名規則は無い。モックのデータ(年度・発表会名)から組み立てる。
  const fileName = `${yearLabel ? `${yearLabel}_` : ""}${a.title}_概要集.pdf`;

  function handleGenerateClick() {
    if (missing.length > 0) {
      setConfirmOpen(true);
    } else {
      markGenerated();
    }
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<TeacherOnlyNotice />}>
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "発表会一覧", href: "/announcements" },
            { label: a.title, href: `/announcements/${a.id}` },
            { label: "概要集生成" },
          ]}
        />
        <PageHeader
          eyebrow={a.title}
          title="概要集生成・プレビュー"
          meta={
            <>
              <PhaseBadge phase={a.phase} />
              {generatedAt && <Badge tone="emerald">生成済み</Badge>}
            </>
          }
        />

        <div className="mt-4 flex flex-col gap-3">
          {!orderConfirmed && (
            <InlineNotice tone="warning">
              発表順がまだ確定していません。いまの並び({orderText || "なし"})で作られます。
              <Link
                href={`/announcements/${a.id}/timetable/edit`}
                className="ml-1 font-medium underline underline-offset-2"
              >
                発表順を編集
              </Link>
            </InlineNotice>
          )}
          {!generatedAt && missing.length > 0 && (
            <InlineNotice tone="warning">
              {missing.length}チームが概要未提出です({missing.map((t) => t.name).join("、")})。
              生成する場合はスキップされます。
            </InlineNotice>
          )}
          {!generatedAt && (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleGenerateClick}>
                概要集を生成する
              </Button>
            </div>
          )}
        </div>

        {generatedAt && (
          <Card className="mt-4 shadow-sm shadow-slate-900/5">
            <p className="text-sm font-semibold break-all text-slate-900">{fileName}</p>
            <p className="mt-1 text-xs text-slate-400">
              生成 {formatDateTime(generatedAt)}
              {pdf && `・${pdf.pages} ページ`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {pdf && (
                // K3(サーバーサイド生成)の生成物を別タブで開く。モックなので、開くのは public/ に置いた固定の PDF。
                <a href={pdf.href} target="_blank" rel="noopener noreferrer" className={buttonClassName("primary")}>
                  PDF を開く
                </a>
              )}
              <Button variant="secondary" onClick={handleGenerateClick}>
                作り直す
              </Button>
            </div>

            <div className="mt-5">
              <SectionHeading>入ったチーム({entries.length})</SectionHeading>
              <ol className="flex flex-col gap-1.5">
                {entries.map(({ team }) => (
                  <li
                    key={team.id}
                    className="flex flex-wrap items-baseline gap-x-3 rounded-md bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="w-5 shrink-0 text-xs text-slate-400">{orderByTeam.get(team.id)}</span>
                    <span className="font-medium text-slate-900">{team.name}</span>
                    <span className="text-slate-500">{team.projectTitle}</span>
                  </li>
                ))}
              </ol>
            </div>

            {missing.length > 0 && (
              <div className="mt-5">
                <SectionHeading>スキップしたチーム(未提出)</SectionHeading>
                <ul className="flex flex-col gap-1.5">
                  {missing.map((team) => (
                    <li
                      key={team.id}
                      className="flex flex-wrap items-baseline gap-x-3 rounded-md bg-rose-50 px-3 py-2 text-sm ring-1 ring-rose-200"
                    >
                      <span className="w-5 shrink-0 text-xs text-rose-400">{orderByTeam.get(team.id)}</span>
                      <span className="font-semibold text-rose-700">{team.name}</span>
                      <span className="text-rose-700">{team.projectTitle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        <NextStep
          next={generatedAt ? { href: `/announcements/${a.id}/timetable`, label: "次へ：当日進行 →" } : null}
          back={backToHub(a.id)}
        />

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={markGenerated}
          title="未提出チームがあります"
          description={`${missing.map((t) => t.name).join("、")} は概要が未提出です。スキップして概要集を生成しますか?`}
          confirmLabel="スキップして生成する"
        />
      </div>
    </RoleGate>
  );
}
