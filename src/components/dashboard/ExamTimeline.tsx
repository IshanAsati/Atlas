"use client";

import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { EmptyBay, Skeleton } from "@/components/ui/States";
import { useAtlasData } from "@/lib/atlas-context";
import { daysUntil } from "@/lib/mock";

const HORIZON = 35; // days shown on the track

const accentVar: Record<string, string> = {
  teal: "var(--color-teal)",
  amber: "var(--color-amber)",
  rust: "var(--color-rust)",
};

/**
 * PLAN. Exams on a single horizon so the workload reads as one shape
 * rather than four separate dates. The nearer the marker, the more the
 * planner weights that subject today.
 */
export function ExamTimeline() {
  const { subjects, loading } = useAtlasData();
  const upcoming = subjects
    .map((s) => ({ ...s, days: daysUntil(s.examDate) }))
    .sort((a, b) => a.days - b.days);

  return (
    <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <Micro>Plan</Micro>
          <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
            Exam horizon
          </h2>
        </div>
        <Micro className="text-ink-2">Next {HORIZON} days</Micro>
      </div>

      <Groove className="my-5" />

      {loading ? (
        <div
          className="space-y-4"
          role="status"
          aria-busy="true"
          aria-label="Loading exam dates"
        >
          <Skeleton className="h-[74px]" radius="rounded-key" />
          <Skeleton className="h-[184px]" radius="rounded-key" delay={0.12} />
          <span className="sr-only">Loading exam dates</span>
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyBay
          title="No papers on the horizon."
          body="Exam dates come from your syllabus. Add one and Atlas starts weighting your missions against the nearest paper."
          actionLabel="Add your syllabus"
          actionHref="/onboarding"
          mark={false}
          className="py-8"
        />
      ) : (
      <>
      {/* Track */}
      <div className="relative h-[74px]">
        <div className="absolute inset-x-0 bottom-4 h-2.5 rounded-full bg-groove shadow-inset" />
        {/* Today */}
        <div className="absolute bottom-2.5 left-0 flex flex-col items-center">
          <span className="h-5 w-0.5 rounded-full bg-ink" />
          <span className="micro mt-1.5 text-ink">Now</span>
        </div>

        {upcoming.map((subject, i) => {
          const pct = Math.min(97, (subject.days / HORIZON) * 100);
          return (
            <div
              key={subject.id}
              className="absolute bottom-4 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${pct}%`, height: i % 2 === 0 ? 58 : 40 }}
            >
              <span
                className="rounded-full px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.06em] text-on-accent shadow-raised-sm"
                style={{ background: accentVar[subject.accent] }}
              >
                {subject.name.slice(0, 4).toUpperCase()}
              </span>
              <span
                className="w-px flex-1"
                style={{ background: accentVar[subject.accent], opacity: 0.45 }}
              />
              <span
                className="size-2.5 rounded-full ring-2 ring-base"
                style={{ background: accentVar[subject.accent] }}
              />
            </div>
          );
        })}
      </div>

      <ul className="mt-5 space-y-px overflow-hidden rounded-key shadow-inset">
        {upcoming.map((subject) => (
          <li
            key={subject.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="flex items-center gap-2.5">
              <span
                className="size-2 rounded-full"
                style={{ background: accentVar[subject.accent] }}
              />
              <span className="text-[0.9rem] font-medium text-ink">{subject.name}</span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="readout text-[0.95rem] font-semibold text-ink">{subject.days}</span>
              <Micro>days</Micro>
            </span>
          </li>
        ))}
      </ul>
      </>
      )}
    </Panel>
  );
}
