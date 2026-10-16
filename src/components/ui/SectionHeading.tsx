import type { ReactNode } from "react";

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-500">{children}</h2>
      {action}
    </div>
  );
}
