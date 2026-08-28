import { PersonaSwitcher } from "@/components/session/PersonaSwitcher";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">YSE Compass</h1>
        <p className="mt-2 text-sm text-slate-500">
          学校 Google アカウントでログインします(モックのため、下から利用者を選択してください)。
        </p>
      </div>
      <div className="mt-8">
        <PersonaSwitcher layout="chooser" />
      </div>
    </div>
  );
}
