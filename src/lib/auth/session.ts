import { redirect } from "next/navigation";
import { auth } from "@/auth";

// 本実装の画面（/real 以下）の入口。サインインしていなければ自前のログイン画面（/login）へ送り、終わったら元の画面へ戻す（Issue #185・H-64）。
// 戻り先（callbackUrl）は、そのまま付ける。整えるのは、サインインの Action（lib/actions/auth.ts・lib/auth/redirect.ts）の側。
// 権限（先生だけが作る・編集する）は、ここでなくデータ層が守る。ここは画面に操作を出すかどうかを決める材料を渡すだけ。
export async function requireSessionUser(returnPath: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(returnPath)}`);
  return session.user;
}
