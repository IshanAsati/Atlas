"use client";

import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { EmptyBay, SkeletonLines } from "@/components/ui/States";
import { daysUntil } from "@/lib/mock";

/* The shape /api/calendar returns. Declared here rather than imported from
   the data layer for the same reason `atlas-context` declares its own
   StudentProfile — nothing client-side should reach into a server module. */
export interface PlannedTopic {
  id: string;
  name: string;
  subject: string;
  minutes: number;
}

export interface PlannedDay {
  topics: PlannedTopic[];
  totalMinutes: number;
}

export type DayState = "complete" | "partial" | "missed" | "planned";

export interface DayRecord {
  state: DayState;
  minutes?: number;
}

export const accentVar: Record<string, string> = {
  teal: "var(--color-teal)",
  amber: "var(--color-amber)",
  rust: "var(--color-rust)",
};

const doneLabel: Record<DayState, string> = {
  complete: "Mission complete",
  partial: "Partly done",
  missed: "Missed",
  planned: "Planned",
};

/** "Past" / "Today" / how far off it still is. */
function whenLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  if (offset < 0) return `${Math.abs(offset)} days ago`;
  return `In ${offset} days`;
}

function longDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface DayDetailProps {
  /** The selected date, or null when the student has cleared the selection. */
  date: string | null;
  /** What was actually recorded on that day, if anything. */
  record?: DayRecord;
  /** What Atlas has planned for that day, if anything. */
  plan?: PlannedDay;
  /** The paper being sat on that date, if one is. */
  exam?: { name: string; accent: string };
  /** Subject name → accent, so each planned topic carries its paper's colour. */
  accentBySubject?: Record<string, string>;
  loading?: boolean;
}

/**
 * The panel beside the grid: what happened on a day that has gone, what is
 * planned for one that hasn't. Announces itself politely so a keyboard user
 * moving across the grid hears each day without losing their place.
 */
export function DayDetail({
  date,
  record,
  plan,
  exam,
  accentBySubject,
  loading = false,
}: DayDetailProps) {
  const offset = date ? daysUntil(date) : 0;
  const isPast = offset < 0;

  return (
    <Panel
      depth="raised"
      radius="bay"
      className="p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <Micro>Selected day</Micro>
        {date ? <Micro className="text-ink-2">{whenLabel(offset)}</Micro> : null}
      </div>

      <Groove className="my-4" />

      {!date ? (
        <EmptyBay
          mark={false}
          title="Pick a day to see its plan."
          body="Every day in the grid opens what you studied, or what Atlas has lined up."
          className="px-4 py-8"
        />
      ) : (
        <>
          <h3 className="font-display text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] text-ink">
            {longDate(date)}
          </h3>

          {exam ? (
            <p className="mt-3 inline-flex items-center gap-2.5 rounded-key bg-linear-145 from-base-lo to-base-hi px-3 py-2 shadow-inset">
              <span className="h-2 w-3 shrink-0 rounded-sm bg-rust" />
              <span className="micro text-ink-2">{exam.name} paper</span>
            </p>
          ) : null}

          <div className="mt-5">
            {isPast ? (
              <PastDay record={record} />
            ) : loading ? (
              <SkeletonLines rows={3} />
            ) : (
              <PlannedTopics plan={plan} accentBySubject={accentBySubject} today={offset === 0} />
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

function PastDay({ record }: { record?: DayRecord }) {
  if (!record) {
    return (
      <EmptyBay
        mark={false}
        title="Nothing was recorded for this day."
        body="Finish a focus session and the minutes land here."
        className="px-4 py-8"
      />
    );
  }

  return (
    <dl className="space-y-4">
      <Reading label="Minutes studied" value={`${record.minutes ?? 0}`} />
      <Reading label="Day" value={doneLabel[record.state]} />
    </dl>
  );
}

function PlannedTopics({
  plan,
  accentBySubject,
  today,
}: {
  plan?: PlannedDay;
  accentBySubject?: Record<string, string>;
  today: boolean;
}) {
  if (!plan || plan.topics.length === 0) {
    return (
      <EmptyBay
        mark={false}
        title="No topics planned for this day."
        body="Atlas plans up to the day before each paper. Add a subject to fill the days after that."
        className="px-4 py-8"
      />
    );
  }

  return (
    <>
      <Micro className="block">{today ? "Planned for today" : "Planned"}</Micro>
      <ul className="mt-3 space-y-2.5">
        {plan.topics.map((topic) => (
          <li
            key={topic.id}
            className="flex items-center gap-3 rounded-key bg-linear-145 from-base-hi to-base-lo px-3.5 py-3 shadow-raised-sm"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                background:
                  accentVar[accentBySubject?.[topic.subject] ?? ""] ?? "var(--color-ink-3)",
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9rem] font-medium text-ink">
                {topic.name}
              </span>
              <span className="micro mt-1 block text-ink-3">{topic.subject}</span>
            </span>
            <span className="readout shrink-0 text-[0.7rem] font-medium text-ink-2">
              {topic.minutes}m
            </span>
          </li>
        ))}
      </ul>

      <Groove className="my-4" />

      <div className="flex items-baseline justify-between gap-3">
        <Micro className="text-ink-2">Total</Micro>
        <span className="readout text-[1.05rem] font-semibold text-ink">
          {plan.totalMinutes} min
        </span>
      </div>
    </>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[0.85rem] text-ink-2">{label}</dt>
      <dd className="readout text-[1.05rem] font-semibold text-ink">{value}</dd>
    </div>
  );
}
