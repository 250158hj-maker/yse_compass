import { cookies } from "next/headers";

export const DEFAULT_TEACHER_ID = "t-mito";

export const TEACHER_COOKIE_NAME = "mock_teacher_id";

export async function getCurrentTeacherId(): Promise<string> {
  const store = await cookies();
  return store.get(TEACHER_COOKIE_NAME)?.value ?? DEFAULT_TEACHER_ID;
}
