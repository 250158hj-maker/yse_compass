"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useDemoClock } from "@/context/DemoClockContext";
import { useBooklet, usePublish, useTimetable } from "@/context/TeacherDemoContext";
import { getTeamById, getTeamsByYear } from "@/lib/mock";
import { countMissingRequired, teamSlotsInOrder } from "@/lib/demo/teacher-derived";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatJstShort, joinTeamNames } from "@/components/teacher/teacher-format";
import type { Announcement } from "@/lib/types";

// ハブ(SC-04)の先生の部分。発表会の仕事を時期の順に 6 つの工程として並べる。
// - どの工程も押せる(ロックしない)。いまの時期に当たる工程を強調し、済んだ工程に ✓ を付ける。
// - 済み・いまの判定は、時期(useTimetable の period)・発表順の確定(orderConfirmed)・概要集の生成(generatedAt)・
//   公開(isPublished)・必須の未提出(countMissingRequired)から導く。新しい状態は持たない。

type Step = {
  no: number;
  name: string;
  description: string;
  summary: ReactNode;
  done: boolean;
  current: boolean;
  action: ReactNode;
};

export function WorkflowSteps({ announcement: a }: { announcement: Announcement }) {
  const { nowMs } = useDemoClock();
  const timetable = useTimetable(a.id);
  const booklet = useBooklet(a.id);
  const { isPublished, setPublished } = usePublish(a.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const base = `/announcements/${a.id}`;
  const {
    period,
    orderConfirmed,
    confirmedAt,
    currentPresentingTeamId,
    presentationsStarted,
    presentationsFinished,
    slots,
  } = timetable;
  const teams = getTeamsByYear(a.yearId);
  const missing = countMissingRequired(a, teams, nowMs);
  const teamCount = teamSlotsInOrder(slots).length;
  const firstStart = teamSlotsInOrder(slots)[0]?.startTime ?? null;

  const done = {
    setup: a.materialSlots.length > 0,
    collect: period !== "受付中" && missing.count === 0,
    order: orderConfirmed,
    booklet: !!booklet.generatedAt,
    run: period === "終了" || presentationsFinished,
    publish: isPublished,
  };

  // いまの時期に当たる工程(済んでいないものだけ強調する)。
  const currentKeys = new Set<keyof typeof done>();
  if (period === "受付中") currentKeys.add("collect");
  if (period === "締切後") {
    if (missing.count > 0) currentKeys.add("collect");
    if (!done.order) currentKeys.add("order");
    if (!done.booklet) currentKeys.add("booklet");
    if (done.order && done.booklet) currentKeys.add("run");
  }
  if (period === "当日") {
    currentKeys.add("run");
    // 公開は、先生が当日の発表を開始してから(開始前は ⑤ だけを強調する)。
    if (presentationsStarted) currentKeys.add("publish");
  }
  if (period === "終了") currentKeys.add("publish");
  const isCurrent = (key: keyof typeof done) => currentKeys.has(key) && !done[key];

  const linkButton = (key: keyof typeof done, href: string, label: string) => (
    <Link href={href}>
      <Button variant={isCurrent(key) ? "primary" : "secondary"}>{label}</Button>
    </Link>
  );

  const presentingName = currentPresentingTeamId ? getTeamById(currentPresentingTeamId)?.name : null;

  const steps: Step[] = [
    {
      no: 1,
      name: "発表会を整える",
      description: "日程・資料枠・締切を決める",
      // SC-04 の【T のみ】資料枠の一覧(種類・必須/任意)をここに畳む。テンプレートへの導線は SC-04 から外してある(H-34)。
      summary: a.materialSlots.map((slot) => (
        <span key={slot.id} className="flex items-center gap-1">
          <span>{slot.name}</span>
          <Badge tone={slot.required ? "rose" : "slate"}>{slot.required ? "必須" : "任意"}</Badge>
        </span>
      )),
      done: done.setup,
      current: false,
      action: linkButton("setup", `${base}/edit`, "発表会を編集"),
    },
    {
      no: 2,
      name: "提出を確認する",
      description: "締切までに必須の資料がそろったかを見る",
      summary:
        missing.count === 0 ? (
          <Badge tone="emerald">全チーム提出済み</Badge>
        ) : (
          <>
            <span>必須の未提出</span>
            <Badge tone="rose">{missing.count}件</Badge>
            <span className="text-xs text-slate-400">{joinTeamNames(missing.teams)}</span>
          </>
        ),
      done: done.collect,
      current: isCurrent("collect"),
      action: linkButton("collect", `${base}/submissions`, "提出状況を見る"),
    },
    {
      no: 3,
      name: "発表順を確定する",
      description: "タイムテーブルの順番を決めて保存する",
      summary: orderConfirmed ? (
        <>
          <Badge tone="emerald">確定済み</Badge>
          {confirmedAt && <span className="text-xs text-slate-400">{formatJstShort(confirmedAt)}</span>}
        </>
      ) : (
        <Badge tone="slate">未確定</Badge>
      ),
      done: done.order,
      current: isCurrent("order"),
      action: linkButton("order", `${base}/timetable/edit`, "発表順を編集"),
    },
    {
      no: 4,
      name: "概要集を作る",
      description: "確定した発表順で概要集を生成する",
      summary: booklet.generatedAt ? (
        <>
          <Badge tone="emerald">生成済み</Badge>
          <span className="text-xs text-slate-400">
            {booklet.entries.length}チーム・{formatJstShort(booklet.generatedAt)}
          </span>
        </>
      ) : (
        <>
          <Badge tone="slate">未生成</Badge>
          <span className="text-xs text-slate-400">
            概要の提出 {booklet.entries.length}/{teamCount}チーム
          </span>
        </>
      ),
      done: done.booklet,
      current: isCurrent("booklet"),
      action: linkButton("booklet", `${base}/summary-booklet`, "概要集を開く"),
    },
    {
      no: 5,
      name: "当日の進行",
      description: "発表中のチームを順に進める",
      summary:
        period === "当日" && presentationsStarted ? (
          presentationsFinished ? (
            <Badge tone="emerald">全発表が終了</Badge>
          ) : presentingName ? (
            <>
              <Badge tone="rose">発表中</Badge>
              <span>いま発表中：{presentingName}</span>
            </>
          ) : (
            <Badge tone="slate">発表中のチームなし</Badge>
          )
        ) : period === "終了" ? (
          <Badge tone="emerald">終了</Badge>
        ) : (
          // 締切後・当日(先生が開始する前)。当日に入っても、発表は先生が SC-07 で開始するまで始まらない。
          <>
            <Badge tone="slate">開始前</Badge>
            {firstStart && (
              <span className="text-xs text-slate-400">
                {period === "当日" ? `${firstStart} 開始予定` : `当日 ${firstStart}〜`}
              </span>
            )}
          </>
        ),
      done: done.run,
      current: isCurrent("run"),
      action: linkButton("run", `${base}/timetable`, "進行画面へ"),
    },
    {
      no: 6,
      name: "公開する",
      description: "聴く生徒が資料を閲覧できるようにする",
      summary: <Badge tone={isPublished ? "emerald" : "slate"}>{isPublished ? "公開中" : "非公開"}</Badge>,
      done: done.publish,
      current: isCurrent("publish"),
      action: (
        <Button variant={isCurrent("publish") ? "primary" : "secondary"} onClick={() => setConfirmOpen(true)}>
          {isPublished ? "公開を解除する" : "公開する"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <ol className="flex flex-col gap-2">
        {steps.map((step) => (
          <StepRow key={step.no} step={step} />
        ))}
      </ol>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setPublished(!isPublished)}
        title={isPublished ? "公開を解除しますか?" : "発表会を公開しますか?"}
        description={
          isPublished
            ? "公開を解除すると、聴く生徒からは資料が見えなくなります。"
            : "発表会単位で資料が一括公開され、聴く生徒が閲覧できるようになります。"
        }
        confirmLabel={isPublished ? "公開を解除する" : "公開する"}
        confirmVariant={isPublished ? "danger" : "primary"}
      />
    </>
  );
}

function StepRow({ step }: { step: Step }) {
  return (
    <li
      aria-current={step.current ? "step" : undefined}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-3 py-2 ${
        step.current ? "bg-brand-50 ring-1 ring-brand-200" : "bg-slate-50"
      }`}
    >
      <StepMarker no={step.no} done={step.done} current={step.current} />
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-sm font-semibold text-slate-900">{step.name}</span>
        {step.current && <Badge tone="brand">いまここ</Badge>}
        <span className="text-xs text-slate-500">{step.description}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 sm:w-80">{step.summary}</div>
      <div className="flex shrink-0 sm:w-36 sm:justify-end">{step.action}</div>
    </li>
  );
}

function StepMarker({ no, done, current }: { no: number; done: boolean; current: boolean }) {
  if (done) {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
        aria-label={`工程 ${no}・済み`}
      >
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
          <path d="M3 7.5l2.5 2.5L11 4.5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        current ? "bg-brand-600 text-white" : "border border-slate-300 bg-white text-slate-500"
      }`}
      aria-label={`工程 ${no}`}
    >
      {no}
    </span>
  );
}
