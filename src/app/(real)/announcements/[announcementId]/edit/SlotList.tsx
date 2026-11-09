"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { SlotEditor, type SlotView } from "./SlotEditor";

// 資料枠の一覧と、追加の入口（SC-05）。追加は、空の枠を 1 つ開いて、保存（追加）すると閉じる。
export function SlotList({ occasionId, slots }: { occasionId: number; slots: SlotView[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div>
      {slots.length === 0 && !adding && (
        <div className="mb-3">
          <InlineNotice tone="info">資料枠がありません。</InlineNotice>
        </div>
      )}
      {slots.map((s) => (
        <SlotEditor key={s.id} occasionId={occasionId} slot={s} />
      ))}
      {adding ? (
        <SlotEditor occasionId={occasionId} onAdded={() => setAdding(false)} />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + 資料枠を追加
        </Button>
      )}
    </div>
  );
}
