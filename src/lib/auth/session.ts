import { redirect } from "next/navigation";
import { auth } from "@/auth";

// 本実装の画面（/real 以下）の入口。サインインしていなければ Auth.js のサインインへ送り、終わったら元の画面へ戻す。
// 権限（先生だけが作る・編集する）は、ここでなくデータ層が守る。ここは画面に操作を出すかどうかを決める材料を渡すだけ。
export async function requireSessionUser(returnPath: string) {
  const session = await auth();
  if (!session?.user) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(returnPath)}`);
  return session.user;
}
