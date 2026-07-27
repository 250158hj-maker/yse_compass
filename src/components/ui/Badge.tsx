import type { AnnouncementPhase, CommentLabel, PublishPermissionStatus, SubmissionStatus } from "@/lib/types";

const toneClasses = {
  brand: "bg-brand-100 text-brand-700",
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
} as const;

export type BadgeTone = keyof typeof toneClasses;

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

// 発表会の回種別(固定4種)。参考サイト(Google Cloud)のカテゴリ表示に倣い、
// 塗りバッジではなく小さな色ドット+素のテキストで区別する。
const phaseDotClasses: Record<AnnouncementPhase, string> = {
  企画: "bg-brand-600",
  設計: "bg-cyan-600",
  試作: "bg-amber-600",
  最終: "bg-teal-600",
};

export function PhaseBadge({ phase }: { phase: AnnouncementPhase }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span className={`h-2 w-2 rounded-full ${phaseDotClasses[phase]}`} />
      {phase}
    </span>
  );
}

// 提出状態は「未提出／提出済み」の2値。遅延は別バッジで重ねて表現し、3値には見せない。
export const statusTone: Record<SubmissionStatus, BadgeTone> = {
  未提出: "slate",
  提出済み: "emerald",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>;
}

export function LateBadge() {
  return <Badge tone="rose">遅延</Badge>;
}

// コメントラベルは参考サイトのフィルターチップに倣い、枠線のみの控えめな表示にする。
export function CommentLabelBadge({ label }: { label: CommentLabel }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
      {label}
    </span>
  );
}

export const publishPermissionTone: Record<PublishPermissionStatus, BadgeTone> = {
  未設定: "slate",
  許可: "emerald",
  拒否: "rose",
};

export function PublishPermissionBadge({ status }: { status: PublishPermissionStatus }) {
  return <Badge tone={publishPermissionTone[status]}>{status}</Badge>;
}
