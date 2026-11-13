"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField, fieldClassName } from "@/components/ui/FormField";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { addMaterialSlotAction, deleteMaterialSlotAction, updateMaterialSlotAction, type SlotActionResult } from "@/lib/actions/slots";
import { fromJstInputValue, toJstInputValue } from "@/lib/jst-datetime";
import { slotErrorMessage } from "@/lib/slot-messages";

export type SlotView = {
  id: number;
  slotType: string;
  isRequired: boolean;
  // 絶対時刻（ISO 文字列）。未設定は null。
  deadlineIso: string | null;
  templateUrl: string | null;
};

// 資料枠 1 件の編集（SC-05）。保存は枠ごと（関数が、追加・更新・削除に分かれているため）。slot が無いときは、新しい枠の追加。
// 値の規則（種類が空でないか・リンクの形・概要の枠の扱い・提出のある枠の削除）は関数が持つ。画面は、結果を日本語にして出すだけ。
export function SlotEditor({ occasionId, slot, onAdded }: { occasionId: number; slot?: SlotView; onAdded?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slotType, setSlotType] = useState(slot?.slotType ?? "");
  const [isRequired, setIsRequired] = useState(slot?.isRequired ?? true);
  const [deadline, setDeadline] = useState(toJstInputValue(slot?.deadlineIso ?? null));
  const [templateUrl, setTemplateUrl] = useState(slot?.templateUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const idPrefix = slot ? `slot-${slot.id}` : "slot-new";

  function run<T>(action: () => Promise<SlotActionResult<T>>, doneText: string, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setDone(null);
        setError(slotErrorMessage(result.code));
        return;
      }
      setError(null);
      setDone(doneText);
      after?.();
      router.refresh();
    });
  }

  function save() {
    const input = { slotType, isRequired, deadline: fromJstInputValue(deadline), templateUrl: templateUrl === "" ? null : templateUrl };
    if (slot) run(() => updateMaterialSlotAction(slot.id, input), "保存しました。");
    else run(() => addMaterialSlotAction(occasionId, input), "追加しました。", onAdded);
  }

  return (
    <Card className="mb-3">
      <FormField label="種類" htmlFor={`${idPrefix}-type`} hint="例：プレゼン資料">
        <input
          id={`${idPrefix}-type`}
          className={fieldClassName}
          value={slotType}
          onChange={(e) => {
            setSlotType(e.target.value);
            setDone(null);
          }}
        />
      </FormField>
      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={(e) => {
            setIsRequired(e.target.checked);
            setDone(null);
          }}
        />
        必須
      </label>
      <FormField label="締切（日本時間）" htmlFor={`${idPrefix}-deadline`} hint="空にすると、締切なしになります。">
        <input
          id={`${idPrefix}-deadline`}
          type="datetime-local"
          className={fieldClassName}
          value={deadline}
          onChange={(e) => {
            setDeadline(e.target.value);
            setDone(null);
          }}
        />
      </FormField>
      <FormField label="テンプレートのリンク" htmlFor={`${idPrefix}-template`} hint="https:// で始まるリンク。空にすると、なしになります。">
        <input
          id={`${idPrefix}-template`}
          className={fieldClassName}
          value={templateUrl}
          onChange={(e) => {
            setTemplateUrl(e.target.value);
            setDone(null);
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
          <InlineNotice tone="info">{done}</InlineNotice>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="primary" disabled={pending} onClick={save}>
          {slot ? "保存" : "追加"}
        </Button>
        {slot && (
          <Button variant="secondary" disabled={pending} onClick={() => setConfirmingDelete(true)}>
            削除
          </Button>
        )}
        {!slot && (
          <Button variant="secondary" disabled={pending} onClick={onAdded}>
            やめる
          </Button>
        )}
      </div>
      {slot && (
        <ConfirmDialog
          open={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => run(() => deleteMaterialSlotAction(slot.id), "削除しました。")}
          title="この資料枠を削除しますか?"
          description="削除すると元に戻せません。すでに提出がある枠と、概要の枠は削除できません。"
          confirmLabel="削除する"
          confirmVariant="danger"
        />
      )}
    </Card>
  );
}
