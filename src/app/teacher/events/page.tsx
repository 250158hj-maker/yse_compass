import { EventListView } from "@/components/screens/EventListView";
import { CURRENT_YEAR } from "@/lib/constants";

export default function TeacherEventsPage() {
  return <EventListView year={CURRENT_YEAR} basePath="/teacher/events" />;
}
