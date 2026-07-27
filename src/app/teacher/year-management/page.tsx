import { YearManagementPanel } from "@/components/teacher/YearManagementPanel";
import { getYears } from "@/lib/mock-data";

export default function YearManagementPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">年度管理</h1>
      <p className="mt-1 text-gray-600">
        年度の一括セットアップとアーカイブ移行を行います。時刻・条件による自動遷移はありません。
      </p>
      <div className="mt-6">
        <YearManagementPanel initialYears={getYears()} />
      </div>
    </div>
  );
}
