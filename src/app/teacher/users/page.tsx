import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { UserRoleTable } from "@/components/teacher/UserRoleTable";
import { students, teachers } from "@/lib/mock-data";

export default function UserRoleManagementPage() {
  const users = [
    ...teachers.map((t) => ({ id: t.id, name: t.name, role: "先生" as const })),
    ...students.map((s) => ({ id: s.id, name: s.name, role: "生徒" as const })),
  ];

  return (
    <div>
      <BackLink href="/teacher" label="ホームに戻る" />
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">ユーザー・ロール管理</h1>
      <p className="mt-1 text-gray-600">
        ユーザー一覧とロール付与（先生／生徒）です。要件本文が TODO のため、根拠が最も薄い画面です。
      </p>

      <Card className="mt-6 overflow-x-auto">
        <UserRoleTable initialUsers={users} />
      </Card>
    </div>
  );
}
