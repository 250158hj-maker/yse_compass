"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useCreatedTeams } from "@/context/TeacherDemoContext";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { RoleGate } from "@/components/session/RoleGate";
import { Button } from "@/components/ui/Button";
import { CreateTeamForm } from "@/components/teacher/CreateTeamForm";
import { getCurrentYear, getTeamsByYear, users } from "@/lib/mock";
import { isOwnTeam, isTeacher } from "@/lib/session-helpers";
import type { Team } from "@/lib/types";

function TeamIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      <path d="M14.8 14.3c2.1.4 3.7 2.2 3.7 4.7" />
    </svg>
  );
}

export default function TeamsPage() {
  const { currentUser } = useSession();
  const year = getCurrentYear();
  const created = useCreatedTeams();
  const [formOpen, setFormOpen] = useState(false);
  const [createdNotice, setCreatedNotice] = useState<Team | null>(null);
  const baseTeams = year ? getTeamsByYear(year.id) : [];
  // 先生がこのデモで作ったチームは、先生の一覧にだけ足す(生徒の一覧・ほかの画面には出さない)。
  const teams =
    year && isTeacher(currentUser) ? [...baseTeams, ...created.teams.filter((t) => t.yearId === year.id)] : baseTeams;
  // 選べるクラス: この年度のクラス。モックはクラスを持たないので、この年度のチームと利用者のクラス名から集める。
  const classNames = [
    ...new Set([...baseTeams.map((t) => t.className), ...users.map((u) => u.className).filter((c): c is string => !!c)]),
  ].sort();

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "チーム一覧" }]} />
      <PageHeader
        title="チーム一覧"
        meta={year ? `${year.label}・${teams.length}チーム` : undefined}
        actions={
          <RoleGate allow={["teacher"]}>
            <Button
              variant="primary"
              disabled={!year || formOpen}
              onClick={() => {
                setFormOpen(true);
                setCreatedNotice(null);
              }}
            >
              + チーム作成
            </Button>
          </RoleGate>
        }
      />

      <RoleGate allow={["teacher"]}>
        {year && formOpen && (
          <div className="mt-6">
            <CreateTeamForm
              year={year}
              classNames={classNames}
              existingTeams={teams}
              onCreate={(input) => {
                setCreatedNotice(created.create(input));
                setFormOpen(false);
              }}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        )}
        {createdNotice && (
          <div className="mt-4">
            <InlineNotice tone="info">
              {createdNotice.className} に「{createdNotice.name}」チームを作成しました。{" "}
              <Link href={`/teams/${createdNotice.id}`} className="font-medium underline underline-offset-2">
                {createdNotice.name}の詳細を見る →
              </Link>
            </InlineNotice>
          </div>
        )}
      </RoleGate>

      {teams.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="この年度のチームはまだ登録されていません。" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <CardLink
              key={team.id}
              href={`/teams/${team.id}`}
              className="flex items-start gap-4 shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/20"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <TeamIcon />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{team.className}</Badge>
                  {isOwnTeam(currentUser, team.id) && <Badge tone="brand">自チーム</Badge>}
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">{team.name}</p>
                {team.projectTitle ? (
                  <p className="text-sm text-slate-500">{team.projectTitle}</p>
                ) : (
                  <p className="text-sm text-slate-400">作品名は未設定</p>
                )}
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {team.members.map((member) => (
                    <li key={member} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      {member}
                    </li>
                  ))}
                </ul>
              </div>
            </CardLink>
          ))}
        </div>
      )}
    </div>
  );
}
