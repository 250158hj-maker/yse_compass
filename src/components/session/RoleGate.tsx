"use client";

import type { ReactNode } from "react";
import { useSession } from "@/context/SessionContext";
import type { Role } from "@/lib/types";

// ロールは「先生/生徒」の2値のみで判定する。S1(発表側)/S2(聴講側)の出し分けは
// ここでは扱わない(自チームか否かの文脈判定であり、lib/session-helpers.ts の isOwnTeam を使う)。
export function RoleGate({
  allow,
  fallback = null,
  children,
}: {
  allow: Role[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { currentUser } = useSession();
  if (!currentUser || !allow.includes(currentUser.role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

export function TeacherOnlyNotice() {
  return (
    <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
      この操作は先生のみ行えます。
    </p>
  );
}
