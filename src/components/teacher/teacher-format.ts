import type { BadgeTone } from "@/components/ui/Badge";
import type { AnnouncementPeriod } from "@/lib/demo/teacher-derived";

// 先生のホーム・ハブで共有する、表示だけの小さな補助。導出(時期・提出の判定)は lib/demo/teacher-derived.ts が持つ。

// 時期のバッジの色。既存の Badge の tone から選ぶ(新しい色は足さない)。
export const PERIOD_TONE: Record<AnnouncementPeriod, BadgeTone> = {
  受付中: "brand",
  締切後: "amber",
  当日: "rose",
  終了: "slate",
};

const shortDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// 「10/15 12:30」。デモ用の時刻で記録した日時(確定・生成)を短く出す。
export function formatJstShort(iso: string): string {
  return shortDateTimeFormatter.format(new Date(iso));
}

// チーム名を「Nova・Lumen」のように並べる。
export function joinTeamNames(teams: { name: string }[]): string {
  return teams.map((t) => t.name).join("・");
}
