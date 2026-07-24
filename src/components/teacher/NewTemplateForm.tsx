"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { FileDropzone } from "@/components/student/FileDropzone";
import type { Template } from "@/lib/mock-data";

export function NewTemplateForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Template["kind"]>("概要集");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [added, setAdded] = useState<{ name: string; kind: Template["kind"]; fileName: string }[]>([]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
      >
        ＋ テンプレートを追加
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">テンプレートを追加</h3>
        <button type="button" onClick={() => setIsOpen(false)} className="text-sm text-gray-400 hover:text-gray-600">
          閉じる
        </button>
      </div>
      <form
        className="mt-3 grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !file) return;
          setAdded((prev) => [...prev, { name: name.trim(), kind, fileName: file.name }]);
          setName("");
          setDescription("");
          setFile(null);
        }}
      >
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            required
            placeholder="テンプレート名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Template["kind"])}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="概要集">概要集</option>
            <option value="発表資料">発表資料</option>
            <option value="その他">その他</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="説明（任意）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
        <FileDropzone onFileSelected={setFile} />
        {file && <p className="text-xs text-brand-teal">選択中のファイル: {file.name}</p>}
        <button
          type="submit"
          className="mt-1 w-fit rounded-full bg-brand-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-cyan"
        >
          追加する
        </button>
      </form>
      {added.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {added.map((t, i) => (
            <li key={i}>
              追加済み（未保存）: {t.name}（{t.kind}）/ {t.fileName}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
