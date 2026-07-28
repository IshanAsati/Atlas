"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Micro } from "@/components/ui/Panel";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { CoachPanel } from "@/components/focus/CoachPanel";
import { EmptyBay, Skeleton } from "@/components/ui/States";
import { CloseIcon } from "@/components/ui/Icons";
import { useAtlasData } from "@/lib/atlas-context";
import { daysUntil, type MissionTask } from "@/lib/mock";
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
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");

  /* One source of truth: the same context every other screen reads, so the
     coach knows the student's real confidence rather than a mock default. */
  const { mission, topics, subjects, loading } = useAtlasData();
  const loaded = !loading;
  const missionTasks: MissionTask[] = mission?.tasks ?? [];

  /* Any topic can be coached, not only one that's in today's mission —
     the graph links straight here. */
  const task: MissionTask | undefined = useMemo(() => {
    const standalone = topicParam ? topics.find((t) => t.id === topicParam) : undefined;
    return (
    missionTasks.find((t) => (topicParam ? t.topicId === topicParam : t.status === "active")) ??
    (standalone
      ? {
          id: `t-${standalone.id}`,
          topicId: standalone.id,
          topic: standalone.name,
          subject: subjects.find((s) => s.id === standalone.subjectId)?.name ?? "",
          reason: `Confidence is ${standalone.confidence}%.`,
          minutes: 15,
          status: "pending",
          kind: standalone.confidence < 40 ? "learn" : "quiz",
        }
      : undefined) ??
      missionTasks.find((t) => t.status === "active") ??
      missionTasks[0]
    );
  }, [missionTasks, topicParam, topics, subjects]);

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
      examInDays: subject ? daysUntil(subject.examDate, new Date()) : 21,
    };
  }, [task, topics, subjects]);

  /* Derived, not stored: useCoach reads initialTurns once through useState,
     so a value produced by an effect arrives too late to ever be shown. */
  const initialTurns = useMemo<CoachTurn[]>(
    () => (task ? openingTurnsFor(task) : []),
    [task],
  );

  if (!loaded) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col justify-center gap-6 px-5 py-6 sm:px-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-[60%]" delay={0.1} />
        <Skeleton className="h-3 w-[80%]" delay={0.18} />
        <Skeleton radius="rounded-bay" className="h-[420px] w-full" delay={0.26} />
        <span className="sr-only">Loading your coaching session</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] items-center px-5">
        <EmptyBay
          eyebrow="Learn"
          title="There's nothing to coach you on yet."
          body="The coach works from your syllabus — it needs to know what you're studying and how confident you are before it can ask you anything useful."
          actionLabel="Add your syllabus"
          actionHref="/onboarding"
          className="w-full"
        />
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
          <CoachPanel key={task.id} context={coachContext} initialTurns={initialTurns} />
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
