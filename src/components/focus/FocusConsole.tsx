"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { IconKey } from "@/components/ui/Key";
import { Micro, Panel } from "@/components/ui/Panel";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon, SkipIcon } from "@/components/ui/Icons";
import { daysUntil, mission, subjects, topics, type MissionTask } from "@/lib/mock";
import { applyConfidenceDelta } from "@/lib/liveConfidence";

const PRESETS = [
  { label: "15 min", session: 15 * 60, break: 5 * 60 },
  { label: "25 min", session: 25 * 60, break: 5 * 60 },
  { label: "45 min", session: 45 * 60, break: 10 * 60 },
  { label: "60 min", session: 60 * 60, break: 15 * 60 },
];

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
  const [missionLoaded, setMissionLoaded] = useState(false);

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
        if (!cancelled) setMissionLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const task: MissionTask | undefined =
    missionTasks.find((t) => topicParam ? t.topicId === topicParam : t.status === "active") ??
    missionTasks.find((t) => t.status === "active") ??
    missionTasks[0];

  const [presetIdx, setPresetIdx] = useState(1);
  const preset = PRESETS[presetIdx];
  const [repetitions, setRepetitions] = useState(1);

  const sessionDuration = preset.session;
  const breakDuration = preset.break;

  const [left, setLeft] = useState(sessionDuration);
  const [running, setRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [markedComplete, setMarkedComplete] = useState(false);
  const [done, setDone] = useState(false);

  const finished = left === 0;
  const ticking = running && !finished;

  useEffect(() => {
    setLeft(sessionDuration);
    setOnBreak(false);
    setRunning(false);
    setSessionCount(0);
    setDone(false);
  }, [sessionDuration]);

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    if (!finished || done) return;
    if (onBreak) {
      if (sessionCount >= repetitions) {
        setDone(true);
        setRunning(false);
        return;
      }
      setOnBreak(false);
      setRunning(true);
      setLeft(sessionDuration);
    } else {
      setSessionCount((c) => c + 1);
      setOnBreak(true);
      setLeft(breakDuration);
    }
  }, [finished, onBreak, done, sessionCount, repetitions, sessionDuration, breakDuration]);

  const handlePlayPause = () => {
    if (done) {
      setLeft(sessionDuration);
      setOnBreak(false);
      setSessionCount(0);
      setDone(false);
      setRunning(true);
      return;
    }
    if (finished && !onBreak) {
      setLeft(sessionDuration);
    }
    setRunning((v) => !v);
  };

  const handleSkipToBreak = () => {
    if (done) return;
    setLeft(0);
    setRunning(false);
  };

  const handleMarkComplete = () => {
    if (!task) return;
    applyConfidenceDelta(task.topicId, 5);
    setMarkedComplete(true);
  };

  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!markedComplete) return;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setMarkedComplete(false), 2000);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [markedComplete]);

  const totalSessions = repetitions;
  const elapsed = 1 - left / (onBreak ? breakDuration : sessionDuration);

  return (
    <div className="flex min-h-screen flex-col px-5 py-6 sm:px-8">
      {!missionLoaded ? (
        <div className="mx-auto flex flex-1 items-center justify-center">
          <Micro className="text-ink-3">Loading…</Micro>
        </div>
      ) : !task ? (
        <div className="mx-auto flex flex-1 items-center justify-center">
          <Micro className="text-ink-3">No active task</Micro>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-key bg-linear-145 from-base-hi to-base-lo px-4 py-2.5 text-ink-2 shadow-raised transition-all hover:text-ink active:shadow-pressed"
            >
              <CloseIcon width={15} height={15} />
              <span className="micro">End session</span>
            </Link>
            <Link href={`/coach?topic=${task.topicId}`} className="micro text-teal-deep underline underline-offset-4">
              Talk to AI Coach
            </Link>
            <ThemeToggle />
          </header>

          <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center text-center">
            <Micro className="text-ink-3">{task.subject}</Micro>
            <h1 className="mt-3 font-display text-[2.2rem] font-semibold tracking-[-0.025em] text-ink sm:text-[2.75rem]">
              {task.topic}
            </h1>

            {onBreak ? (
              <Micro className="mt-6 rounded-full bg-amber-wash/50 px-4 py-1.5 text-amber-deep">
                Break · {clock(left)}
              </Micro>
            ) : (
              <div
                className="readout mt-8 text-[clamp(4rem,14vw,7.5rem)] font-bold leading-none tracking-[-0.04em] text-ink"
                aria-live="off"
              >
                {clock(left)}
              </div>
            )}

            {/* Depletion trench */}
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
                <Micro>{onBreak ? clock(preset.break) : clock(preset.session)}</Micro>
              </div>
            </div>

            {/* Session counters */}
            <Micro className="mt-4 text-ink-3">
              Session {Math.min(sessionCount + 1, totalSessions)} of {totalSessions}
            </Micro>

            {/* Transport */}
            <div className="mt-9 flex items-center gap-4">
              <IconKey label="Skip to break" className="size-12" onClick={handleSkipToBreak}>
                <SkipIcon width={18} height={18} />
              </IconKey>
              <button
                type="button"
                onClick={handlePlayPause}
                aria-label={ticking ? "Pause" : "Start"}
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
                label={markedComplete ? "Done!" : "Mark complete"}
                className="size-12"
                onClick={handleMarkComplete}
              >
                <CheckIcon width={18} height={18} />
              </IconKey>
            </div>

            <p className="micro mt-6 text-ink-3">
              {done
                ? "All done · great work today"
                : finished && onBreak
                  ? "Break time · stretch, hydrate"
                  : finished
                    ? "Session done"
                    : ticking
                      ? onBreak
                        ? "Break · rest your eyes"
                        : "Running · phone face down"
                      : "Paused · press play to start"}
            </p>

            {/* Customization */}
            <Panel depth="inset" radius="bay" className="mt-10 w-full p-5 text-left">
              <Micro className="text-ink-3">Session settings</Micro>
              <div className="mt-4 flex gap-2">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPresetIdx(i)}
                    aria-pressed={i === presetIdx}
                    className={cn(
                      "micro flex-1 rounded-key px-3 py-2 transition-all",
                      i === presetIdx
                        ? "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised"
                        : "text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Micro className="text-ink-3">Sessions:</Micro>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRepetitions(n)}
                    aria-pressed={n === repetitions}
                    className={cn(
                      "micro rounded-key px-3 py-1.5 transition-all",
                      n === repetitions
                        ? "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised"
                        : "text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
