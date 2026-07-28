import { NextResponse } from "next/server";
import { getServerStudent, updateStudentProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const student = await getServerStudent();
    return NextResponse.json(student);
  } catch (error) {
    console.error("[student] GET error:", error);
    return NextResponse.json({ error: "Failed to load student." }, { status: 500 });
  }
}

/**
 * PATCH /api/student → save the student's own settings.
 *
 * The daily study time set during onboarding was only ever sent to the
 * mission generator, so the next day's plan reverted to the 120-minute
 * default. This is where it persists.
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      grade?: string;
      studyTime?: number;
    };

    const patch: { name?: string; grade?: string; studyTime?: number } = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.grade === "string" && body.grade.trim()) patch.grade = body.grade.trim();
    if (typeof body.studyTime === "number" && body.studyTime > 0) {
      patch.studyTime = Math.round(body.studyTime);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    await updateStudentProfile(patch);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[student] PATCH error:", error);
    return NextResponse.json({ error: "Failed to save your settings." }, { status: 500 });
  }
}
