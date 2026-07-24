import { Card } from "@/components/ui/Card";
import { templates } from "@/lib/mock-data";

export default function StudentTemplatesPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">テンプレート</h1>
      <p className="mt-1 text-gray-600">
        資料提出の前に、最新のテンプレートをダウンロードしてご利用ください。
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} accent="teal" className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">{template.name}</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 ring-1 ring-inset ring-gray-300">
                {template.kind}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm text-gray-600">{template.description}</p>
            <p className="mt-1 text-xs text-gray-400">最終更新: {template.updatedAt}</p>
            <a
              href={template.fileUrl}
              download
              className="mt-3 inline-block rounded-full bg-brand-teal px-4 py-1.5 text-center text-xs font-semibold text-white hover:opacity-90"
            >
              ダウンロード
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
