/**
 * Dates as the student's calendar sees them.
 *
 * `toISOString()` converts to UTC first, so anywhere east of Greenwich a
 * late-night session lands on the previous day — in IST, everything between
 * midnight and 05:30 was being filed under yesterday while `calcStreak`
 * compared against local dates. Students study late; this has to agree.
 */

/** YYYY-MM-DD in the local timezone. */
export function localISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD `offset` days from today, in the local timezone. */
export function localISOOffset(offset: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + offset);
  return localISO(d);
}
