import Link from "next/link";
import type { Team } from "@/lib/types";

// ハブ(SC-04)の「発表一覧」の中身。各チーム → 発表詳細(SC-12)。
// 聴く生徒の画面(全ロールに共通する土台)のマークアップを AnnouncementHubClient から切り出したもので、
// 生徒のハブと先生のハブが同じものを呼ぶ。生徒の描画(区間 B・C)を変えないため、クラスと構造は切り出す前のまま。
export function AnnouncementTeamList({ announcementId, teams }: { announcementId: string; teams: Team[] }) {
  return (
    <div className="flex flex-col gap-2">
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/announcements/${announcementId}/teams/${team.id}`}
          className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300"
        >
          {team.name}({team.projectTitle})
        </Link>
      ))}
    </div>
  );
}
