"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Micro, Panel } from "@/components/ui/Panel";
import { MomentumDial } from "@/components/ui/MomentumDial";
import { ArrowIcon, CheckIcon, ClockIcon } from "@/components/ui/Icons";
import { useAtlasData } from "@/lib/atlas-context";
import { type MissionTask } from "@/lib/mock";

const kindLabel: Record<MissionTask["kind"], string> = {
  revise: "Revise",
  learn: "Learn",
  quiz: "Quiz",
};

export function TodayMission() {
  const reduce = useReducedMotion();
  const { mission, student } = useAtlasData();
  const firstOpen = mission.tasks.find((t) => t.status !== "complete") ?? mission.tasks[0];
  const [selectedId, setSelectedId] = useState(firstOpen.id);
  const [queue, setQueue] = useState(mission.tasks);
  const selected = queue.find((t) => t.id === selectedId) ?? firstOpen;

  const done = queue.filter((t) => t.status === "complete");
  const remaining = queue
    .filter((t) => t.status !== "complete")
    .reduce((sum, t) => sum + t.minutes, 0);

  const handleSwap = () => {
    const pending = queue.filter((t) => t.status !== "complete");
    if (pending.length < 2) return;
    const nextIdx = pending.findIndex((t) => t.id === selected.id);
    const swapWith = pending[(nextIdx + 1) % pending.length];
    const reordered = queue.map((t) => {
      if (t.id === selected.id) return swapWith;
      if (t.id === swapWith.id) return selected;
      return t;
    });
    setQueue(reordered);
    setSelectedId(swapWith.id);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* The thesis: Atlas has already decided. */}
      <Panel depth="raised" radius="bay" className="overflow-hidden p-7 sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <Micro>Today · Mon 27 Jul</Micro>
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
          <p className="font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-[3.4rem]">
            Start with
            <br />
            <span className="text-teal-deep">{selected.topic}.</span>
          </p>
          <p className="mt-4 max-w-lg text-[0.98rem] leading-relaxed text-ink-2">
            {selected.reason}
          </p>
        </motion.div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Key href={`/focus?topic=${selected.topicId}`} tone="primary" size="lg" icon={<ArrowIcon width={17} height={17} />}>
            Begin focus
          </Key>
          <Key size="lg" tone="quiet" onClick={handleSwap}>
            Swap this task
          </Key>
          <span className="ml-auto inline-flex items-center gap-2 text-ink-3">
            <ClockIcon width={16} height={16} />
            <span className="readout text-xs font-medium">{selected.minutes} min</span>
          </span>
        </div>

        {/* The rest of the queue, in the order the planner set */}
        <ul className="mt-8 space-y-2.5">
          {queue.map((task, i) => (
            <TaskKey
              key={task.id}
              task={task}
              index={i}
              selected={task.id === selectedId}
              onSelect={() => setSelectedId(task.id)}
            />
          ))}
        </ul>
      </Panel>

      {/* Instruments */}
      <div className="flex flex-col gap-6">
        <Panel depth="raised" radius="bay" className="grid place-items-center px-5 py-7">
          <MomentumDial value={student.momentum} delta={student.momentumDelta} size={244} />
          <p className="mt-5 max-w-[15rem] text-center text-[0.8rem] leading-relaxed text-ink-2">
            You skipped Wednesday. Momentum eased off rather than reset — two sessions puts it back.
          </p>
        </Panel>

        <div className="grid grid-cols-2 gap-4">
          <Readout value={`${remaining}`} label="Minutes left" />
          <Readout value="6" label="Day streak" />
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
