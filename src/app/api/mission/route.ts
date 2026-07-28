import { NextResponse } from "next/server";
import { getServerMission, generateMission, updateTaskStatus } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET  /api/mission?date=YYYY-MM-DD  → returns mission for date (generates if missing)
 * POST /api/mission                   → force-regenerate today's mission
 * PATCH /api/mission/tasks/:id        → update task status
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  try {
    const existing = await getServerMission(date ?? undefined);
    if (existing) return NextResponse.json(existing);

    /* No mission for this day yet. Plan one now rather than showing the
       student an empty dashboard — this is what makes Atlas work on the
       second morning, not just the one it was set up on. */
    const generated = await generateMission(date ?? undefined);
    return NextResponse.json(generated);
  } catch (error) {
    console.error("[mission] GET error:", error);
    return NextResponse.json({ error: "Failed to load mission." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date ?? new Date().toISOString().slice(0, 10);
    const studyTime = body.studyTime ?? 120;
    const mission = await generateMission(date, studyTime);
    return NextResponse.json(mission);
  } catch (error) {
    console.error("[mission] POST error:", error);
    return NextResponse.json({ error: "Failed to generate mission." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { pathname } = new URL(request.url);
  const taskId = pathname.split("/").pop();

  if (!taskId) {
    return NextResponse.json({ error: "Task ID required." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;
    if (status) {
      await updateTaskStatus(taskId, status);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[mission] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update task." }, { status: 500 });
  }
}
