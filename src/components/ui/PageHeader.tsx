import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  meta,
  actions,
}: {
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-medium text-slate-400">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
