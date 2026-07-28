"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { EmptyBay, Skeleton } from "@/components/ui/States";
import { ArrowIcon, ChevronIcon } from "@/components/ui/Icons";
import { useAtlasData } from "@/lib/atlas-context";
import { useCoach } from "@/lib/coach/useCoach";
import { daysUntil } from "@/lib/mock";
import type { CoachContext, CoachTurn } from "@/lib/coach/types";

/**
 * The coach, on the first screen.
 *
 * Not a floating bubble bolted onto the corner — it sits in the dashboard
 * grid as another instrument, opening on the topic today's mission starts
 * with. The student can answer here and carry on, or open the full session.
 * Two or three turns is the point; anything longer belongs in Focus Mode.
 */
export function CoachDock() {
  const { mission, topics, subjects, loading } = useAtlasData();

  const task = useMemo(
    () => mission?.tasks.find((t) => t.status !== "complete") ?? mission?.tasks[0],
    [mission],
  );

  const context = useMemo<CoachContext | null>(() => {
    if (!task) return null;
    const topic = topics.find((t) => t.id === task.topicId);
    const subject = subjects.find((s) => s.name === task.subject);
    return {
      topicId: task.topicId,
      topic: task.topic,
      subject: task.subject,
      confidence: topic?.confidence ?? 50,
      lastSeenDays: topic?.lastSeenDays ?? 0,
      examInDays: subject ? daysUntil(subject.examDate) : 21,
    };
  }, [task, topics, subjects]);

  if (loading) {
    return (
      <Panel depth="raised" radius="bay" className="p-6 sm:p-7" aria-busy="true">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="mt-4 h-5 w-48" delay={0.08} />
        <Skeleton className="mt-6 h-20 w-full" radius="rounded-key" delay={0.16} />
        <Skeleton className="mt-4 h-11 w-full" radius="rounded-key" delay={0.24} />
        <span className="sr-only">Loading the coach</span>
      </Panel>
    );
  }

  if (!context) {
    return (
      <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
        <Micro>Learn</Micro>
        <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
          Ask the coach
        </h2>
        <Groove className="my-5" />
        <EmptyBay
          title="Nothing to ask about yet."
          body="The coach works from your syllabus — it needs to know what you're studying before it can question you on it."
          actionLabel="Add your syllabus"
          actionHref="/onboarding"
          mark={false}
          className="py-6"
        />
      </Panel>
    );
  }

  return <Dock context={context} />;
}

function Dock({ context }: { context: CoachContext }) {
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState("");

  const opening = useMemo<CoachTurn[]>(
    () => [
      {
        role: "coach",
        body: `Before you start on ${context.topic} — what's one thing you already remember about it?`,
      },
    ],
    [context.topic],
  );

  const coach = useCoach({ context, initialTurns: opening });

  /* Only the tail of the thread. This is a doorway into a session, not the
     session itself. */
  const shown = coach.turns.slice(-2);

  const submit = () => {
    if (!draft.trim() || coach.busy) return;
    void coach.send(draft);
    setDraft("");
  };

  return (
    <Panel depth="raised" radius="bay" className="flex flex-col p-6 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <Micro>Learn</Micro>
          <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
            Ask the coach
          </h2>
        </div>
        <Link
          href={`/coach?topic=${context.topicId}`}
          className="micro inline-flex items-center gap-1 text-ink-3 transition-colors hover:text-teal-deep"
        >
          Full session
          <ChevronIcon width={12} height={12} />
        </Link>
      </div>

      <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
        On {context.topic}, where you&apos;re at {coach.confidence}%.
      </p>

      <Groove className="my-5" />

      <div className="min-h-[132px] space-y-3.5">
        {shown.map((turn, i) => (
          <div key={`${turn.role}-${i}`}>
            <Micro className={turn.role === "coach" ? "text-teal-deep" : "text-ink-3"}>
              {turn.role === "coach" ? "Atlas" : "You"}
            </Micro>
            <p
              className={cn(
                "mt-1.5 rounded-key px-3.5 py-2.5 text-[0.875rem] leading-relaxed",
                turn.role === "coach"
                  ? "bg-linear-145 from-base-lo to-base-hi text-ink shadow-inset"
                  : "bg-linear-145 from-base-hi to-base-lo text-ink-2 shadow-raised-sm",
              )}
            >
              {turn.body}
            </p>
            {turn.misconception ? (
              <p className="mt-1.5 flex items-start gap-2 rounded-key bg-amber-wash/70 px-3 py-2 text-[0.72rem] leading-snug text-amber-deep">
                <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-amber" />
                {turn.misconception}
              </p>
            ) : null}
          </div>
        ))}

        {coach.status === "thinking" && (
          <div className="inline-flex items-center gap-2 rounded-key bg-linear-145 from-base-lo to-base-hi px-3.5 py-3 shadow-inset">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-teal"
                animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              />
            ))}
          </div>
        )}

        {coach.streamed && (
          <div>
            <Micro className="text-teal-deep">Atlas</Micro>
            <p className="mt-1.5 rounded-key bg-linear-145 from-base-lo to-base-hi px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-ink shadow-inset">
              {coach.streamed}
              <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-teal align-middle" />
            </p>
          </div>
        )}

        {coach.error && (
          <p className="rounded-key bg-amber-wash/60 px-3.5 py-2.5 text-[0.8rem] leading-snug text-amber-deep">
            {coach.error}{" "}
            <button
              type="button"
              onClick={coach.retry}
              className="underline underline-offset-4 hover:text-ink-2"
            >
              Try again
            </button>
          </p>
        )}
      </div>

      <div className="mt-5 flex items-end gap-2.5">
        <label className="sr-only" htmlFor="dock-input">
          Answer the coach
        </label>
        <textarea
          id="dock-input"
          rows={1}
          value={draft}
          disabled={coach.busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={coach.busy ? "Atlas is thinking…" : "Answer, or ask what you're stuck on"}
          className={cn(
            "max-h-24 min-h-[44px] flex-1 resize-none rounded-key bg-linear-145 from-base-lo to-base-hi",
            "px-3.5 py-3 text-[0.875rem] leading-snug text-ink shadow-inset outline-none",
            "placeholder:text-ink-3 disabled:opacity-60",
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim() || coach.busy}
          aria-label="Send to coach"
          className={cn(
            "grid size-[44px] shrink-0 place-items-center rounded-key transition-all duration-200",
            "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised",
            "active:shadow-pressed active:translate-y-px",
            "disabled:text-ink-3 disabled:shadow-raised-sm disabled:opacity-50",
          )}
        >
          <ArrowIcon width={17} height={17} />
        </button>
      </div>
    </Panel>
  );
}
