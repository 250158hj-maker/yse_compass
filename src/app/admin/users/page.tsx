"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { fieldClassName } from "@/components/ui/FormField";
import { roleLabels, type AppUser, type Role } from "@/lib/types";
import { getTeamById, users as initialUsers } from "@/lib/mock";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);

  function setRole(userId: string, role: Role) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "ユーザー管理" }]} />
      <PageHeader title="ユーザー管理" meta="ロールは先生/生徒の2値です" />

      <div className="mt-4">
        <InlineNotice tone="info">
          先生ロールの親子二層構造は要件定義で検討中です。現状はロールを先生/生徒の単層で管理します。
        </InlineNotice>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {users.map((user) => {
          const team = user.teamId ? getTeamById(user.teamId) : null;
          return (
            <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">
                  {[user.className, team ? `${team.name}チーム` : null].filter(Boolean).join(" / ") || "所属チームなし"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={user.role === "teacher" ? "brand" : "slate"}>{roleLabels[user.role]}</Badge>
                <select
                  className={`${fieldClassName} w-32`}
                  value={user.role}
                  onChange={(e) => setRole(user.id, e.target.value as Role)}
                >
                  <option value="teacher">先生</option>
                  <option value="student">生徒</option>
                </select>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
