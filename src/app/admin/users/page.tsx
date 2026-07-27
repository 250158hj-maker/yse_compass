"use client";

import { useState } from "react";
import { RoleGate, TeacherOnlyNotice } from "@/components/ui/RoleGate";
import { getUsers } from "@/lib/mock";
import type { AppUser } from "@/lib/types";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AppUser[]>(getUsers());

  function updateRole(id: string, role: AppUser["role"]) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  return (
    <RoleGate allow={["teacher"]} fallback={<div className="mx-auto max-w-6xl px-6 py-16"><TeacherOnlyNotice /></div>}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">ユーザー・ロール管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          ロールは「先生／生徒」の2値です(先生ロールの親子二層構造は未決事項のため単層で表示)。
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-400">{user.className ?? "-"}</p>
              </div>
              <select
                value={user.role}
                onChange={(e) => updateRole(user.id, e.target.value as AppUser["role"])}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="teacher">先生</option>
                <option value="student">生徒</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
