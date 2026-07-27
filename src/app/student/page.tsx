import { StudentHomeView } from "@/components/screens/StudentHomeView";
import { getCurrentStudentId } from "@/lib/current-user";

export default async function StudentHomePage() {
  const studentId = await getCurrentStudentId();
  return <StudentHomeView studentId={studentId} />;
}
