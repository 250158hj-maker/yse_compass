import type {
  AnnouncementPhase,
  CommentLabel,
  PublishPermissionStatus,
  SubmissionStatus,
} from "@/lib/types";

export type BadgeTone = "brand" | "slate" | "emerald" | "rose" | "amber";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
};

export function Badge({ tone = "slate", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const phaseDotColor: Record<AnnouncementPhase, string> = {
  企画: "bg-brand-600",
  設計: "bg-cyan-600",
  試作: "bg-amber-600",
  最終: "bg-teal-600",
};

export function PhaseBadge({ phase }: { phase: AnnouncementPhase }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      <span className={`h-2 w-2 rounded-full ${phaseDotColor[phase]}`} aria-hidden />
      {phase}
    </span>
  );
}

// 提出状態は「未提出/提出済み」の2値のみを表す。遅延は別要素(LateBadge)として重ねる。
export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return <Badge tone={status === "提出済み" ? "emerald" : "slate"}>{status}</Badge>;
}

// 遅延は第3の状態ではなく導出表示。StatusBadgeとは独立した任意要素として使う(要件定義書 §3-2)。
export function LateBadge() {
  return <Badge tone="rose">遅延</Badge>;
}

const commentLabelTone: Record<CommentLabel, BadgeTone> = {
  感想: "brand",
  批評: "amber",
  その他: "slate",
};

export function CommentLabelBadge({ label }: { label: CommentLabel }) {
  return <Badge tone={commentLabelTone[label]}>{label}</Badge>;
}

const publishPermissionTone: Record<PublishPermissionStatus, BadgeTone> = {
  未設定: "slate",
  許可: "emerald",
  拒否: "rose",
};

export function PublishPermissionBadge({ status }: { status: PublishPermissionStatus }) {
  return <Badge tone={publishPermissionTone[status]}>{status}</Badge>;
}
