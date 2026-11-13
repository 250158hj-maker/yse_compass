"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { registerTeacherAction, unregisterTeacherAction, type TeacherActionResult } from "@/lib/actions/teachers";
import { teacherErrorMessage } from "@/lib/teacher-messages";

type Person = { id: number; name: string; email: string };
type Teacher = Person & { isSelf: boolean; canUnregister: boolean };

// 見た目はモックのまま。名簿は DB が持ち、登録・解除は Server Action を呼んで、成功したらサーバー側の表示を読み込み直す。
// 登録・解除がいつから効くかは未決（H-30）なので、文言には書かない。
export function RosterClient({ teachers, candidates }: { teachers: Teacher[]; candidates: Person[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState("");
  const [removing, setRemoving] = useState<Teacher | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "danger"; text: string } | null>(null);

  // 候補から外れた人（登録済みになった等）を選んだままにしない。
  const selected = candidates.find((u) => String(u.id) === selectedId) ?? null;

  function run(action: () => Promise<TeacherActionResult<unknown>>, successText: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setNotice({ tone: "danger", text: teacherErrorMessage(result.code) });
        return;
      }
      setNotice({ tone: "info", text: successText });
      setSelectedId("");
      router.refresh();
    });
  }

  function handleRegister() {
    if (!selected) return;
    run(() => registerTeacherAction(selected.id), `${selected.name}さんを先生として登録しました。`);
  }

  return (
    <>
      {notice && (
        <div className="mt-4">
          <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>
        </div>
      )}

      <section className="mt-8">
        <SectionHeading>先生の一覧</SectionHeading>
        <div className="flex flex-col gap-3">
          {teachers.map((user) => (
            <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3 shadow-sm shadow-slate-900/5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{user.name}</p>
                {user.isSelf && <Badge tone="brand">あなた</Badge>}
              </div>
              {user.canUnregister ? (
                <Button variant="secondary" disabled={pending} onClick={() => setRemoving(user)}>
                  解除
                </Button>
              ) : (
                user.isSelf && <p className="text-xs text-slate-400">自分自身は解除できません</p>
              )}
            </Card>
          ))}
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
                className={`${fieldClassName} w-80 max-w-full`}
                value={selected ? String(selected.id) : ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">選んでください</option>
                {candidates.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}（{user.email}）
                  </option>
                ))}
              </select>
              <Button variant="primary" disabled={!selected || pending} onClick={handleRegister}>
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
          const target = removing;
          run(() => unregisterTeacherAction(target.id), `${target.name}さんの先生の登録を解除しました。`);
        }}
        title="先生の登録を解除しますか?"
        description={removing ? `${removing.name}さんを先生から解除します。` : ""}
        confirmLabel="解除する"
        confirmVariant="danger"
      />
    </>
  );
}
