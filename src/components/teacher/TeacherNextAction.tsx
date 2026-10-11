"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTeacherFocusAnnouncement, useTeacherNextAction, useTimetable } from "@/context/TeacherDemoContext";
import { getTeamById } from "@/lib/mock";
import { nextTeamId, teamSlotsInOrder, type TeacherNextAction as NextAction } from "@/lib/demo/teacher-derived";
import { formatDate, formatDateTime } from "@/lib/format";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PERIOD_TONE, joinTeamNames } from "@/components/teacher/teacher-format";
import type { Announcement, TimetableSlot } from "@/lib/types";

// 先生のホームの最上部に置く「次にやること」。先生が毎回ここから入り、時期に合った 1 つの画面へ進む。
// 中身は useTeacherNextAction の kind(collect / prepare / start / run / publish / none)で決まる。
// 見出しとボタンの文言は、ハブの工程表(WorkflowSteps)の工程名・ボタンとそろえる(同じ工程・同じ遷移先に 2 つの呼び名を作らない)。
export function TeacherNextAction({ announcements }: { announcements: Announcement[] }) {
  const focus = useTeacherFocusAnnouncement(announcements);
  if (!focus) return null;
  return <NextActionCard announcement={focus} />;
}

type View = {
  headline: string;
  status: ReactNode;
  detail?: ReactNode;
  primary: { href: string; label: string } | null;
  secondary: { href: string; label: string } | null;
};

function NextActionCard({ announcement: a }: { announcement: Announcement }) {
  const action = useTeacherNextAction(a.id);
  const { period, slots } = useTimetable(a.id);
  if (!action) return null;
  const view = buildView(a, action, slots);

  return (
    <Card className="shadow-sm shadow-slate-900/5">
      <h2 className="text-sm font-semibold text-slate-500">次にやること</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PhaseBadge phase={a.phase} />
        <Link href={`/announcements/${a.id}`} className="font-semibold text-slate-900 hover:text-brand-700">
          {a.title}
        </Link>
        <Badge tone={PERIOD_TONE[period]}>{period}</Badge>
        <span className="text-xs text-slate-500">
          開催日 {formatDate(a.period)}・締切 {formatDateTime(a.submissionDeadline)}
        </span>
      </div>
      <p className="mt-4 text-xl font-semibold text-slate-900">{view.headline}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">{view.status}</div>
      {view.detail}
      <div className="mt-4 flex flex-wrap gap-2">
        {view.primary && (
          <Link href={view.primary.href}>
            <Button variant="primary">{view.primary.label}</Button>
          </Link>
        )}
        {view.secondary && (
          <Link href={view.secondary.href}>
            <Button variant="secondary">{view.secondary.label}</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

function buildView(a: Announcement, action: NextAction, slots: TimetableSlot[]): View {
  const base = `/announcements/${a.id}`;
  const hub = { href: base, label: "工程表を見る" };

  switch (action.kind) {
    case "collect": {
      const { daysLeft, missing } = action;
      return {
        headline: "提出確認",
        status: (
          <>
            <span>{daysLeft > 0 ? `締切まで ${daysLeft} 日` : "締切は今日"}</span>
            <span aria-hidden>・</span>
            <span>必須の未提出</span>
            <Badge tone={missing.count > 0 ? "rose" : "emerald"}>{missing.count}件</Badge>
            {missing.teams.length > 0 && <span>({joinTeamNames(missing.teams)})</span>}
          </>
        ),
        primary: { href: `${base}/submissions`, label: "提出状況を見る" },
        secondary: hub,
      };
    }
    case "prepare": {
      const { orderConfirmed, bookletGenerated, missing } = action;
      const headline =
        !orderConfirmed && !bookletGenerated
          ? "発表順確定・概要集生成"
          : !orderConfirmed
            ? "発表順確定"
            : !bookletGenerated
              ? "概要集生成"
              : "当日の準備がそろいました";
      return {
        headline,
        status:
          missing.count === 0 ? (
            <span>締切を過ぎ、全チームの提出がそろいました。</span>
          ) : (
            <>
              <span>締切を過ぎました・必須の未提出</span>
              <Badge tone="rose">{missing.count}件</Badge>
              <span>({joinTeamNames(missing.teams)})</span>
            </>
          ),
        detail: (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <PrepareRow label="発表順" done={orderConfirmed} doneLabel="確定済み" todoLabel="未確定" />
            <PrepareRow label="概要集" done={bookletGenerated} doneLabel="生成済み" todoLabel="未生成" />
          </ul>
        ),
        primary: { href: base, label: "工程表で進める" },
        secondary: !orderConfirmed
          ? { href: `${base}/timetable/edit`, label: "発表順を編集" }
          : !bookletGenerated
            ? { href: `${base}/summary-booklet`, label: "概要集を開く" }
            : null,
      };
    }
    case "start":
      // 当日に入っても発表は自動では始まらない。先生が SC-07 で「最初の発表を開始」を押す。
      return {
        headline: "当日進行",
        status: (
          <span>
            {action.startTime ? `${action.startTime} 開始予定・` : ""}まだ始まっていません
          </span>
        ),
        primary: { href: `${base}/timetable`, label: "タイムテーブルを開く" },
        secondary: hub,
      };
    case "run": {
      const current = action.presentingTeamId;
      const teamSlots = teamSlotsInOrder(slots);
      const index = teamSlots.findIndex((s) => s.teamId === current);
      const nextId = current ? nextTeamId(slots, current) : null;
      const nextSlot = teamSlots.find((s) => s.teamId === nextId);
      return {
        headline: "当日進行",
        status: current ? (
          <>
            <span>
              {getTeamById(current)?.name} が発表中({index + 1}/{teamSlots.length} 組目)
            </span>
            {nextSlot && (
              <>
                <span aria-hidden>・</span>
                <span>
                  次は {getTeamById(nextSlot.teamId)?.name}({nextSlot.startTime}〜)
                </span>
              </>
            )}
          </>
        ) : (
          <span>いま発表中のチームはありません。</span>
        ),
        primary: { href: `${base}/timetable`, label: "タイムテーブルを開く" },
        secondary: hub,
      };
    }
    case "publish":
      return {
        headline: "資料公開",
        status: <span>全発表が終わりました。</span>,
        primary: { href: base, label: "工程表で公開する" },
        secondary: null,
      };
    case "none":
      return {
        headline: "いまやることはありません",
        status: (
          <>
            <span>この発表会は公開済みです。</span>
            <Badge tone="emerald">公開中</Badge>
          </>
        ),
        primary: null,
        secondary: hub,
      };
  }
}

function PrepareRow({
  label,
  done,
  doneLabel,
  todoLabel,
}: {
  label: string;
  done: boolean;
  doneLabel: string;
  todoLabel: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-700">{label}</span>
      <Badge tone={done ? "emerald" : "slate"}>{done ? doneLabel : todoLabel}</Badge>
    </li>
  );
}
