import { RoleShell, type RoleNavItem } from "@/components/layout/RoleShell";
import { getMyTeam, getStudent } from "@/lib/mock-data";
import { getCurrentStudentId } from "@/lib/current-user";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const currentStudentId = await getCurrentStudentId();
  const student = getStudent(currentStudentId)!;
  const myTeam = getMyTeam(currentStudentId);

  const navItems: RoleNavItem[] = myTeam
    ? [
        { href: "/student", label: "マイプロジェクト", exact: true },
        { href: "/student/submissions", label: "資料提出" },
        { href: "/student/templates", label: "テンプレート" },
        { href: "/student/browse/ev-2", label: "他チームの発表を見る" },
        { href: "/student/timetable/ev-2", label: "タイムテーブル" },
        { href: "/student/archive", label: "過去の作品を検索" },
      ]
    : [
        { href: "/student", label: "発表資料を見る", exact: true },
        { href: "/student/timetable/ev-2", label: "タイムテーブル" },
        { href: "/student/archive", label: "過去の作品を検索" },
      ];

  return (
    <RoleShell
      roleLabel="生徒"
      accent={myTeam ? "teal" : "orange"}
      tag={myTeam ? `${myTeam.name} 所属` : "チーム未所属"}
      userName={student.name}
      navItems={navItems}
    >
      {children}
    </RoleShell>
  );
}
