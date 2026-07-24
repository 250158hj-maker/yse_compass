"use client";

import { useState } from "react";
import { PublishedBadge } from "@/components/ui/Badge";
import type { MaterialSlot, Submission, Team } from "@/lib/mock-data";

interface Row {
  team: Team;
  slot: MaterialSlot;
  submission: Submission;
}

export function PublishTable({ rows }: { rows: Row[] }) {
  const [publishedIds, setPublishedIds] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.submission.published).map((r) => r.submission.id))
  );

  function toggle(id: string) {
    setPublishedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <table className="w-full min-w-max border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2 pr-4">チーム</th>
          <th className="py-2 pr-4">資料種類</th>
          <th className="py-2 pr-4">リンク</th>
          <th className="py-2 pr-4">公開状態</th>
          <th className="py-2 pr-4"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ team, slot, submission }) => {
          const published = publishedIds.has(submission.id);
          return (
            <tr key={submission.id} className="border-b border-gray-100">
              <td className="py-3 pr-4 font-medium text-gray-900">{team.name}</td>
              <td className="py-3 pr-4">{slot.kind}</td>
              <td className="py-3 pr-4 text-blue-600">
                <a href={submission.linkUrl ?? "#"} target="_blank" rel="noreferrer" className="hover:underline">
                  資料を開く ↗
                </a>
              </td>
              <td className="py-3 pr-4">
                <PublishedBadge published={published} />
              </td>
              <td className="py-3 pr-4">
                <button
                  type="button"
                  onClick={() => toggle(submission.id)}
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs hover:border-gray-500"
                >
                  {published ? "非公開にする" : "公開する"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
