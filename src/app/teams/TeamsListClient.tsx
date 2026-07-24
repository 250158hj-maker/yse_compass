"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { announcements, teams, type SubmissionStatus } from "@/lib/mock-data";

const submissionStatuses: SubmissionStatus[] = ["未提出", "提出済み", "差し戻し"];
const classNames = Array.from(new Set(teams.map((t) => t.className)));

const statusStyle: Record<SubmissionStatus, string> = {
  未提出: "bg-slate-100 text-slate-500",
  提出済み: "bg-emerald-100 text-emerald-700",
  差し戻し: "bg-rose-100 text-rose-600",
};

export default function TeamsListClient() {
  const searchParams = useSearchParams();
  const initialAnnouncement = searchParams.get("announcement") ?? "all";

  const [announcementFilter, setAnnouncementFilter] = useState(initialAnnouncement);
  const [statusFilter, setStatusFilter] = useState<Set<SubmissionStatus>>(new Set());
  const [classFilter, setClassFilter] = useState<Set<string>>(new Set());

  function toggleStatus(status: SubmissionStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleClass(className: string) {
    setClassFilter((prev) => {
      const next = new Set(prev);
      if (next.has(className)) next.delete(className);
      else next.add(className);
      return next;
    });
  }

  function clearFilters() {
    setAnnouncementFilter("all");
    setStatusFilter(new Set());
    setClassFilter(new Set());
  }

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (announcementFilter !== "all" && team.announcementId !== announcementFilter) {
        return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(team.submissionStatus)) {
        return false;
      }
      if (classFilter.size > 0 && !classFilter.has(team.className)) {
        return false;
      }
      return true;
    });
  }, [announcementFilter, statusFilter, classFilter]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">チーム・作品一覧</h1>
      <p className="mt-1 text-sm text-slate-500">
        発表会ごとのチームと作品を、提出状況やクラスで絞り込んで確認できます。
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-px text-sm font-medium">
        <button
          type="button"
          onClick={() => setAnnouncementFilter("all")}
          className={`whitespace-nowrap border-b-2 px-3 py-2 ${
            announcementFilter === "all"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          すべて
        </button>
        {announcements.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAnnouncementFilter(a.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 ${
              announcementFilter === a.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {a.phase}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-400">結果 {filteredTeams.length} 件</p>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-slate-400 hover:text-slate-700"
          >
            フィルターをクリア
          </button>

          <div className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              提出状況
            </h2>
            <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600">
              {submissionStatuses.map((status) => (
                <label key={status} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilter.has(status)}
                    onChange={() => toggleStatus(status)}
                    className="rounded border-slate-300"
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              クラス
            </h2>
            <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600">
              {classNames.map((className) => (
                <label key={className} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={classFilter.has(className)}
                    onChange={() => toggleClass(className)}
                    className="rounded border-slate-300"
                  />
                  {className}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {filteredTeams.length === 0 && (
            <p className="text-sm text-slate-400">条件に一致するチームがありません。</p>
          )}

          {filteredTeams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{team.className}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyle[team.submissionStatus]}`}
                >
                  {team.submissionStatus}
                </span>
              </div>

              <h3 className="mt-3 text-base font-bold text-slate-900">{team.projectTitle}</h3>
              <p className="mt-1 text-sm text-slate-500">{team.name}</p>

              <p className="mt-3 line-clamp-2 text-sm text-slate-500">{team.summary}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>メンバー {team.members.length}名</span>
                <span>♡ {team.likeCount}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
