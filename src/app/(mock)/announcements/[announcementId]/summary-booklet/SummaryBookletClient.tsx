"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge } from "@/components/ui/Badge";
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
import type { Announcement } from "@/lib/types";

// SC-11 概要集生成。
// 生成後は概要集の中身を画面に描き直さず、「生成の結果」(ファイル名・ページ数・入ったチーム・スキップしたチーム)だけを出す。日時と「生成済み」は出さない(04 SC-11・H-7・H-8)。
// 読む人が見るのは配られた PDF で、中身の描画は PDF の 1 か所に持つ(requirements §3-3「確認・修正せずそのまま配布」)。
// 並びは SC-08 で保存した発表順(useTimetable の slots)、中身はデモ用の時刻の時点で提出済みの概要(useBooklet)。
// 「生成」した事実は先生の共有状態に記録し(markGenerated)、ハブの工程表が読む。
// 発表会が終わった後でも、いつでも何度でも生成できる(04 SC-11)。未提出のチームは確認ダイアログを経てスキップする。
// 概要を出したチームが 1 つも無いときだけは中身が空になるので、生成・作り直しのボタンを押せなくし、状態だけを出す。
// ［別タブで開く］［ダウンロード］とページ数は、PDF を用意した発表会(getTeacherDemoBookletPdf)で、入るチームがあるときだけ出す。
export function SummaryBookletClient({ announcement: a }: { announcement: Announcement }) {
  const { entries, missing, generatedAt, markGenerated } = useBooklet(a.id);
  const { slots } = useTimetable(a.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const teamSlots = teamSlotsInOrder(slots);
  const orderByTeam = new Map(teamSlots.map((s, i) => [s.teamId, i + 1]));
  const canGenerate = entries.length > 0;
  const pdf = canGenerate ? getTeacherDemoBookletPdf(a.id) : null;
  const yearLabel = getYearById(a.yearId)?.label;
  // 正典に概要集の命名規則は無い。モックのデータ(年度・発表会名)から組み立てる。
  const fileName = `${yearLabel ? `${yearLabel}_` : ""}${a.title}_概要集.pdf`;

  function handleGenerateClick() {
    if (!canGenerate) return;
    if (missing.length > 0) {
      setConfirmOpen(true);
    } else {
      markGenerated();
    }
  }

  const noSummaries = <span className="self-center text-sm text-slate-500">概要の提出がありません</span>;

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
          title="概要集生成"
          meta={<PhaseBadge phase={a.phase} />}
        />

        <div className="mt-4 flex flex-col gap-3">
          {canGenerate && !generatedAt && missing.length > 0 && (
            <InlineNotice tone="warning">
              {missing.length}チームが概要未提出です({missing.map((t) => t.name).join("、")})。
              生成する場合はスキップされます。
            </InlineNotice>
          )}
          {!generatedAt && (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleGenerateClick} disabled={!canGenerate}>
                概要集を生成する
              </Button>
              {!canGenerate && noSummaries}
            </div>
          )}
        </div>

        {generatedAt && (
          <Card className="mt-4 shadow-sm shadow-slate-900/5">
            <p className="text-sm font-semibold break-all text-slate-900">{fileName}</p>
            {pdf && <p className="mt-1 text-xs text-slate-400">{pdf.pages} ページ</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {pdf && (
                // K3(サーバーサイド生成)の生成物を別タブで開く・ダウンロードする。モックなので、開くのは public/ に置いた固定の PDF。
                <>
                  <a href={pdf.href} target="_blank" rel="noopener noreferrer" className={buttonClassName("primary")}>
                    別タブで開く
                  </a>
                  <a href={pdf.href} download={fileName} className={buttonClassName("secondary")}>
                    ダウンロード
                  </a>
                </>
              )}
              <Button variant="secondary" onClick={handleGenerateClick} disabled={!canGenerate}>
                作り直す
              </Button>
              {!canGenerate && noSummaries}
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
          title={`${missing.length} チームをスキップして生成します`}
          description={`スキップするチーム:${missing.map((t) => t.name).join("、")}(概要が未提出)`}
          confirmLabel="スキップして生成する"
        />
      </div>
    </RoleGate>
  );
}
