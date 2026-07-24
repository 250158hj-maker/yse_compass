import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getEvent, getPublishedMaterials } from "@/lib/mock-data";

export function BrowseEventsView({
  eventId,
  teamHref,
}: {
  eventId: string;
  teamHref: (teamId: string) => string;
}) {
  const event = getEvent(eventId);
  if (!event) notFound();

  const published = getPublishedMaterials(eventId);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">発表資料閲覧</h1>
      <p className="mt-1 text-gray-600">
        {event.phase}発表会で公開された資料を、発表順に一覧できます。
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {published.map(({ team, materials }, index) => (
          <Card key={team.id} accent="teal" className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                {index + 1}
              </span>
              <p className="text-xs text-gray-400">{team.name}</p>
            </div>
            <Link
              href={teamHref(team.id)}
              className="mt-2 block font-semibold text-gray-900 hover:underline"
            >
              {team.workTitle}
            </Link>
            <p className="mt-2 flex-1 text-sm text-gray-600">{team.summary}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {materials.map(({ slot, submission }) => (
                <li key={slot.id}>
                  <a
                    href={submission.linkUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:border-gray-500 hover:bg-gray-50"
                  >
                    {slot.kind}を見る ↗
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ))}
        {published.length === 0 && (
          <p className="text-gray-500">まだ公開されている資料はありません。</p>
        )}
      </div>
    </div>
  );
}
