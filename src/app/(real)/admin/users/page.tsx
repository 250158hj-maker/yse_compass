import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSessionUser } from "@/lib/auth/session";
import { TeacherError, listTeacherRoster } from "@/lib/data/teachers";
import { prisma } from "@/lib/prisma";
import { RosterClient } from "./RosterClient";

// 対応: docs/design/04-screen.md SC-20（先生の登録・解除・T 専用）／docs/requirements.md §3-6。Issue #184（モックの画面を本番仕様にする）。
// 見た目はモックのまま（先生の一覧・解除・「先生として登録」）、データは data 層（listTeacherRoster）、ユーザーは requireSessionUser から読む。
// 先生だけが使える（関数が先生以外を拒む）。拒否されたときは、案内だけを出す。画面で権限の判定をしない。
// 「あなた」の印と解除できるか（自分自身は解除できない）は、関数が返す isSelf・canUnregister で決める。画面は ID を比べない。
// 登録の候補は、一度サインインして users の行がある、いま先生でない人（H-26 の先行方針「初回サインイン後の昇格のみ」）。モックにあったクラス名は、関数が返さないので出さない（氏名とメールアドレスで見分ける）。
// 登録・解除がいつから効くかは未決（H-30）なので、画面には書かない。
export default async function AdminUsersPage() {
  const user = await requireSessionUser("/admin/users");
  const actor = { userId: user.id, role: user.role };
  let roster;
  try {
    roster = await listTeacherRoster(prisma, actor);
  } catch (e) {
    if (e instanceof TeacherError && e.code === "forbidden") {
      return (
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "先生の登録・解除" }]} />
          <PageHeader title="先生の登録・解除" />
          <div className="mt-6">
            <InlineNotice tone="warning">先生の登録・解除は、先生だけが使えます。</InlineNotice>
          </div>
        </div>
      );
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "先生の登録・解除" }]} />
      <PageHeader title="先生の登録・解除" meta={`先生 ${roster.teachers.length}名`} />
      <RosterClient teachers={roster.teachers} candidates={roster.candidates} />
    </div>
  );
}
