"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, PhaseBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";
import { getSubmission, getTeamsByYear, getTimetableFor } from "@/lib/mock";
import type { Announcement, Submission, Team } from "@/lib/types";

export function SummaryBookletClient({ announcement: a }: { announcement: Announcement }) {
  const teams = getTeamsByYear(a.yearId);
  const timetable = getTimetableFor(a.id);

  const orderedTeams: Team[] = timetable
    ? [...timetable.slots]
        .filter((s): s is Extract<typeof s, { isBreak: false }> => !s.isBreak)
        .sort((x, y) => x.order - y.order)
        .map((s) => teams.find((t) => t.id === s.teamId))
        .filter((t): t is Team => Boolean(t))
    : teams;

  const entries = orderedTeams.map((team) => ({ team, submission: getSubmission(a.id, team.id) }));
  const missing = entries.filter((e) => !e.submission?.summary);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generated, setGenerated] = useState<{ team: Team; submission: Submission }[] | null>(null);

  function generate() {
    setGenerated(
      entries
        .filter((e): e is { team: Team; submission: Submission } => Boolean(e.submission?.summary))
        .map((e) => e)
    );
  }

  function handleGenerateClick() {
    if (missing.length > 0) {
      setConfirmOpen(true);
    } else {
      generate();
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
          <PageHeader eyebrow={a.title} title="概要集生成・プレビュー" meta={<PhaseBadge phase={a.phase} />} />

          <div className="mt-4 flex flex-col gap-3">
            {missing.length > 0 && (
              <InlineNotice tone="warning">
                {missing.length}チームが概要未提出です({missing.map((e) => e.team.name).join("、")})。
                生成する場合はスキップされます。
              </InlineNotice>
            )}
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleGenerateClick}>
                概要集を生成する
              </Button>
              {generated && (
                <Button variant="secondary" onClick={() => window.print()}>
                  印刷する
                </Button>
              )}
            </div>
          </div>
        </div>

        {generated && (
          <div className="mt-8 flex flex-col gap-8">
            {generated.map(({ team, submission }) => (
              <div
                key={team.id}
                style={{ pageBreakAfter: "always" }}
                className="rounded-lg border border-slate-200 bg-white p-8 print:border-none print:p-0"
              >
                <p className="text-xs font-medium text-brand-600">{team.className}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{team.projectTitle}</h2>
                <p className="text-sm text-slate-500">{team.name}・{team.members.join("、")}</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">背景・動機</p>
                    <p className="mt-1 text-sm text-slate-700">{submission.summary!.background}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">使用技術</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {submission.summary!.techUsed.map((tech) => (
                        <Badge key={tech} tone="brand">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-400">概要</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{submission.summary!.onePageBody}</p>
                </div>

                <div className="mt-4 flex justify-between text-sm text-slate-600">
                  <p>起: {submission.summary!.opening}</p>
                </div>
                <div className="mt-1 text-sm text-slate-600">結: {submission.summary!.closing}</div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={generate}
          title="未提出チームがあります"
          description={`${missing.map((e) => e.team.name).join("、")} は概要が未提出です。スキップして概要集を生成しますか?`}
          confirmLabel="スキップして生成する"
        />
      </div>
    </RoleGate>
  );
}
