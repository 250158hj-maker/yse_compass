import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

// 先生の工程の画面(SC-06 提出状況・SC-08 発表順・SC-11 概要集・SC-07 当日の進行)の末尾に置く「次の工程へ」の導線。
// 4 画面で同じ見た目・同じ位置(ページの末尾)にそろえる。見た目は生徒側の画面に寄せる:
// カードは生徒のホームの資料枠のカード、ボタンの並びは主ボタンが左の `flex flex-wrap gap-2`(app/page.tsx)。
// 戻る先(工程表 = 発表会ハブ)は常に副ボタンで出し、進める先があるときだけ主ボタンを出す。

export type NextStepLink = { href: string; label: string };

export function NextStep({
  description,
  next,
  back,
}: {
  description?: ReactNode;
  next?: NextStepLink | null;
  back: NextStepLink;
}) {
  return (
    <section className="mt-8 print:hidden" aria-label="次の工程">
      <Card className="shadow-sm shadow-slate-900/5">
        <SectionHeading>次の工程</SectionHeading>
        {description && <p className="text-sm text-slate-500">{description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {next && (
            <Link href={next.href}>
              <Button variant="primary">{next.label}</Button>
            </Link>
          )}
          <Link href={back.href}>
            <Button variant="secondary">{back.label}</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}

// 工程表(発表会ハブ)へ戻る導線。4 画面で文言をそろえる。
export function backToHub(announcementId: string): NextStepLink {
  return { href: `/announcements/${announcementId}`, label: "← 工程表に戻る" };
}
