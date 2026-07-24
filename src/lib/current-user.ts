import { cookies } from "next/headers";

export const DEFAULT_STUDENT_ID = "stu-sato";

export const STUDENT_COOKIE_NAME = "mock_student_id";

export async function getCurrentStudentId(): Promise<string> {
  const store = await cookies();
  return store.get(STUDENT_COOKIE_NAME)?.value ?? DEFAULT_STUDENT_ID;
}
