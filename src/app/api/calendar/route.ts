import { NextResponse } from "next/server";
import { denyIfSignedOut } from "@/lib/auth/guard";
import { generateSchedule, getAllCalendarDays, logStudyMinutes } from "@/lib/data";
import { localISO } from "@/lib/date";

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
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);

  /* ?days=1 returns what has actually been studied, rather than the plan. */
  if (searchParams.get("days")) {
    try {
      return NextResponse.json(await getAllCalendarDays());
    } catch (error) {
      console.error("[calendar] days error:", error);
      return NextResponse.json({}, { status: 200 });
    }
  }

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

/**
 * PATCH /api/calendar { date, minutes } → log a finished study session.
 *
 * This is what turns a Pomodoro into a day on the calendar, a day streak and
 * momentum. Minutes sum, so several sessions in a day add up.
 */
export async function PATCH(request: Request) {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  try {
    const body = (await request.json()) as { date?: string; minutes?: number };
    const date = body.date ?? localISO();
    const minutes = Number(body.minutes);

    if (!ISO_DATE.test(date) || !Number.isFinite(minutes) || minutes <= 0) {
      return NextResponse.json(
        { error: "A date and a positive number of minutes are required." },
        { status: 400 },
      );
    }

    const day = await logStudyMinutes(date, Math.round(minutes));
    return NextResponse.json(day ?? { error: "Not saved." }, { status: day ? 200 : 500 });
  } catch (error) {
    console.error("[calendar] PATCH error:", error);
    return NextResponse.json({ error: "Failed to log the session." }, { status: 500 });
  }
}
