"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Micro, Panel } from "@/components/ui/Panel";
import { MomentumDial } from "@/components/ui/MomentumDial";
import { EmptyBay, RestingDial, Skeleton, SkeletonDial } from "@/components/ui/States";
import { ArrowIcon, CheckIcon, ClockIcon } from "@/components/ui/Icons";
import { useAtlasData } from "@/lib/atlas-context";
import { calcStreak } from "@/lib/stats";
import { type MissionTask } from "@/lib/mock";

const kindLabel: Record<MissionTask["kind"], string> = {
  revise: "Revise",
  learn: "Learn",
  quiz: "Quiz",
};

export function TodayMission() {
  const reduce = useReducedMotion();
  const { mission, student, calendarDays, loading } = useAtlasData();

  /* Both of these are overrides on top of derived values rather than copies
     of them — syncing mission.tasks into state via an effect left the queue
     stale whenever the mission refreshed. */
  const [order, setOrder] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const tasks = useMemo(() => mission?.tasks ?? [], [mission]);

  const queue = useMemo(() => {
    if (!order) return tasks;
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const reordered = order.map((id) => byId.get(id)).filter((t): t is MissionTask => Boolean(t));
    // Anything added since the reorder still needs to appear.
    const missing = tasks.filter((t) => !order.includes(t.id));
    return [...reordered, ...missing];
  }, [order, tasks]);

  const firstOpen = queue.find((t) => t.status !== "complete") ?? queue[0];
  const selectedId = picked && queue.some((t) => t.id === picked) ? picked : firstOpen?.id;
  const selected = queue.find((t) => t.id === selectedId);

  const streak = useMemo(() => calcStreak(calendarDays), [calendarDays]);

  if (loading) return <MissionSkeleton />;

  if (!mission || queue.length === 0 || !selected) {
    return (
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <EmptyBay
          eyebrow="Plan"
          title="Atlas hasn't planned your day yet."
          body="Add your syllabus and Atlas works out what to study first, how long it should take, and why that topic and not another."
          actionLabel="Add your syllabus"
          actionHref="/onboarding"
          className="min-h-[340px] justify-center"
        />
        <div className="flex flex-col gap-6">
          <Panel depth="raised" radius="bay" className="grid place-items-center px-5 py-9">
            <RestingDial size={132} />
            <p className="mt-6 max-w-[15rem] text-center text-[0.85rem] leading-relaxed text-ink-2">
              Momentum starts with your first session and only falls off slowly after that.
            </p>
          </Panel>
          <div className="grid grid-cols-2 gap-4">
            <Readout value="—" label="Minutes left" />
            <Readout value={`${streak}`} label="Day streak" />
          </div>
        </div>
      </section>
    );
  }

  const done = queue.filter((t) => t.status === "complete");
  const remaining = queue
    .filter((t) => t.status !== "complete")
    .reduce((sum, t) => sum + t.minutes, 0);

  /* Move the selected task one place down the pending order — the student
     is saying "not this one first", not "never this one". */
  const handleSwap = () => {
    const ids = queue.map((t) => t.id);
    const pending = queue.filter((t) => t.status !== "complete");
    if (pending.length < 2) return;
    const here = pending.findIndex((t) => t.id === selected.id);
    const next = pending[(here + 1) % pending.length];
    const a = ids.indexOf(selected.id);
    const b = ids.indexOf(next.id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    setOrder(ids);
    setPicked(next.id);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel depth="raised" radius="bay" className="overflow-hidden p-6 sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <Micro>Today</Micro>
          <Micro className="text-ink-2">
            {done.length}/{queue.length} done
          </Micro>
        </div>

        <motion.div
          key={selected.id}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <p className="font-display text-[2.1rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-[3.4rem]">
            Start with
            <br />
            <span className="text-teal-deep">{selected.topic}.</span>
          </p>
          <p className="mt-4 max-w-lg text-[0.98rem] leading-relaxed text-ink-2">
            {selected.reason}
          </p>
        </motion.div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Key
            href={`/focus?topic=${selected.topicId}`}
            tone="primary"
            size="lg"
            icon={<ArrowIcon width={17} height={17} />}
          >
            Begin focus
          </Key>
          <Key
            size="lg"
            tone="quiet"
            onClick={handleSwap}
            disabled={queue.filter((t) => t.status !== "complete").length < 2}
          >
            Do this later
          </Key>
          <span className="ml-auto inline-flex items-center gap-2 text-ink-3">
            <ClockIcon width={16} height={16} />
            <span className="readout text-xs font-medium">{selected.minutes} min</span>
          </span>
        </div>

        <ul className="mt-8 space-y-2.5">
          {queue.map((task, i) => (
            <TaskKey
              key={task.id}
              task={task}
              index={i}
              selected={task.id === selectedId}
              onSelect={() => setPicked(task.id)}
            />
          ))}
        </ul>
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel depth="raised" radius="bay" className="grid place-items-center px-5 py-7">
          {student ? (
            <>
              <MomentumDial value={student.momentum} delta={student.momentumDelta} size={244} />
              <p className="mt-5 max-w-[15rem] text-center text-[0.8rem] leading-relaxed text-ink-2">
                {student.momentumDelta < 0
                  ? "Momentum eased off rather than reset. Two sessions puts it back."
                  : "Momentum is holding. Keep the sessions coming."}
              </p>
            </>
          ) : (
            <SkeletonDial />
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-4">
          <Readout value={`${remaining}`} label="Minutes left" />
          <Readout value={`${streak}`} label="Day streak" />
        </div>
      </div>
    </section>
  );
}

function MissionSkeleton() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel
        depth="raised"
        radius="bay"
        className="p-6 sm:p-9"
        role="status"
        aria-busy="true"
        aria-label="Planning today's mission"
      >
        <Skeleton className="h-2.5 w-14" />
        <div className="mt-7 space-y-4">
          <Skeleton className="h-11 w-[55%]" delay={0.08} />
          <Skeleton className="h-11 w-[72%]" delay={0.16} />
        </div>
        <Skeleton className="mt-6 h-3 w-[60%]" delay={0.24} />
        <div className="mt-8 flex gap-3">
          <Skeleton radius="rounded-key" className="h-16 w-44" delay={0.3} />
          <Skeleton radius="rounded-key" className="h-16 w-36" delay={0.36} />
        </div>
        <div className="mt-8 space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} radius="rounded-key" className="h-[62px] w-full" delay={0.4 + i * 0.08} />
          ))}
        </div>
        <span className="sr-only">Planning today&apos;s mission</span>
      </Panel>
      <div className="flex flex-col gap-6">
        <Panel depth="raised" radius="bay" className="grid place-items-center px-5 py-7">
          <SkeletonDial />
        </Panel>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton radius="rounded-panel" className="h-[104px]" delay={0.2} />
          <Skeleton radius="rounded-panel" className="h-[104px]" delay={0.28} />
        </div>
      </div>
    </section>
  );
}

