"use client";

import { useState } from "react";

export function LikeButton({
  initialCount,
  size = "md",
}: {
  initialCount: number;
  size?: "sm" | "md";
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);

  function toggle() {
    setLiked((prev) => !prev);
    setCount((prev) => (liked ? prev - 1 : prev + 1));
  }

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1 rounded-full border transition ${sizeClass} ${
        liked
          ? "border-rose-300 bg-rose-50 text-rose-600"
          : "border-slate-200 text-slate-500 hover:border-slate-300"
      }`}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
