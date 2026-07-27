import { EventListView } from "@/components/screens/EventListView";
import { CURRENT_YEAR } from "@/lib/constants";

export default function StudentEventsPage() {
  return <EventListView year={CURRENT_YEAR} basePath="/student/events" />;
}
