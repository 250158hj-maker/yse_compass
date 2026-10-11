"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fieldClassName } from "@/components/ui/FormField";
import { useSession } from "@/context/SessionContext";
import { useTeacherRoster } from "@/context/TeacherDemoContext";
import type { AppUser } from "@/lib/types";

// SC-20 先生の登録・解除(先生のみ。admin/layout.tsx の RoleGate で生徒には出さない)。
// 正典: decisions.md 2026-09-06(H-11 決着)・04-screen.md SC-20。ロールは先生/生徒の単層。
export default function TeacherRosterPage() {
  const { currentUser } = useSession();
  const { teachers, candidates, canUnregister, register, unregister } = useTeacherRoster();
  const [selectedId, setSelectedId] = useState("");
  const [removing, setRemoving] = useState<AppUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 候補から外れた人(登録済みになった等)を選んだままにしない。
  const selected = candidates.find((u) => u.id === selectedId) ?? null;

  function handleRegister() {
    if (!selected) return;
    register(selected.id);
    setSelectedId("");
    setNotice(`${selected.name}さんを先生として登録しました。`);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "先生の登録・解除" }]} />
      <PageHeader title="先生の登録・解除" meta={`先生 ${teachers.length}名`} />

      <div className="mt-4">
        <InlineNotice tone="info">
          先生として登録された人だけが、先生の画面を使えます。登録されていない人は、サインインすると生徒になります。
        </InlineNotice>
      </div>

      {notice && (
        <div className="mt-4">
          <InlineNotice tone="info">{notice}</InlineNotice>
        </div>
      )}

      <section className="mt-8">
        <SectionHeading>先生の一覧</SectionHeading>
        <div className="flex flex-col gap-3">
          {teachers.map((user) => {
            const isSelf = user.id === currentUser?.id;
            return (
              <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3 shadow-sm shadow-slate-900/5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  {isSelf && <Badge tone="brand">あなた</Badge>}
                </div>
                {canUnregister(user.id) ? (
                  <Button variant="secondary" onClick={() => setRemoving(user)}>
                    解除
                  </Button>
                ) : (
                  isSelf && <p className="text-xs text-slate-400">自分自身は解除できません</p>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading>先生として登録</SectionHeading>
        <Card className="shadow-sm shadow-slate-900/5">
          <p className="mb-3 text-sm text-slate-500">一度サインインした人だけを、先生として登録できます。</p>
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-500">登録できる人はいません。</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="register-user" className="sr-only">
                先生として登録する人
              </label>
              <select
                id="register-user"
                className={`${fieldClassName} w-64`}
                value={selected?.id ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">選んでください</option>
                {candidates.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.className ? `${user.name}(${user.className})` : user.name}
                  </option>
                ))}
              </select>
              <Button variant="primary" disabled={!selected} onClick={handleRegister}>
                先生として登録
              </Button>
            </div>
          )}
        </Card>
      </section>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          unregister(removing.id);
          setNotice(`${removing.name}さんの先生の登録を解除しました。`);
        }}
        title="先生の登録を解除しますか?"
        description={
          removing
            ? `${removing.name}さんは先生の画面を使えなくなり、次にサインインしたときから生徒になります。`
            : ""
        }
        confirmLabel="解除する"
        confirmVariant="danger"
      />
    </div>
  );
}
