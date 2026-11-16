import type { TeacherActionResult } from "@/lib/actions/teachers";

type Code = Extract<TeacherActionResult<unknown>, { ok: false }>["code"];

// 先生の登録・解除（SC-20）の失敗を、画面に出す日本語にする。コードの種類は lib/data/teachers.ts の TeacherErrorCode と Action の unauthenticated。
const messages: Record<Code, string> = {
  unauthenticated: "サインインが切れています。もう一度サインインしてください。",
  forbidden: "この操作は先生だけができます。",
  invalid_input: "操作の内容を確かめられませんでした。画面を読み込み直してください。",
  user_not_found: "その人が見つかりません。画面を読み込み直してください。",
  self_unregister: "自分自身は解除できません。",
};

export function teacherErrorMessage(code: Code): string {
  return messages[code];
}
