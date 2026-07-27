import { RoleShell, type RoleNavItem } from "@/components/layout/RoleShell";
import { getMyTeam, getStudent } from "@/lib/mock-data";
import { getCurrentStudentId } from "@/lib/current-user";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const currentStudentId = await getCurrentStudentId();
  const student = getStudent(currentStudentId)!;
  const myTeam = getMyTeam(currentStudentId);

  const navItems: RoleNavItem[] = myTeam
    ? [
        { href: "/student", label: "ホーム", exact: true },
        { href: "/student/events", label: "発表会一覧" },
        { href: "/student/teams", label: "チーム" },
        { href: "/student/templates", label: "テンプレート" },
        { href: "/student/archive", label: "過去の作品を検索" },
      ]
    : [
        { href: "/student", label: "ホーム", exact: true },
        { href: "/student/events", label: "発表会一覧" },
        { href: "/student/teams", label: "チーム" },
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
