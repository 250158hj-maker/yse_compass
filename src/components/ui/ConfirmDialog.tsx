"use client";

import { Modal } from "@/components/ui/Modal";
import { Button, type ButtonVariant } from "@/components/ui/Button";

// 「先生の明示操作」原則の対象となる状態遷移(公開/公開解除/年度開始/年度アーカイブ等)は
// すべてこのダイアログを経由させ、取り返しのつく操作ではないことを視覚的に強調する。
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "実行する",
  confirmVariant = "primary",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm text-slate-600">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          variant={confirmVariant}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
