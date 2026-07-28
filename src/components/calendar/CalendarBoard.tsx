"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { IconKey } from "@/components/ui/Key";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ChevronIcon } from "@/components/ui/Icons";
import { useAtlasData } from "@/lib/atlas-context";
import { DayDetail, type PlannedDay } from "@/components/calendar/DayDetail";

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

const TODAY = new Date();
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
  const { subjects, calendarDays } = useAtlasData();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selected, setSelected] = useState<string | null>(null);

  /* The forward plan: which topics sit on which day between now and the
     papers. Fetched once and clipped client-side as the month changes. */
  const [schedule, setSchedule] = useState<Record<string, PlannedDay>>({});
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, PlannedDay> | null) => {
        if (!cancelled && data) setSchedule(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const weeks = useMemo(() => buildWeeks(cursor.year, cursor.month), [cursor]);

  const examsByDate = useMemo(() => {
    const map = new Map<string, (typeof subjects)[number]>();
    subjects.forEach((s) => map.set(s.examDate, s));
    return map;
  }, [subjects]);

  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = month + delta;
      if (next < 0) return { year: year - 1, month: 11 };
      if (next > 11) return { year: year + 1, month: 0 };
      return { year, month: next };
    });

  const accentBySubject = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.name, s.accent])),
    [subjects],
  );

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const monthDays = Object.entries(calendarDays).filter(([k]) => k.startsWith(monthPrefix));
  const studied = monthDays.filter(([, v]) => v.state === "complete").length;
  const totalMinutes = monthDays.reduce((s, [, v]) => s + (v.minutes ?? 0), 0);

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

        <div className="mx-auto grid max-w-[600px] grid-cols-7 gap-1.5 sm:gap-2.5">
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
                state={record?.state ?? (schedule[key] ? "planned" : undefined)}
                minutes={record?.minutes ?? schedule[key]?.totalMinutes}
                exam={exam ? { name: exam.name, accent: exam.accent } : undefined}
                isToday={isToday}
                selected={selected === key}
                onSelect={() => setSelected(selected === key ? null : key)}
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
        <DayDetail
          date={selected}
          record={selected ? calendarDays[selected] : undefined}
          plan={selected ? schedule[selected] : undefined}
          exam={
            selected && examsByDate.get(selected)
              ? {
                  name: examsByDate.get(selected)!.name,
                  accent: examsByDate.get(selected)!.accent,
                }
              : undefined
          }
          accentBySubject={accentBySubject}
          loading={planLoading}
        />

        <Panel depth="raised" radius="bay" className="p-6">
          <Micro>This month</Micro>
          <Groove className="my-4" />
          <dl className="space-y-4">
            <Stat label="Missions completed" value={`${studied}`} />
            <Stat label="Minutes studied" value={totalMinutes.toLocaleString()} />
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
  selected,
  onSelect,
}: {
  day: number;
  state?: "complete" | "partial" | "missed" | "planned";
  minutes?: number;
  exam?: { name: string; accent: string };
  isToday: boolean;
  selected: boolean;
  onSelect: () => void;
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
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${day}${state ? ` · ${title}` : ""}`}
      className={cn(
        "group relative flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-key",
        "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        state === "missed"
          ? "bg-linear-145 from-base-lo to-base-hi shadow-inset"
          : state
            ? "bg-linear-145 from-base-hi to-base-lo shadow-raised-sm hover:shadow-raised active:shadow-pressed"
            : "hover:bg-linear-145 hover:from-base-lo hover:to-base-hi hover:shadow-inset",
        isToday && "shadow-inset from-base-lo to-base-hi bg-linear-145 ring-1 ring-teal/40",
        selected && "ring-2 ring-teal",
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
