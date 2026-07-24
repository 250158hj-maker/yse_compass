import { RoleShell } from "@/components/layout/RoleShell";
import { getCurrentTeacherId } from "@/lib/current-teacher";
import { getTeacher } from "@/lib/mock-data";

const navItems = [
  { href: "/teacher/events", label: "発表会・資料枠管理" },
  { href: "/teacher/teams", label: "チーム・メンバー管理" },
  { href: "/teacher/templates", label: "テンプレート配布" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const currentTeacherId = await getCurrentTeacherId();
  const teacher = getTeacher(currentTeacherId)!;
  const parent = teacher.parentId ? getTeacher(teacher.parentId) : undefined;

  const tag = teacher.tier === "主任" ? "主任" : parent ? `担当（${parent.name}の下）` : "担当";

  return (
    <RoleShell roleLabel="先生" accent="blue" tag={tag} userName={teacher.name} navItems={navItems}>
      {children}
    </RoleShell>
  );
}
