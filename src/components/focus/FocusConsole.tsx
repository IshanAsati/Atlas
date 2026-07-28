"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { IconKey } from "@/components/ui/Key";
import { Micro } from "@/components/ui/Panel";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { CoachPanel } from "@/components/focus/CoachPanel";
import { CheckIcon, CloseIcon, CoachIcon, PauseIcon, PlayIcon, SkipIcon } from "@/components/ui/Icons";
import { daysUntil, mission, subjects, topics, type MissionTask } from "@/lib/mock";
import { applyConfidenceDelta } from "@/lib/liveConfidence";
import type { CoachContext, CoachTurn } from "@/lib/coach/types";

const SESSION_SECONDS = 25 * 60;

function openingTurnsFor(topic: MissionTask): CoachTurn[] {
  return [
    {
      role: "coach",
      body: `Let's work on ${topic.topic}. What's one thing you remember about it — even if it's just a word from the chapter title?`,
    },
  ];
}

function clock(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusConsole() {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");

  const [missionTasks, setMissionTasks] = useState<MissionTask[]>([]);
  const [markedComplete, setMarkedComplete] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    fetch("/api/mission")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.tasks) setMissionTasks(data.tasks);
        else setMissionTasks(mission.tasks as MissionTask[]);
      })
      .catch(() => setMissionTasks(mission.tasks as MissionTask[]));
  }, []);

  const task =
    missionTasks.find((t) => topicParam ? t.topicId === topicParam : t.status === "active") ??
    missionTasks.find((t) => t.status === "active") ??
    missionTasks[0];

  const [left, setLeft] = useState(SESSION_SECONDS);
  const [running, setRunning] = useState(false);
  const [coachOpen, setCoachOpen] = useState(true);

  /* Everything the coach needs to behave like a coach, pulled from the
     same records the planner used to pick this task. */
  const coachContext = useMemo<CoachContext>(() => {
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
  }, [task]);

  const openingTurns = useMemo(() => openingTurnsFor(task), [task]);

  const finished = left === 0;
  const ticking = running && !finished;

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  const handleMarkComplete = () => {
    applyConfidenceDelta(task.topicId, 5);
    setMissionTasks((prev) => {
      const next: MissionTask[] = prev.map((t) =>
        t.id === task.id ? { ...t, status: "complete" } : t,
      );
      const nextPending = next.find((t) => t.status === "pending");
      if (nextPending) {
        return next.map((t) =>
          t.id === nextPending.id ? { ...t, status: "active" } : t,
        );
      }
      return next;
    });
    setMarkedComplete(true);
    setTimeout(() => setMarkedComplete(false), 2000);
  };

  const handleSkipToBreak = () => {
    setLeft(0);
    setRunning(false);
    setSkipped(true);
  };

  const elapsed = 1 - left / SESSION_SECONDS;

  return (
    <div className="flex min-h-screen flex-col px-5 py-6 sm:px-8">
      {/* Nothing here but the exit and what you're working on */}
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-key bg-linear-145 from-base-hi to-base-lo px-4 py-2.5 text-ink-2 shadow-raised transition-all hover:text-ink active:shadow-pressed"
        >
          <CloseIcon width={15} height={15} />
          <span className="micro">End session</span>
        </Link>
        <div className="text-center">
          <Micro>Focus · Session 2 of 4</Micro>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <IconKey
            label={coachOpen ? "Hide AI Coach" : "Show AI Coach"}
            held={coachOpen}
            onClick={() => setCoachOpen((v) => !v)}
          >
            <CoachIcon width={19} height={19} />
          </IconKey>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-8 py-10 lg:grid-cols-[1.15fr_1fr]">
        {/* Timer */}
        <section className="flex flex-col items-center text-center">
          <Micro className="text-ink-3">{task.subject}</Micro>
          <h1 className="mt-3 font-display text-[2.2rem] font-semibold tracking-[-0.025em] text-ink sm:text-[2.75rem]">
            {task.topic}
          </h1>

          <div
            className="readout mt-8 text-[clamp(4rem,14vw,7.5rem)] font-bold leading-none tracking-[-0.04em] text-ink"
            aria-live="off"
          >
            {clock(left)}
          </div>

          {/* Depletion trench — the session running out, read left to right */}
          <div className="mt-8 w-full max-w-md">
            <div className="relative h-4 w-full rounded-full bg-groove shadow-inset-deep">
              <motion.div
                className="absolute inset-y-[3px] left-[3px] rounded-full bg-teal"
                style={{ boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--emboss) 45%, transparent)" }}
                animate={{ width: `calc(${Math.max(elapsed * 100, 0)}% - 6px)` }}
                transition={{ duration: reduce ? 0 : 0.4, ease: "linear" }}
              />
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-tick"
                  style={{ left: `${i * 20}%` }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex justify-between">
              <Micro>0</Micro>
              <Micro>25 min</Micro>
            </div>
          </div>

          {/* Transport */}
          <div className="mt-9 flex items-center gap-4">
            <IconKey label="Skip to break" className="size-12" onClick={handleSkipToBreak}>
              <SkipIcon width={18} height={18} />
            </IconKey>
            <button
              type="button"
              onClick={() => {
                if (finished) {
                  setLeft(SESSION_SECONDS);
                  setRunning(true);
                  return;
                }
                setRunning((v) => !v);
              }}
              aria-label={ticking ? "Pause session" : finished ? "Start a new session" : "Start session"}
              className={cn(
                "grid size-20 place-items-center rounded-full transition-all duration-200",
                "ease-[cubic-bezier(0.22,1,0.36,1)]",
                ticking
                  ? "bg-linear-145 from-base-lo to-base-hi text-ink shadow-inset"
                  : "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised-lg active:shadow-pressed",
              )}
            >
              {ticking ? <PauseIcon width={26} height={26} /> : <PlayIcon width={26} height={26} />}
            </button>
            <IconKey
              label={markedComplete ? "Task marked complete" : "Mark task complete"}
              className="size-12"
              onClick={handleMarkComplete}
            >
              <CheckIcon width={18} height={18} />
            </IconKey>
          </div>

          <p className="micro mt-6 text-ink-3">
            {skipped
              ? "Break time · well deserved"
              : finished
                ? "Session done · take five, then start the next"
                : ticking
                  ? "Running · phone face down"
                  : "Paused · press play when you're seated"}
          </p>
        </section>

        {/* AI Coach */}
        <AnimatePresence initial={false}>
          {coachOpen && (
            <motion.aside
              key="coach"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: 24 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <CoachPanel context={coachContext} initialTurns={openingTurns} onMarkComplete={handleMarkComplete} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
