import type { ReactNode } from "react";

type Tone = "info" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  info: "border-brand-200 bg-brand-50 text-brand-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

export function InlineNotice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClasses[tone]}`}>{children}</div>
  );
}
