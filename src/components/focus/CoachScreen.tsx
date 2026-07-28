"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconKey } from "@/components/ui/Key";
import { Micro } from "@/components/ui/Panel";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { CoachPanel } from "@/components/focus/CoachPanel";
import { CloseIcon, CoachIcon } from "@/components/ui/Icons";
import { daysUntil, mission, subjects, topics, type MissionTask } from "@/lib/mock";
import type { CoachContext, CoachTurn } from "@/lib/coach/types";

function openingTurnsFor(topic: MissionTask): CoachTurn[] {
  return [
    {
      role: "coach",
      body: `Let's work on ${topic.topic}. What's one thing you remember about it — even if it's just a word from the chapter title?`,
    },
  ];
}

export function CoachScreen() {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");

  const [missionTasks, setMissionTasks] = useState<MissionTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mission")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data?.tasks?.length) setMissionTasks(data.tasks);
        else setMissionTasks(mission.tasks as MissionTask[]);
      })
      .catch(() => {
        if (cancelled) return;
        setMissionTasks(mission.tasks as MissionTask[]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const task: MissionTask | undefined =
    missionTasks.find((t) => topicParam ? t.topicId === topicParam : t.status === "active") ??
    missionTasks.find((t) => t.status === "active") ??
    missionTasks[0];

  const coachContext = useMemo<CoachContext>(() => {
    if (!task) {
      return { topicId: "", topic: "", subject: "", confidence: 50, lastSeenDays: 0, examInDays: 21 };
    }
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

  const [initialTurns, setInitialTurns] = useState<CoachTurn[]>([]);
  const prevTaskId = useRef<string | null>(null);
  useEffect(() => {
    if (task && prevTaskId.current !== task.id) {
      prevTaskId.current = task.id;
      setInitialTurns(openingTurnsFor(task));
    }
  }, [task]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Micro className="text-ink-3">Loading…</Micro>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <Micro className="text-ink-3">No active task. Complete onboarding first.</Micro>
        <Link href="/" className="micro text-teal-deep underline">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-key bg-linear-145 from-base-hi to-base-lo px-4 py-2.5 text-ink-2 shadow-raised transition-all hover:text-ink active:shadow-pressed"
        >
          <CloseIcon width={15} height={15} />
          <span className="micro">Back to Dashboard</span>
        </Link>
        <div className="text-center">
          <Micro>AI Coach · {task.subject}</Micro>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center py-8">
        <h1 className="font-display text-[2.2rem] font-semibold tracking-[-0.025em] text-ink sm:text-[2.75rem]">
          {task.topic}
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">
          {task.reason}
        </p>

        <div className="mt-8">
          <CoachPanel context={coachContext} initialTurns={initialTurns} />
        </div>

        <Link
          href={`/focus?topic=${task.topicId}`}
          className="micro mt-6 text-center text-ink-3 underline underline-offset-4 hover:text-ink-2"
        >
          Start a focused Pomodoro session instead
        </Link>
      </div>
    </div>
  );
}
