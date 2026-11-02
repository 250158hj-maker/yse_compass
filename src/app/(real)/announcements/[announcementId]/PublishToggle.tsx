"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { setOccasionPublishedAction } from "@/lib/actions/slots";
import { slotErrorMessage } from "@/lib/slot-messages";

// 発表会の公開・公開解除（先生）。先生の明示操作で、確認のダイアログを経由する（ConfirmDialog の注記のとおり）。
// 切り替えは Server Action に任せ、成功したら画面を読み込み直す。画面では公開の可否を判定しない。
export function PublishToggle({ occasionId, isPublished }: { occasionId: number; isPublished: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function toggle() {
    startTransition(async () => {
      const result = await setOccasionPublishedAction(occasionId, !isPublished);
      if (!result.ok) {
        setError(slotErrorMessage(result.code));
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant={isPublished ? "secondary" : "primary"} disabled={pending} onClick={() => setConfirming(true)}>
        {isPublished ? "公開を解除する" : "公開する"}
      </Button>
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={toggle}
        title={isPublished ? "公開を解除しますか?" : "発表会を公開しますか?"}
        description={
          isPublished
            ? "公開を解除すると、聴く生徒からは資料が見えなくなります。"
            : "発表会単位で資料が一括公開され、聴く生徒が閲覧できるようになります。"
        }
        confirmLabel={isPublished ? "公開を解除する" : "公開する"}
        confirmVariant={isPublished ? "danger" : "primary"}
      />
    </div>
  );
}
