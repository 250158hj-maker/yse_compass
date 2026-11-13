"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { updateOccasionDateAction } from "@/lib/actions/slots";
import { slotErrorMessage } from "@/lib/slot-messages";

// 開催日の編集（SC-05）。"YYYY-MM-DD" の文字列で保存する（関数の受け取り方）。空にすると未定に戻る。値の確かめは関数が行う。
export function OccasionDateForm({ occasionId, initial }: { occasionId: number; initial: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function save() {
    startTransition(async () => {
      const result = await updateOccasionDateAction(occasionId, value === "" ? null : value);
      if (!result.ok) {
        setDone(false);
        setError(slotErrorMessage(result.code));
        return;
      }
      setError(null);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div>
      <FormField label="開催日" htmlFor="occasion-date" hint="空にすると、未定になります。">
        <input
          id="occasion-date"
          type="date"
          className={fieldClassName}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDone(false);
          }}
        />
      </FormField>
      {error && (
        <div className="mb-3">
          <InlineNotice tone="danger">{error}</InlineNotice>
        </div>
      )}
      {done && !error && (
        <div className="mb-3">
          <InlineNotice tone="info">保存しました。</InlineNotice>
        </div>
      )}
      <Button variant="primary" disabled={pending} onClick={save}>
        日程を保存
      </Button>
    </div>
  );
}
