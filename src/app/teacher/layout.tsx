import { RoleShell } from "@/components/layout/RoleShell";
import { getCurrentTeacherId } from "@/lib/current-teacher";
import { getTeacher } from "@/lib/mock-data";

const navItems = [
  { href: "/teacher", label: "ホーム", exact: true },
  { href: "/teacher/events", label: "発表会一覧" },
  { href: "/teacher/teams", label: "チーム一覧" },
  { href: "/teacher/templates", label: "テンプレート配布" },
  { href: "/teacher/archive", label: "アーカイブ" },
  { href: "/teacher/year-management", label: "年度管理" },
  { href: "/teacher/users", label: "ユーザー・ロール管理" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const currentTeacherId = await getCurrentTeacherId();
  const teacher = getTeacher(currentTeacherId)!;

  return (
    <RoleShell roleLabel="先生" accent="blue" userName={teacher.name} navItems={navItems}>
      {children}
    </RoleShell>
  );
}
