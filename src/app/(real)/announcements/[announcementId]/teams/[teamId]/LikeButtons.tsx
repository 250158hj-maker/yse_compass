"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCommentLikeAction, setPresentationLikeAction, type CommentActionResult } from "@/lib/actions/comments";
import { commentErrorMessage } from "@/lib/comment-messages";

// いいねのボタン（見た目は components/ui/LikeButton.tsx と同じ）。付け外しは Server Action で保存し、成功したらサーバー側の表示を読み込み直す。
// 押せるかどうかは呼ぶ側（データ層の canLike）が決める。ここでは判定しない。
function useLikeAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(action: () => Promise<CommentActionResult<unknown>>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(commentErrorMessage(result.code));
        return;
      }
      setError(null);
      router.refresh();
    });
  }
  return { run, pending, error };
}

function LikeView({
  liked,
  count,
  canLike,
  pending,
  size,
  onClick,
}: {
  liked: boolean;
  count: number;
  canLike: boolean;
  pending: boolean;
  size: "sm" | "md";
  onClick: () => void;
}) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canLike || pending}
      aria-pressed={liked}
      aria-label={liked ? "いいねを外す" : "いいねする"}
      className={`inline-flex items-center gap-1 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${
        liked ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-500 hover:border-slate-300"
      }`}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}

export function PresentationLikeButton({
  teamId,
  occasionId,
  liked,
  count,
  canLike,
}: {
  teamId: number;
  occasionId: number;
  liked: boolean;
  count: number;
  canLike: boolean;
}) {
  const { run, pending, error } = useLikeAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <LikeView liked={liked} count={count} canLike={canLike} pending={pending} size="md" onClick={() => run(() => setPresentationLikeAction(teamId, occasionId, !liked))} />
      {error && (
        <span role="alert" className="text-xs text-rose-600">
          {error}
        </span>
      )}
    </div>
  );
}

export function CommentLikeButton({ commentId, liked, count, canLike }: { commentId: number; liked: boolean; count: number; canLike: boolean }) {
  const { run, pending, error } = useLikeAction();
  return (
    <>
      <LikeView liked={liked} count={count} canLike={canLike} pending={pending} size="sm" onClick={() => run(() => setCommentLikeAction(commentId, !liked))} />
      {error && (
        <span role="alert" className="text-xs text-rose-600">
          {error}
        </span>
      )}
    </>
  );
}
