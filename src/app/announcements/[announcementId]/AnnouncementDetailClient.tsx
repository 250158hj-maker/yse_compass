"use client";

import { useState } from "react";
import Link from "next/link";
import { useRole } from "@/context/RoleContext";
import { RoleGate } from "@/components/ui/RoleGate";
import { LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_PRESENTER_TEAM_ID, getSubmission, isLateSubmission } from "@/lib/mock";
import type { Announcement, MaterialSlot, Team, Template } from "@/lib/types";

export default function AnnouncementDetailClient({
  announcement,
  teams,
  slotsWithTemplate,
}: {
  announcement: Announcement;
  teams: Team[];
  slotsWithTemplate: { slot: MaterialSlot; template: Template | null }[];
}) {
  const { role } = useRole();
  const [isPublished, setIsPublished] = useState(announcement.isPublished);

  const ownSubmission = getSubmission(announcement.id, MOCK_PRESENTER_TEAM_ID);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <PhaseBadge phase={announcement.phase} />
        <h1 className="text-2xl font-bold text-slate-900">{announcement.title}</h1>
        <span className="text-xs text-slate-400">{announcement.status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        開催日：{announcement.period} ／ 提出締切：{announcement.submissionDeadline} ／{" "}
        {isPublished ? "資料公開中" : "資料非公開"}
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link href={`/announcements/${announcement.id}/timetable`} className="text-brand-600 hover:underline">
          タイムテーブルを見る
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500">資料枠</h2>
        <div className="mt-3 flex flex-col gap-2">
          {slotsWithTemplate.map(({ slot, template }) => (
            <div key={slot.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <span className="text-sm font-medium text-slate-800">
                {slot.name}
                {slot.required && <span className="ml-1 text-xs text-rose-500">必須</span>}
              </span>
              {template ? (
                <a
                  href={template.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  テンプレートを開く
                </a>
              ) : (
                <span className="text-xs text-slate-300">テンプレなし</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <RoleGate allow={["presenter"]}>
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500">自チームの提出状況(Cheers)</h2>
          <div className="mt-3 flex flex-col gap-2">
            {ownSubmission?.materials.map((m) => {
              const late = isLateSubmission(m.updatedAt, announcement.submissionDeadline);
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                  <span>{m.name}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    {late && <LateBadge />}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link
              href={`/announcements/${announcement.id}/teams/${MOCK_PRESENTER_TEAM_ID}/submit`}
              className="text-brand-600 hover:underline"
            >
              資料提出フォームへ
            </Link>
            <Link
              href={`/announcements/${announcement.id}/teams/${MOCK_PRESENTER_TEAM_ID}/summary`}
              className="text-brand-600 hover:underline"
            >
              概要入力フォームへ
            </Link>
          </div>
        </section>
      </RoleGate>

      {(isPublished || role === "teacher") && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500">発表チーム一覧</h2>
          {!isPublished && (
            <p className="mt-1 text-xs text-amber-600">非公開のため聴く生徒には表示されません(先生プレビュー)</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/announcements/${announcement.id}/teams/${team.id}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-brand-300"
              >
                <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                <p className="text-xs text-slate-500">{team.projectTitle}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <RoleGate allow={["teacher"]}>
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-500">運営操作(先生)</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPublished((v) => !v)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                isPublished ? "bg-slate-500 hover:bg-slate-600" : "bg-brand-600 hover:bg-brand-700"
              }`}
            >
              {isPublished ? "公開を解除する" : "資料を一括公開する"}
            </button>
            <Link href={`/announcements/${announcement.id}/submissions`} className="text-sm text-brand-600 hover:underline">
              提出状況一覧へ
            </Link>
            <Link href={`/announcements/${announcement.id}/edit`} className="text-sm text-brand-600 hover:underline">
              発表会編集へ
            </Link>
            <Link href={`/announcements/${announcement.id}/summary-booklet`} className="text-sm text-brand-600 hover:underline">
              概要集生成へ
            </Link>
            <Link href={`/announcements/${announcement.id}/timetable/edit`} className="text-sm text-brand-600 hover:underline">
              タイムテーブル編集へ
            </Link>
          </div>
        </section>
      </RoleGate>

      {role !== "teacher" && !isPublished && teams.length > 0 && (
        <p className="mt-6 text-xs text-slate-400">
          ※ この発表会の資料はまだ公開されていません。公開されると発表チーム一覧が表示されます。
        </p>
      )}
    </div>
  );
}
