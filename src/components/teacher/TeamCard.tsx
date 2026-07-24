"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Team, TeamMember } from "@/lib/mock-data";

interface EditableTeamFields {
  name: string;
  workTitle: string;
  summary: string;
}

export function TeamCard({ team, initialMembers }: { team: Team; initialMembers: TeamMember[] }) {
  const [deleted, setDeleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<EditableTeamFields>({
    name: team.name,
    workTitle: team.workTitle,
    summary: team.summary,
  });

  const [members, setMembers] = useState(initialMembers);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"リーダー" | "メンバー">("メンバー");

  if (deleted) return null;

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setIsEditing(false);
  }

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setMembers((prev) => [
      ...prev,
      { id: `mem-new-${prev.length + 1}-${Date.now()}`, teamId: team.id, name: newMemberName.trim(), role: newMemberRole },
    ]);
    setNewMemberName("");
    setNewMemberRole("メンバー");
    setIsAddingMember(false);
  }

  function handleDeleteMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <Card accent="blue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {isEditing ? (
          <form
            id={`team-edit-${team.id}`}
            onSubmit={handleSaveEdit}
            className="grid flex-1 gap-2"
          >
            <input
              autoFocus
              value={fields.name}
              onChange={(e) => setFields({ ...fields, name: e.target.value })}
              placeholder="チーム名"
              className="rounded-md border border-gray-300 px-2 py-1 text-sm font-bold focus:border-gray-500 focus:outline-none"
            />
            <input
              value={fields.workTitle}
              onChange={(e) => setFields({ ...fields, workTitle: e.target.value })}
              placeholder="作品名"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-gray-500 focus:outline-none"
            />
            <textarea
              value={fields.summary}
              onChange={(e) => setFields({ ...fields, summary: e.target.value })}
              placeholder="作品概要"
              rows={2}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
            />
          </form>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-gray-900">{fields.name}</h2>
            <p className="text-xs font-medium text-gray-400">{fields.workTitle}</p>
            <p className="mt-1 text-sm text-gray-600">{fields.summary}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                type="submit"
                form={`team-edit-${team.id}`}
                className="rounded-full bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-cyan"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFields({ name: team.name, workTitle: team.workTitle, summary: team.summary });
                }}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400"
              >
                キャンセル
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/teacher/teams/${team.id}`}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand-blue hover:text-brand-blue"
              >
                作品ページを見る
              </Link>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand-blue hover:text-brand-blue"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`${fields.name}を削除しますか？`)) setDeleted(true);
                }}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-400"
              >
                削除
              </button>
            </>
          )}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-gray-600"
          >
            <span>
              {m.name}（{m.role}）
            </span>
            <button
              type="button"
              onClick={() => handleDeleteMember(m.id)}
              aria-label={`${m.name}を削除`}
              className="text-xs text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </li>
        ))}
        {members.length === 0 && <li className="text-gray-400">メンバー未割り当て</li>}
      </ul>

      {isAddingMember ? (
        <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={handleAddMember}>
          <input
            type="text"
            required
            placeholder="生徒名"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
          />
          <select
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as "リーダー" | "メンバー")}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="メンバー">メンバー</option>
            <option value="リーダー">リーダー</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-white hover:bg-brand-cyan"
          >
            追加する
          </button>
          <button
            type="button"
            onClick={() => setIsAddingMember(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            閉じる
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingMember(true)}
          className="mt-2 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          ＋ メンバーを追加
        </button>
      )}
    </Card>
  );
}
