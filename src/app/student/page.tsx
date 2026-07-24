import { BrowseEventsView } from "@/components/screens/BrowseEventsView";
import { ProjectDashboardView } from "@/components/screens/ProjectDashboardView";
import { getCurrentStudentId } from "@/lib/current-user";
import { CURRENT_EVENT_ID } from "@/lib/constants";
import { getMyTeam } from "@/lib/mock-data";

export default async function StudentTopPage() {
  const currentStudentId = await getCurrentStudentId();
  const myTeam = getMyTeam(currentStudentId);

  if (myTeam) {
    return <ProjectDashboardView teamId={myTeam.id} />;
  }

  return <BrowseEventsView eventId={CURRENT_EVENT_ID} teamHref={(teamId) => `/student/teams/${teamId}`} />;
}
