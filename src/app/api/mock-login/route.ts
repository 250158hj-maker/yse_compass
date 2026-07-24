import { type NextRequest, NextResponse } from "next/server";
import { STUDENT_COOKIE_NAME } from "@/lib/current-user";
import { TEACHER_COOKIE_NAME } from "@/lib/current-teacher";
import { getStudent, getTeacher } from "@/lib/mock-data";

export function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("student");
  const teacherId = request.nextUrl.searchParams.get("teacher");

  if (studentId && getStudent(studentId)) {
    const response = NextResponse.redirect(new URL("/student", request.url));
    response.cookies.set(STUDENT_COOKIE_NAME, studentId, { path: "/" });
    return response;
  }

  if (teacherId && getTeacher(teacherId)) {
    const response = NextResponse.redirect(new URL("/teacher/events", request.url));
    response.cookies.set(TEACHER_COOKIE_NAME, teacherId, { path: "/" });
    return response;
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
