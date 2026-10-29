import { RoleGate, TeacherOnlyNotice } from "@/components/session/RoleGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl">
      <RoleGate allow={["teacher"]} fallback={<TeacherOnlyNotice />}>
        {children}
      </RoleGate>
    </div>
  );
}
