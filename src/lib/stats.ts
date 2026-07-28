type DayState = "complete" | "partial" | "missed" | "planned";
type CalendarDays = Record<string, { state: DayState; minutes?: number }>;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Consecutive days of study, counting back from today.
 *
 * Today not being logged yet doesn't break a streak — you might simply not
 * have studied yet this morning — so the walk starts at yesterday if today
 * has no record. A missed or absent day ends it.
 */
export function calcStreak(days: CalendarDays, today = new Date()): number {
  if (!days || Object.keys(days).length === 0) return 0;

  const counts = (state?: DayState) => state === "complete" || state === "partial";

  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let streak = 0;

  // Today only contributes if it's already logged.
  if (counts(days[iso(cursor)]?.state)) streak += 1;
  cursor.setDate(cursor.getDate() - 1);

  while (counts(days[iso(cursor)]?.state)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Longest run of studied days anywhere in the record. */
export function calcBestStreak(days: CalendarDays): number {
  const studied = Object.entries(days ?? {})
    .filter(([, v]) => v.state === "complete" || v.state === "partial")
    .map(([k]) => k)
    .sort();

  let best = 0;
  let run = 0;
  let previous: Date | null = null;

  for (const key of studied) {
    const day = new Date(`${key}T00:00:00`);
    if (previous && (day.getTime() - previous.getTime()) / 86_400_000 === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    previous = day;
  }

  return best;
}
