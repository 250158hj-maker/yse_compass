"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { fieldClassName } from "@/components/ui/FormField";

// 自由入力のタグ入力。Enter・読点・カンマで確定し、候補はワンクリックで追加できる(候補は固定の語彙ではなく、呼び出し側が渡す)。
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
}) {
  const [text, setText] = useState("");

  function add(raw: string) {
    const tag = raw.trim();
    setText("");
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  const available = suggestions.filter((s) => !value.includes(s));

  return (
    <div>
      <div className={`${fieldClassName} flex flex-wrap items-center gap-1.5`}>
        {value.map((tag) => (
          <Badge key={tag} tone="brand">
            {tag}
            <button
              type="button"
              aria-label={`${tag}を削除`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="ml-1 text-brand-700 hover:text-rose-600"
            >
              ×
            </button>
          </Badge>
        ))}
        <input
          id={id}
          value={text}
          placeholder={value.length === 0 ? "例: Next.js" : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (/[、,]$/.test(v)) add(v.slice(0, -1));
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // 日本語入力の変換確定の Enter では追加しない。
              if (!e.nativeEvent.isComposing) add(text);
            } else if (e.key === "Backspace" && text === "" && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(text)}
          className="min-w-32 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-slate-400 focus:ring-0"
        />
      </div>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span>候補:</span>
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-slate-300 px-2 py-0.5 text-slate-600 hover:border-brand-300 hover:text-brand-700"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
