"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ConfidenceMeter } from "@/components/ui/Meters";
import { ArrowIcon } from "@/components/ui/Icons";
import { topicStatus } from "@/lib/mock";
import { useCoach } from "@/lib/coach/useCoach";
import type { CoachContext, CoachTurn } from "@/lib/coach/types";

interface CoachPanelProps {
  context: CoachContext;
  initialTurns?: CoachTurn[];
  className?: string;
}

/**
 * Where the two minds meet. The thread is on the left of the student's
 * attention and their confidence in the topic sits at the top of the panel,
 * moving as the coach evaluates — so the effect of the conversation on
 * Atlas's model of them is visible while they talk.
 */
export function CoachPanel({ context, initialTurns = [], className }: CoachPanelProps) {
  const reduce = useReducedMotion();
  const coach = useCoach({ context, initialTurns });
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  /* Follow the stream, but only within the thread — never yank the page. */
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [coach.turns, coach.streamed, coach.status]);

  const submit = () => {
    if (!draft.trim() || coach.busy) return;
    void coach.send(draft);
    setDraft("");
  };

  const status = topicStatus(coach.confidence, context.lastSeenDays);

  return (
    <Panel depth="raised" radius="bay" className={cn("flex flex-col p-6 sm:p-7", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Micro>Learn</Micro>
          <h2 className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.02em] text-ink">
            AI Coach
          </h2>
        </div>
        <SourceBadge source={coach.source} />
      </div>

      {/* Atlas's live reading of this topic */}
      <div className="mt-5 rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-3 shadow-inset">
        <div className="flex items-baseline justify-between gap-3">
          <Micro>Confidence · {context.topic}</Micro>
          <span className="flex items-baseline gap-2">
            <span className="readout text-[0.8rem] font-bold text-ink">{coach.confidence}%</span>
            <AnimatePresence>
              {coach.lastDelta !== null && coach.lastDelta !== 0 && (
                <motion.span
                  key={`${coach.lastDelta}-${coach.confidence}`}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "micro",
                    coach.lastDelta > 0 ? "text-teal-deep" : "text-amber-deep",
                  )}
                >
                  {coach.lastDelta > 0 ? "+" : "−"}
                  {Math.abs(coach.lastDelta)}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </div>
        <div className="mt-2.5">
          <ConfidenceMeter value={coach.confidence} status={status} height={8} showTrack={false} />
        </div>
      </div>

      <Groove className="my-5" />

      {/* Thread */}
      <div
        ref={threadRef}
        className="max-h-[38vh] min-h-[180px] space-y-4 overflow-y-auto pr-1 lg:max-h-[42vh]"
      >
        {coach.turns.map((turn, i) => (
          <Bubble key={i} turn={turn} />
        ))}

        {coach.status === "thinking" && <Thinking />}

        {coach.streamed && (
          <div>
            <Micro className="text-teal-deep">Atlas</Micro>
            <p className="mt-2 rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-3 text-[0.9rem] leading-relaxed text-ink shadow-inset">
              {coach.streamed}
              <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-teal align-middle" />
            </p>
          </div>
        )}

        {coach.error && (
          <div className="rounded-key bg-amber-wash/60 px-4 py-3">
            <p className="text-[0.85rem] leading-snug text-amber-deep">{coach.error}</p>
            <button
              type="button"
              onClick={coach.retry}
              className="micro mt-2 text-ink-2 underline underline-offset-4 hover:text-ink"
            >
              Try again
            </button>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* A check the coach decided to set */}
      {coach.question && (
        <QuizBlock
          stem={coach.question.stem}
          options={coach.question.options}
          disabled={coach.busy}
          onAnswer={(answer) => void coach.send(answer)}
        />
      )}

      <Groove className="my-5" />

      {/* Composer */}
      <div className="flex items-end gap-2.5">
        <label className="sr-only" htmlFor="coach-input">
          Message the coach
        </label>
        <textarea
          id="coach-input"
          rows={1}
          value={draft}
          disabled={coach.busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={coach.busy ? "Atlas is thinking…" : "Answer, or ask what you're stuck on"}
          className={cn(
            "max-h-32 min-h-[46px] flex-1 resize-none rounded-key bg-linear-145 from-base-lo to-base-hi",
            "px-4 py-3 text-[0.9rem] leading-snug text-ink shadow-inset outline-none",
            "placeholder:text-ink-3 disabled:opacity-60",
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim() || coach.busy}
          aria-label="Send to coach"
          className={cn(
            "grid size-[46px] shrink-0 place-items-center rounded-key transition-all duration-200",
            "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised",
            "active:shadow-pressed active:translate-y-px",
            "disabled:text-ink-3 disabled:shadow-raised-sm disabled:opacity-50",
          )}
        >
          <ArrowIcon width={18} height={18} />
        </button>
      </div>
      <Micro className="mt-3 text-ink-3">
        Atlas won&apos;t hand you the answer — that&apos;s the point
      </Micro>
    </Panel>
  );
}

function Bubble({ turn }: { turn: CoachTurn }) {
  const isCoach = turn.role === "coach";
  return (
    <div>
      <Micro className={isCoach ? "text-teal-deep" : "text-ink-3"}>
        {isCoach ? "Atlas" : "You"}
      </Micro>
      <p
        className={cn(
          "mt-2 whitespace-pre-wrap rounded-key px-4 py-3 text-[0.9rem] leading-relaxed",
          isCoach
            ? "bg-linear-145 from-base-lo to-base-hi text-ink shadow-inset"
            : "bg-linear-145 from-base-hi to-base-lo text-ink-2 shadow-raised-sm",
        )}
      >
        {turn.body}
      </p>
      {turn.misconception ? (
        <p className="mt-2 flex items-start gap-2 rounded-key bg-amber-wash/70 px-3 py-2 text-[0.75rem] leading-snug text-amber-deep">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber" />
          Misconception: {turn.misconception}
        </p>
      ) : null}
    </div>
  );
}

/** Three grooves lighting in sequence — the panel's own idle animation. */
function Thinking() {
  return (
    <div>
      <Micro className="text-teal-deep">Atlas</Micro>
      <div className="mt-2 inline-flex items-center gap-2 rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-4 shadow-inset">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-teal"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

function QuizBlock({
  stem,
  options,
  disabled,
  onAnswer,
}: {
  stem: string;
  options: string[];
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  return (
    <div className="mt-5">
      <Micro>Check yourself</Micro>
      <p className="mt-2 text-[0.875rem] leading-snug text-ink">{stem}</p>
      <ul className="mt-3 space-y-2.5">
        {options.map((option, i) => (
          <li key={option}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(option)}
              className={cn(
                "flex w-full items-start gap-3 rounded-key px-4 py-3 text-left text-[0.875rem] leading-snug",
                "bg-linear-145 from-base-hi to-base-lo text-ink-2 shadow-raised-sm",
                "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "hover:text-ink hover:shadow-raised active:shadow-pressed",
                "disabled:opacity-50",
              )}
            >
              <span className="readout mt-0.5 text-[0.65rem] font-semibold text-ink-3">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceBadge({ source }: { source: "live" | "offline" | null }) {
  if (!source) {
    return (
      <span className="micro rounded-full bg-linear-145 from-base-lo to-base-hi px-3 py-1.5 text-ink-2 shadow-inset">
        Socratic
      </span>
    );
  }
  const live = source === "live";
  return (
    <span
      className="micro inline-flex items-center gap-2 rounded-full bg-linear-145 from-base-lo to-base-hi px-3 py-1.5 shadow-inset"
      title={
        live
          ? "Answering with DeepSeek V4 Flash"
          : "No network — answering from the on-device coach"
      }
    >
      <span className={cn("size-1.5 rounded-full", live ? "bg-teal" : "bg-amber")} />
      <span className={live ? "text-ink-2" : "text-amber-deep"}>
        {live ? "DeepSeek" : "Offline"}
      </span>
    </span>
  );
}
