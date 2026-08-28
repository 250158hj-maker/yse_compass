import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { PhaseBadge, Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { getCurrentYear, getAnnouncementsByYear, getTeamsByYear, getSubmission } from "@/lib/mock";

export default function AnnouncementsPage() {
  const year = getCurrentYear();
  const announcements = year ? getAnnouncementsByYear(year.id) : [];
  const teams = year ? getTeamsByYear(year.id) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "発表会一覧" }]} />
      <PageHeader title="発表会一覧" meta={year?.label} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {announcements.map((a) => {
          const submittedCount = teams.filter((team) => {
            const submission = getSubmission(a.id, team.id);
            const required = a.materialSlots.filter((s) => s.required);
            return (
              submission &&
              required.every((slot) => submission.materials.find((m) => m.name === slot.name)?.status === "提出済み")
            );
          }).length;

          return (
            <CardLink key={a.id} href={`/announcements/${a.id}`}>
              <div className="flex items-center justify-between">
                <PhaseBadge phase={a.phase} />
                <Badge tone={a.isPublished ? "emerald" : "slate"}>
                  {a.isPublished ? "公開中" : "非公開"}
                </Badge>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{a.title}</p>
              <p className="mt-1 text-sm text-slate-500">開催日 {formatDate(a.period)}</p>
              <p className="mt-1 text-xs text-slate-400">
                締切 {formatDate(a.submissionDeadline)}・提出完了 {submittedCount}/{teams.length} チーム
              </p>
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
