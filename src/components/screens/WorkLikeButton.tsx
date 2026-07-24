"use client";

import { useState } from "react";

export function WorkLikeButton({ initialLikes }: { initialLikes: number }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);

  return (
    <button
      type="button"
      onClick={() => {
        setLiked((prev) => !prev);
        setLikes((prev) => prev + (liked ? -1 : 1));
      }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
        liked
          ? "border-pink-300 bg-pink-50 text-pink-600"
          : "border-gray-300 text-gray-700 hover:border-pink-300 hover:text-pink-600"
      }`}
    >
      この発表にいいね {likes}
    </button>
  );
}
