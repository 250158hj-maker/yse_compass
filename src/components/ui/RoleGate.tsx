"use client";

import { useRole } from "@/context/RoleContext";
import type { Role } from "@/lib/types";

export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { role } = useRole();
  if (!allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}

export function RoleRestrictedNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="mt-2 text-xs text-slate-400">
        右上のロール切替で表示ロールを変更できます(モック用の疑似ログインです)。
      </p>
    </div>
  );
}

export function TeacherOnlyNotice() {
  return <RoleRestrictedNotice message="この画面は先生のみ閲覧できます。" />;
}
