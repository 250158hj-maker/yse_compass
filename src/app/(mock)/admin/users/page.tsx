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
import { users } from "@/lib/mock";
import type { AppUser } from "@/lib/types";

// SC-20 先生の登録・解除(先生のみ。admin/layout.tsx の RoleGate で生徒には出さない)。
// 正典: decisions.md 2026-09-06(H-11 決着)・04-screen.md SC-20。ロールは先生/生徒の単層。
// 名簿の状態は、この画面の中で持つ(デモ用の時刻の仕組み〔TeacherDemoContext〕と localStorage に依らない。水戸さんの決定案 #274 の ⑨)。
// 画面を開き直すと、モックの初期値(users のロール)に戻る。
// - 先生の追加はこの画面だけ。登録できるのは一度サインインした利用者だけ(H-26 の先行方針「初回サインイン後の昇格のみ」)。
//   モックでは users のうち、いま先生でない人が候補。メールを入力して事前登録する手段は持たない。
// - 自分自身は解除できない。これでホワイトリストは空にならないので、「最後の 1 人か」を判定する分岐は持たない(04-screen.md SC-20「できないこと」)。
// - ログイン中のロール(SessionContext のペルソナ)は変えない。ここで先生に上げた生徒でログインしても生徒のまま。
const BASE_TEACHER_IDS = users.filter((u) => u.role === "teacher").map((u) => u.id);

export default function TeacherRosterPage() {
  const { currentUser } = useSession();
  // 先生として登録されている利用者の id(登録順)。
  const [ids, setIds] = useState(BASE_TEACHER_IDS);
  const teachers = ids.map((id) => users.find((u) => u.id === id)).filter((u): u is AppUser => !!u);
  // 先生として登録できる利用者(サインイン済みで、いま先生でない人)。
  const candidates = users.filter((u) => !ids.includes(u.id));
  // 解除できるか(自分自身は解除できない)。
  const canUnregister = (userId: string) => userId !== currentUser?.id && ids.includes(userId);
  const register = (userId: string) =>
    setIds((prev) => (prev.includes(userId) || !users.some((u) => u.id === userId) ? prev : [...prev, userId]));
  const unregister = (userId: string) => {
    if (!canUnregister(userId)) return;
    setIds((prev) => prev.filter((id) => id !== userId));
  };
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
        // 解除がセッションへ反映されるタイミングは未決(H-30)なので、いつから生徒になるかは書かない。
        description={removing ? `${removing.name}さんを先生から解除します。` : ""}
        confirmLabel="解除する"
        confirmVariant="danger"
      />
    </div>
  );
}
