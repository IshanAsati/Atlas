import { NextResponse } from "next/server";
import { getServerSubjects, updateSubjectExamDate } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * GET   /api/subjects  → list the student's subjects
 * PATCH /api/subjects  → save corrected exam dates
 *
 * Onboarding tells the student they can tap a date to correct it. This is
 * what makes that true — without it the correction never leaves the browser
 * and tomorrow's mission is planned against the extracted date instead.
 */
export async function GET() {
  try {
    return NextResponse.json(await getServerSubjects());
  } catch (error) {
    console.error("[subjects] GET error:", error);
    return NextResponse.json({ error: "Failed to load subjects." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { dates?: Record<string, string> };
    const dates = body?.dates;

    if (!dates || typeof dates !== "object") {
      return NextResponse.json({ error: "dates required." }, { status: 400 });
    }

    const entries = Object.entries(dates).filter(
      ([id, date]) => id && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date),
    );

    await Promise.all(entries.map(([id, date]) => updateSubjectExamDate(id, date)));

    return NextResponse.json({ success: true, updated: entries.length });
  } catch (error) {
    console.error("[subjects] PATCH error:", error);
    return NextResponse.json({ error: "Failed to save exam dates." }, { status: 500 });
  }
}
