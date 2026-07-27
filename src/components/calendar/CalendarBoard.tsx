"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { IconKey } from "@/components/ui/Key";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ChevronIcon } from "@/components/ui/Icons";
import { calendarDays, subjects, TODAY } from "@/lib/mock";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const accentVar: Record<string, string> = {
  teal: "var(--color-teal)",
  amber: "var(--color-amber)",
  rust: "var(--color-rust)",
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const todayIso = iso(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

/** Monday-first grid, padded with nulls so the weeks line up. */
function buildWeeks(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= total; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export function CalendarBoard() {
  const [cursor, setCursor] = useState({ year: 2026, month: 6 });
  const weeks = useMemo(() => buildWeeks(cursor.year, cursor.month), [cursor]);

  const examsByDate = useMemo(() => {
    const map = new Map<string, (typeof subjects)[number]>();
    subjects.forEach((s) => map.set(s.examDate, s));
    return map;
  }, []);

  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = month + delta;
      if (next < 0) return { year: year - 1, month: 11 };
      if (next > 11) return { year: year + 1, month: 0 };
      return { year, month: next };
    });

  const monthDays = Object.entries(calendarDays).filter(([key]) =>
    key.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`),
  );
  const studied = monthDays.filter(([, v]) => v.state === "complete").length;
  const minutes = monthDays.reduce((sum, [, v]) => sum + (v.minutes ?? 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel depth="raised" radius="bay" className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.02em] text-ink">
            {MONTHS[cursor.month]} <span className="text-ink-3">{cursor.year}</span>
          </h2>
          <div className="flex gap-2">
            <IconKey label="Previous month" className="size-10" onClick={() => move(-1)}>
              <ChevronIcon width={16} height={16} className="rotate-180" />
            </IconKey>
            <IconKey label="Next month" className="size-10" onClick={() => move(1)}>
              <ChevronIcon width={16} height={16} />
            </IconKey>
          </div>
        </div>

        <Groove className="my-6" />

        <div className="mx-auto grid max-w-[600px] grid-cols-7 gap-2 sm:gap-2.5">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="pb-2 text-center">
              <Micro>{d}</Micro>
            </div>
          ))}

          {weeks.flat().map((day, i) => {
            if (day === null) return <div key={`pad-${i}`} />;
            const key = iso(cursor.year, cursor.month, day);
            const record = calendarDays[key];
            const exam = examsByDate.get(key);
            const isToday = key === todayIso;
            return (
              <DayCell
                key={key}
                day={day}
                state={record?.state}
                minutes={record?.minutes}
                exam={exam ? { name: exam.name, accent: exam.accent } : undefined}
                isToday={isToday}
              />
            );
          })}
        </div>

        <Groove className="my-6" />

        <ul className="flex flex-wrap gap-x-6 gap-y-3">
          <LegendItem swatch={<span className="size-2 rounded-full bg-teal" />} label="Mission complete" />
          <LegendItem swatch={<span className="size-2 rounded-full bg-amber" />} label="Partly done" />
          <LegendItem
            swatch={<span className="size-2 rounded-full bg-groove shadow-inset" />}
            label="Missed"
          />
          <LegendItem
            swatch={<span className="size-2 rounded-full border border-ink-3/60" />}
            label="Planned"
          />
          <LegendItem swatch={<span className="h-2 w-3 rounded-sm bg-rust" />} label="Exam" />
        </ul>
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel depth="raised" radius="bay" className="p-6">
          <Micro>This month</Micro>
          <Groove className="my-4" />
          <dl className="space-y-4">
            <Stat label="Missions completed" value={`${studied}`} />
            <Stat label="Minutes studied" value={minutes.toLocaleString()} />
            <Stat label="Completion rate" value={`${Math.round((studied / Math.max(monthDays.length, 1)) * 100)}%`} />
          </dl>
        </Panel>

        <Panel depth="raised" radius="bay" className="p-6">
          <Micro>Papers ahead</Micro>
          <Groove className="my-4" />
          <ul className="space-y-3.5">
            {subjects.map((subject) => (
              <li key={subject.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: accentVar[subject.accent] }}
                  />
                  <span className="text-[0.9rem] font-medium text-ink">{subject.name}</span>
                </span>
                <span className="readout text-[0.7rem] text-ink-2">
                  {new Date(`${subject.examDate}T00:00:00`).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function DayCell({
  day,
  state,
  minutes,
  exam,
  isToday,
}: {
  day: number;
  state?: "complete" | "partial" | "missed" | "planned";
  minutes?: number;
  exam?: { name: string; accent: string };
  isToday: boolean;
}) {
  const title = exam
    ? `${exam.name} exam`
    : state === "complete"
      ? `Mission complete · ${minutes} min`
      : state === "partial"
        ? `Partly done · ${minutes} min`
        : state === "missed"
          ? "Missed"
          : state === "planned"
            ? `Planned · ${minutes} min`
            : undefined;

  return (
    <button
      type="button"
      title={title}
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-key",
        "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        state === "missed"
          ? "bg-linear-145 from-base-lo to-base-hi shadow-inset"
          : state
            ? "bg-linear-145 from-base-hi to-base-lo shadow-raised-sm hover:shadow-raised"
            : "hover:shadow-raised-sm",
        isToday && "shadow-inset from-base-lo to-base-hi bg-linear-145 ring-1 ring-teal/40",
      )}
    >
      <span
        className={cn(
          "readout text-[0.72rem] leading-none",
          isToday ? "font-bold text-teal-deep" : state ? "text-ink" : "text-ink-3",
        )}
      >
        {day}
      </span>

      {exam ? (
        <span className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full bg-rust" />
      ) : state === "complete" ? (
        <span className="size-1.5 rounded-full bg-teal" />
      ) : state === "partial" ? (
        <span className="size-1.5 rounded-full bg-amber" />
      ) : state === "planned" ? (
        <span className="size-1.5 rounded-full border border-ink-3/60" />
      ) : (
        <span className="size-1.5" />
      )}
    </button>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {swatch}
      <Micro className="text-ink-2">{label}</Micro>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[0.85rem] text-ink-2">{label}</dt>
      <dd className="readout text-[1.05rem] font-semibold text-ink">{value}</dd>
    </div>
  );
}
