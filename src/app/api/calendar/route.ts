import { NextResponse } from "next/server";
import { generateSchedule } from "@/lib/data";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The forward study plan, as a map of date → the topics sitting on that day:
 *   { "2026-07-29": { topics: [{ id, name, subject, minutes }], totalMinutes } }
 *
 * Days with nothing planned are simply absent. Both bounds are optional; the
 * plan is always worked out from today, so `from`/`to` only clip it.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if ((from && !ISO_DATE.test(from)) || (to && !ISO_DATE.test(to))) {
    return NextResponse.json(
      { error: "from and to must be dates in the form YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    const schedule = await generateSchedule(from ?? undefined, to ?? undefined);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("[calendar] GET error:", error);
    return NextResponse.json({ error: "Failed to plan the calendar." }, { status: 500 });
  }
}
