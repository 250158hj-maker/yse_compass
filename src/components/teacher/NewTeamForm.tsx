"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

export function NewTeamForm() {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [added, setAdded] = useState<{ name: string; summary: string }[]>([]);

  return (
    <Card>
      <h3 className="font-semibold text-gray-900">チームを新規作成</h3>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name) return;
          setAdded((prev) => [...prev, { name, summary }]);
          setName("");
          setSummary("");
        }}
      >
        <input
          type="text"
          required
          placeholder="チーム名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="作品概要"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-cyan"
        >
          作成する
        </button>
      </form>
      {added.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {added.map((team, i) => (
            <li key={i}>作成済み（未保存）: {team.name}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
