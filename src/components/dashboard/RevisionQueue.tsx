"use client";

import Link from "next/link";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ConfidenceMeter } from "@/components/ui/Meters";
import { statusLabel } from "@/lib/status";
import { ChevronIcon } from "@/components/ui/Icons";
import { useLiveTopics } from "@/lib/liveConfidence";
import { subjectById, topicStatus } from "@/lib/mock";

/**
 * ADAPT. What the engine thinks is slipping, worst first. This panel
 * exists to make decay visible before a quiz makes it obvious.
 */
export function RevisionQueue() {
  /* Same store the coach writes to, so the dashboard never disagrees with
     what you were just told in Focus Mode. */
  const queue = useLiveTopics()
    .filter((t) => t.confidence > 0 && t.confidence < 75)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 5);

  return (
    <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <Micro>Adapt</Micro>
          <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
            Slipping away
          </h2>
        </div>
        <Link
          href="/graph"
          className="micro inline-flex items-center gap-1 text-ink-3 transition-colors hover:text-teal-deep"
        >
          All topics
          <ChevronIcon width={12} height={12} />
        </Link>
      </div>

      <Groove className="my-5" />

      <ul className="space-y-4">
        {queue.map((topic) => {
          const status = topicStatus(topic.confidence, topic.lastSeenDays);
          const subject = subjectById(topic.subjectId);
          return (
            <li key={topic.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[0.9rem] font-medium text-ink">{topic.name}</span>
                <span className="readout shrink-0 text-[0.7rem] font-semibold text-ink-2">
                  {topic.confidence}%
                </span>
              </div>
              <div className="mt-2">
                <ConfidenceMeter value={topic.confidence} status={status} height={8} />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <Micro>{subject?.name}</Micro>
                <Micro
                  className={
                    status === "fading" ? "text-amber-deep" : "text-ink-3"
                  }
                >
                  {statusLabel[status]} · {topic.lastSeenDays}d ago
                </Micro>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
