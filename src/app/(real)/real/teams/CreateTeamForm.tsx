"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { createTeamAction } from "@/lib/actions/teams";
import { useTeamAction } from "./use-team-action";

type YearOption = { id: number; year: number; classes: { id: number; name: string }[] };
type MemberRow = { key: number; name: string; autoFocus?: boolean };

// 先生がチームを作る（#6）。名簿は 1 人ずつ入力（H-40 の先行方針）。リーダーはこのフォームでは指定を必須にする（`decisions.md` 2026-10-20。データ層は省略できる）。
// どの年度のクラスに作るかが見えるように、年度を先頭に置く（H-54 の先行方針に対する水戸さんの条件）。
export function CreateTeamForm({ years, initialYearId }: { years: YearOption[]; initialYearId: number }) {
  const router = useRouter();
  const { run, pending, error } = useTeamAction({ refresh: false });
  const [yearId, setYearId] = useState(initialYearId);
  const year = years.find((y) => y.id === yearId) ?? years[0];
  const [classId, setClassId] = useState<number | null>(year.classes[0]?.id ?? null);
  const [name, setName] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([{ key: 1, name: "" }]);
  const [nextKey, setNextKey] = useState(2);
  const [leaderKey, setLeaderKey] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function changeYear(id: number) {
    setYearId(id);
    setClassId(years.find((y) => y.id === id)?.classes[0]?.id ?? null);
  }

  // 氏名欄の Enter は、送信せず次の行へ移る（最後の行なら行を足して移る）。日本語入力の変換を確定する Enter は、そのままにする。
  function nextRowOnEnter(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (index < members.length - 1) {
      document.getElementById(`member-name-${members[index + 1].key}`)?.focus();
      return;
    }
    if (members[index].name.trim() === "") return;
    setMembers([...members, { key: nextKey, name: "", autoFocus: true }]);
    setNextKey(nextKey + 1);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const filled = members.filter((m) => m.name.trim() !== "");
    if (classId === null) return setFormError("この年度にはクラスがありません。");
    if (name.trim() === "") return setFormError("チーム名を入れてください。");
    if (filled.length === 0) return setFormError("メンバーを 1 人以上入れてください。");
    const leaderIndex = filled.findIndex((m) => m.key === leaderKey);
    if (leaderIndex < 0) return setFormError("リーダーを選んでください。");
    setFormError(null);
    run(
      () => createTeamAction({ classId, name, workTitle, members: filled.map((m) => m.name), leaderIndex }),
      (team) => router.push(`/real/teams/${team.id}`),
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">チームを作る</h2>
      <form onSubmit={submit}>
        <InlineNotice tone="info">
          作成する年度：<strong>{year.year}年度</strong>
          {years.length > 1 && "（下で切り替えられます）"}
        </InlineNotice>
        <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
          <FormField label="年度" htmlFor="year" required>
            <select id="year" className={fieldClassName} value={yearId} onChange={(e) => changeYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}年度
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="クラス" htmlFor="class" required>
            <select
              id="class"
              className={fieldClassName}
              value={classId ?? ""}
              onChange={(e) => setClassId(Number(e.target.value))}
              disabled={year.classes.length === 0}
            >
              {year.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="チーム名" htmlFor="team-name" required>
            <input id="team-name" className={fieldClassName} value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="作品名" htmlFor="work-title" hint="あとから入れても構いません。">
            <input id="work-title" className={fieldClassName} value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} />
          </FormField>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-1 text-sm font-medium text-slate-700">
            メンバー（氏名）<span className="ml-1 text-rose-600">*</span>
          </legend>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={m.key} className="flex items-center gap-2">
                <input
                  id={`member-name-${m.key}`}
                  aria-label={`メンバー ${i + 1} の氏名`}
                  className={fieldClassName}
                  value={m.name}
                  autoFocus={m.autoFocus}
                  onKeyDown={(e) => nextRowOnEnter(e, i)}
                  onChange={(e) => setMembers(members.map((x) => (x.key === m.key ? { ...x, name: e.target.value } : x)))}
                />
                <label className="flex shrink-0 items-center gap-1 text-sm text-slate-600">
                  <input type="radio" name="leader" checked={leaderKey === m.key} onChange={() => setLeaderKey(m.key)} />
                  リーダー
                </label>
                <Button
                  type="button"
                  className="shrink-0 whitespace-nowrap"
                  disabled={members.length === 1}
                  aria-label={`メンバー ${i + 1} の行を消す`}
                  onClick={() => setMembers(members.filter((x) => x.key !== m.key))}
                >
                  この行を消す
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="mt-2"
            onClick={() => {
              setMembers([...members, { key: nextKey, name: "" }]);
              setNextKey(nextKey + 1);
            }}
          >
            メンバーを足す
          </Button>
        </fieldset>

        {(formError ?? error) && <InlineNotice tone="danger">{formError ?? error}</InlineNotice>}
        <div className="mt-4">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "作成中…" : "チームを作る"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
