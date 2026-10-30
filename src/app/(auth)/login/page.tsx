import { Card } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { loginErrorMessage } from "@/lib/auth-messages";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { PersonaLogin } from "./PersonaLogin";

// 対応: docs/design/04-screen.md SC-01（ログイン）／docs/requirements.md §3-6。Issue #184（モックの画面を本番仕様にする）・#185（自前のログイン画面）。
// 見た目はモックのまま、「Google でログイン」を動くようにし、サインインが断られたとき（/login?error=<コード>）の案内を出す。
// 画面で権限や戻り先の判定をしない：戻り先（callbackUrl）は、URL に付いてきたものを、判断せずに Action へ渡す。
// すでにサインインしている人が開いたときも、そのまま表示する（ホームへ送る判定は、画面に書かない）。
// モックの人物ログイン（PersonaLogin）は、置き換えの間も残す（#184）。

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-7 w-7",
} as const;

function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = first(params.callbackUrl) ?? null;
  const errorMessage = loginErrorMessage(first(params.error));

  return (
    <div className="mx-auto max-w-3xl py-12">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CompassIcon />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">YSE Compass</h1>
        <p className="mt-2 text-sm text-slate-500">学校 Google アカウントでログインします。</p>
      </div>

      <Card className="mx-auto mt-8 max-w-md text-center shadow-sm shadow-slate-900/5">
        {errorMessage && (
          <div className="mb-3 text-left">
            <InlineNotice tone="warning">{errorMessage}</InlineNotice>
          </div>
        )}
        <GoogleSignInButton callbackUrl={callbackUrl} />
      </Card>

      <PersonaLogin />
    </div>
  );
}
