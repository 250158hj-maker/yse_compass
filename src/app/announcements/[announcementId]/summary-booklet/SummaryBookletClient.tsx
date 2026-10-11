"use client";

import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { NextStep, backToHub } from "@/components/flow/NextStep";
import { useBooklet, useTimetable } from "@/context/TeacherDemoContext";
import { teamSlotsInOrder } from "@/lib/demo/teacher-derived";
import { formatDateTime } from "@/lib/format";
import type { Announcement } from "@/lib/types";

// SC-11 概要集生成・プレビュー。
// 並びは SC-08 で保存した発表順(useTimetable の slots)、中身はデモ用の時刻の時点で提出済みの概要(useBooklet)。
// 「生成」した事実は先生の共有状態に記録し(markGenerated)、ハブの工程表が読む。
export function SummaryBookletClient({ announcement: a }: { announcement: Announcement }) {
  const { entries, missing, generatedAt, markGenerated } = useBooklet(a.id);
  const { slots, orderConfirmed } = useTimetable(a.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const teamSlots = teamSlotsInOrder(slots);
  const slotByTeam = new Map(teamSlots.map((s, i) => [s.teamId, { order: i + 1, startTime: s.startTime }]));
  const orderText = entries.map((e) => e.team.name).join(" → ");
  const generated = generatedAt !== null;

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
        <div className="print:hidden">
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
                {generated && <Badge tone="emerald">生成済み</Badge>}
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
            {missing.length > 0 && (
              <InlineNotice tone="warning">
                {missing.length}チームが概要未提出です({missing.map((t) => t.name).join("、")})。
                生成する場合はスキップされます。
              </InlineNotice>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={handleGenerateClick}>
                {generated ? "概要集を作り直す" : "概要集を生成する"}
              </Button>
              {generated && (
                <Button variant="secondary" onClick={() => window.print()}>
                  印刷する
                </Button>
              )}
              {generatedAt && <span className="text-xs text-slate-400">生成 {formatDateTime(generatedAt)}</span>}
            </div>
          </div>
        </div>

        {generated && (
          <div className="mt-8 flex flex-col gap-8">
            {entries.map(({ team, summary }) => {
              const slot = slotByTeam.get(team.id);
              return (
                <div
                  key={team.id}
                  style={{ pageBreakAfter: "always" }}
                  className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5 print:border-none print:p-0 print:shadow-none"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-brand-600">{team.className}</p>
                    {slot && (
                      <p className="text-xs text-slate-400">
                        発表 {slot.order} 番目・{slot.startTime}〜
                      </p>
                    )}
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{team.projectTitle}</h2>
                  <p className="text-sm text-slate-500">
                    {team.name}・{team.members.join("、")}
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">背景・動機</p>
                      <p className="mt-1 text-sm text-slate-700">{summary.background}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">使用技術</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {summary.techUsed.map((tech) => (
                          <Badge key={tech} tone="brand">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400">概要</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{summary.onePageBody}</p>
                  </div>

                  <div className="mt-4 text-sm text-slate-600">起: {summary.opening}</div>
                  <div className="mt-1 text-sm text-slate-600">結: {summary.closing}</div>
                </div>
              );
            })}
          </div>
        )}

        <NextStep
          next={generated ? { href: `/announcements/${a.id}/timetable`, label: "次へ：当日進行 →" } : null}
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
