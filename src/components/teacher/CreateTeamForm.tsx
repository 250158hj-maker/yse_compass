"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  normalizeMembers,
  validateNewTeam,
  type NewTeamDraft,
  type NewTeamErrors,
  type NewTeamInput,
} from "@/lib/demo/team-create";
import type { Team, Year } from "@/lib/types";

// SC-13 のチーム作成フォーム(先生)。入力欄は正典にある属性だけ(lib/demo/team-create.ts の冒頭)。
// メールアドレス・発表番号・作品の説明の欄は置かない。
export function CreateTeamForm({
  year,
  classNames,
  existingTeams,
  onCreate,
  onCancel,
}: {
  year: Year;
  // 選べるクラス(この年度のもの)。
  classNames: string[];
  // 同じ年度のチーム(チーム名の重複を調べる)。
  existingTeams: Team[];
  onCreate: (input: NewTeamInput) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<NewTeamDraft>({
    name: "",
    className: "",
    members: [""],
    leaderName: "",
    projectTitle: "",
  });
  // 「作成する」を押すまではエラーを出さない。押したあとは入力に合わせて出し直す。
  const [submitted, setSubmitted] = useState(false);
  const errors: NewTeamErrors = submitted ? validateNewTeam(draft, existingTeams) : {};
  const members = normalizeMembers(draft.members);
  // メンバーから消えた人をリーダーに選んだままにしない。
  const leaderName = members.includes(draft.leaderName) ? draft.leaderName : "";

  function set<K extends keyof NewTeamDraft>(key: K, value: NewTeamDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setMember(index: number, value: string) {
    set(
      "members",
      draft.members.map((m, i) => (i === index ? value : m)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const next = { ...draft, leaderName };
    if (Object.keys(validateNewTeam(next, existingTeams)).length > 0) return;
    onCreate({
      yearId: year.id,
      name: next.name.trim(),
      className: next.className,
      members,
      leaderName,
      projectTitle: next.projectTitle.trim(),
    });
  }

  return (
    <Card className="max-w-2xl shadow-sm shadow-slate-900/5">
      <SectionHeading>チームを作成</SectionHeading>
      <form onSubmit={handleSubmit} noValidate>
        <FormField label="チーム名" htmlFor="team-name" required error={errors.name} hint="同じクラスの中で重ならない名前にします。">
          <input
            id="team-name"
            className={fieldClassName}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="例: Cheers"
          />
        </FormField>

        <FormField
          label="クラス"
          htmlFor="team-class"
          required
          error={errors.className}
          hint={`年度はクラスの年度(${year.label})になります。`}
        >
          <select
            id="team-class"
            className={`${fieldClassName} w-48`}
            value={draft.className}
            onChange={(e) => set("className", e.target.value)}
          >
            <option value="">選んでください</option>
            {classNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        <div className="mb-4">
          <p id="team-members-label" className="mb-1 block text-sm font-medium text-slate-700">
            メンバーの氏名
            <span className="ml-1 text-rose-600">*</span>
          </p>
          <ul className="flex flex-col gap-2" aria-labelledby="team-members-label">
            {draft.members.map((member, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  aria-label={`メンバー ${index + 1} の氏名`}
                  className={fieldClassName}
                  value={member}
                  onChange={(e) => setMember(index, e.target.value)}
                  placeholder="例: 水戸匠"
                />
                {draft.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "members",
                        draft.members.filter((_, i) => i !== index),
                      )
                    }
                    className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
                  >
                    削除
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => set("members", [...draft.members, ""])}
            className="mt-2 text-sm text-brand-600 hover:underline"
          >
            + メンバーを追加
          </button>
          {errors.members ? (
            <p className="mt-1 text-xs text-rose-600">{errors.members}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">氏名で登録します(メールアドレスは使いません)。</p>
          )}
        </div>

        <FormField label="リーダー" htmlFor="team-leader" required error={errors.leaderName} hint="メンバーから 1 名選びます。">
          <select
            id="team-leader"
            className={`${fieldClassName} w-48`}
            value={leaderName}
            onChange={(e) => set("leaderName", e.target.value)}
            disabled={members.length === 0}
          >
            <option value="">選んでください</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="作品名(任意)" htmlFor="team-project" hint="空のままでも作れます。">
          <input
            id="team-project"
            className={fieldClassName}
            value={draft.projectTitle}
            onChange={(e) => set("projectTitle", e.target.value)}
            placeholder="例: YSE Compass"
          />
        </FormField>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit" variant="primary">
            作成する
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
        </div>
      </form>
    </Card>
  );
}