function TaskKey({
  task,
  index,
  selected,
  onSelect,
}: {
  task: MissionTask;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const complete = task.status === "complete";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-4 rounded-key px-4 py-3.5 text-left",
          "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          selected
            ? "bg-linear-145 from-base-lo to-base-hi shadow-inset"
            : "bg-linear-145 from-base-hi to-base-lo shadow-raised-sm hover:shadow-raised",
          complete && "opacity-55",
        )}
      >
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full",
            complete ? "bg-teal text-on-accent" : "shadow-inset text-ink-3",
          )}
        >
          {complete ? (
            <CheckIcon width={14} height={14} />
          ) : (
            <span className="readout text-[0.6rem] font-semibold">{index + 1}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[0.95rem] font-medium text-ink",
              complete && "line-through decoration-ink-3/60",
            )}
          >
            {task.topic}
          </span>
          <span className="micro mt-1 block text-ink-3">
            {task.subject} · {kindLabel[task.kind]}
          </span>
        </span>
        <span className="readout shrink-0 text-[0.7rem] font-medium text-ink-2">
          {task.minutes}m
        </span>
      </button>
    </li>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <Panel depth="raised" radius="panel" className="px-4 py-5 text-center">
      <div className="readout text-[1.7rem] font-bold leading-none text-ink">{value}</div>
      <div className="micro mt-2.5 text-ink-3">{label}</div>
    </Panel>
  );
}
