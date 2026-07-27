"use client";

import { useState } from "react";

type Role = "先生" | "生徒";

interface UserRow {
  id: string;
  name: string;
  role: Role;
}

/** SC-20 ユーザー・ロール管理。ロールは先生／生徒の単層2値（未決#8：親子二層は採用時に別途拡張）。 */
export function UserRoleTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);

  return (
    <table className="w-full min-w-max border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2 pr-4">氏名</th>
          <th className="py-2 pr-4">ロール</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-gray-100">
            <td className="py-2 pr-4 font-medium text-gray-900">{user.name}</td>
            <td className="py-2 pr-4">
              <select
                value={user.role}
                onChange={(e) =>
                  setUsers((prev) =>
                    prev.map((u) => (u.id === user.id ? { ...u, role: e.target.value as Role } : u))
                  )
                }
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="先生">先生</option>
                <option value="生徒">生徒</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
