import Link from "next/link";
import { Badge, LateBadge, PhaseBadge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MaterialLink } from "@/components/ui/MaterialLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { TeamOccasionStatus } from "@/lib/data/team-occasions";
import { formatDateTime, formatOccasionDate } from "@/lib/format";
import type { AnnouncementPhase } from "@/lib/types";
import { isValidUrl } from "@/lib/url";

// 対応: docs/design/04-screen.md SC-14「4 発表会分の提出状況と発表詳細への導線（チーム軸の縦断ビュー）」。
// 提出状況を出すか出さないかは、関数（listTeamOccasionStatuses）が決める。submissions が null の行は、提出状況を出さない行（他チームの生徒。decisions.md 2026-11-19）。
// 画面では、役割を見ない・必須の未提出を数えない・遅延を判定しない。関数が返した値をそのまま写す（SC-06 と同じ書き方）。
// 含めない: 公開許可の設定パネル（12/18 の範囲外・H-44）、提出・概要入力のボタン（04 の SC-14 に記述が無い。入口は発表詳細から）。
export function OccasionStatusSection({ teamId, occasions }: { teamId: number; occasions: TeamOccasionStatus[] }) {
  const showsStatus = occasions.some((o) => o.submissions !== null);
  return (
    <Card>
      <SectionHeading>{showsStatus ? "発表会ごとの提出状況" : "発表会"}</SectionHeading>
      {occasions.length === 0 ? (
        <EmptyState message={showsStatus ? "発表会がまだ登録されていません。" : "公開済みの発表会はまだありません。"} />
      ) : (
        <ul className="space-y-3">
          {occasions.map((o) => (
            <li key={o.id} className="rounded-lg border border-slate-200 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <PhaseBadge phase={o.kind as AnnouncementPhase} />
                <span className="font-medium text-slate-900">{o.kind}発表会</span>
                <span className="text-sm text-slate-500">{o.eventDate ? formatOccasionDate(o.eventDate) : "未定"}</span>
                {o.submissions && !o.isPublished && <Badge tone="slate">公開前</Badge>}
                <div className="ml-auto flex items-center gap-2">
                  {o.submissions &&
                    (o.submissions.requiredMissing.kind === "no_required_slots" ? (
                      <span className="text-sm text-slate-500">必須の資料枠が無い</span>
                    ) : (
                      <Badge tone={o.submissions.requiredMissing.total > 0 ? "rose" : "emerald"}>
                        必須の未提出 {o.submissions.requiredMissing.total}件
                      </Badge>
                    ))}
                </div>
              </div>
              {o.submissions && o.submissions.slots.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {o.submissions.slots.map((slot) => (
                    <li key={slot.slotId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <span className={`w-40 shrink-0 ${slot.isRequiredMissing ? "font-medium text-rose-700" : "text-slate-700"}`}>
                        {slot.slotType}
                        <span className="ml-1 text-xs text-slate-400">{slot.isRequired ? "(必須)" : "(任意)"}</span>
                      </span>
                      {slot.status === "missing" ? (
                        <StatusBadge status="未提出" />
                      ) : (
                        <>
                          <span className="flex items-center gap-1">
                            <StatusBadge status="提出済み" />
                            {slot.isLate && <LateBadge />}
                          </span>
                          {slot.url && isValidUrl(slot.url) && (
                            <MaterialLink href={slot.url} className="text-xs text-brand-600 hover:underline">
                              資料を開く
                            </MaterialLink>
                          )}
                          <span className="text-xs text-slate-400">
                            {formatDateTime(slot.firstSubmittedAt.toISOString())}
                            {slot.showLastUpdated && `(最終更新 ${formatDateTime(slot.lastSubmittedAt.toISOString())})`}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <Link href={`/announcements/${o.id}/teams/${teamId}`} className="text-sm font-medium text-brand-600 hover:underline">
                  発表詳細へ →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
