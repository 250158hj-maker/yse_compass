"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { SummaryBookletEntry } from "@/lib/mock-data";

interface EditableFields {
  background: string;
  proposal: string;
  outlook: string;
}

const emptyFields: EditableFields = { background: "", proposal: "", outlook: "" };

export function GaiyoshuComposer({ entries }: { entries: SummaryBookletEntry[] }) {
  const [fieldsByTeam, setFieldsByTeam] = useState<Record<string, EditableFields>>(() => {
    const initial: Record<string, EditableFields> = {};
    for (const entry of entries) {
      initial[entry.team.id] = entry.content
        ? { background: entry.content.background, proposal: entry.content.proposal, outlook: entry.content.outlook }
        : { ...emptyFields };
    }
    return initial;
  });

  function updateField(teamId: string, field: keyof EditableFields, value: string) {
    setFieldsByTeam((prev) => ({ ...prev, [teamId]: { ...prev[teamId], [field]: value } }));
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const fields = fieldsByTeam[entry.team.id];
        const isFormatted = Boolean(fields.background.trim() && fields.proposal.trim() && fields.outlook.trim());

        return (
          <Card key={entry.team.id} className="break-inside-avoid">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{entry.team.workTitle}</h3>
                  <p className="text-xs text-gray-400">{entry.team.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isFormatted ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 print:hidden">
                    テンプレート適用済み
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 ring-1 ring-inset ring-gray-300 print:hidden">
                    未整形
                  </span>
                )}
                {entry.submission?.linkUrl && (
                  <a
                    href={entry.submission.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:border-gray-500 hover:bg-gray-50 print:hidden"
                  >
                    元の提出資料 ↗
                  </a>
                )}
              </div>
            </div>

            {!entry.submission?.linkUrl && !isFormatted && (
              <p className="mt-2 text-sm text-gray-400">概要書がまだ提出されていません。</p>
            )}

            <div className="mt-3 grid gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">背景・課題</label>
                <textarea
                  value={fields.background}
                  onChange={(e) => updateField(entry.team.id, "background", e.target.value)}
                  rows={2}
                  placeholder="元の提出資料を確認しながら、背景・課題をここにまとめてください"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none print:border-none print:p-0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">提案・解決策</label>
                <textarea
                  value={fields.proposal}
                  onChange={(e) => updateField(entry.team.id, "proposal", e.target.value)}
                  rows={2}
                  placeholder="提案・解決策をここにまとめてください"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none print:border-none print:p-0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">今後の展望</label>
                <textarea
                  value={fields.outlook}
                  onChange={(e) => updateField(entry.team.id, "outlook", e.target.value)}
                  rows={2}
                  placeholder="今後の展望をここにまとめてください"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none print:border-none print:p-0"
                />
              </div>
            </div>
          </Card>
        );
      })}
      {entries.length === 0 && <p className="text-gray-500">対象となるチームがまだ登録されていません。</p>}
    </div>
  );
}
