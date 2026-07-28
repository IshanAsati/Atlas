"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ConfidenceMeter } from "@/components/ui/Meters";
import { EmptyBay, SkeletonMeterRow } from "@/components/ui/States";
import { statusLabel } from "@/lib/status";
import { ChevronIcon } from "@/components/ui/Icons";
import { useConfidenceOverrides } from "@/lib/liveConfidence";
import { useAtlasData } from "@/lib/atlas-context";
import { topicStatus } from "@/lib/mock";

/**
 * ADAPT. What the engine thinks is slipping, worst first. This panel
 * exists to make decay visible before a quiz makes it obvious.
 */
export function RevisionQueue() {
  const { topics, subjects, loading } = useAtlasData();
  /* Overlay the coach's changes so the dashboard never disagrees with what
     you were just told in the coaching session. */
  const overrides = useConfidenceOverrides();

  const queue = useMemo(
    () =>
      topics
        .map((t) => (t.id in overrides ? { ...t, confidence: overrides[t.id] } : t))
        .filter((t) => t.confidence > 0 && t.confidence < 75)
        .sort((a, b) => a.confidence - b.confidence)
        .slice(0, 5),
    [topics, overrides],
  );

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name;

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

      {loading ? (
        <div className="space-y-5" role="status" aria-busy="true" aria-label="Loading revision queue">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonMeterRow key={i} delay={i * 0.14} />
          ))}
          <span className="sr-only">Loading revision queue</span>
        </div>
      ) : topics.length === 0 ? (
        <EmptyBay
          title="Nothing to revise yet."
          body="Once Atlas knows your syllabus, the topics slipping fastest show up here first."
          actionLabel="Add your syllabus"
          actionHref="/onboarding"
          mark={false}
          className="py-8"
        />
      ) : queue.length === 0 ? (
        <EmptyBay
          title="Nothing is slipping."
          body="Every topic you've studied is holding above 75%. Atlas will flag them here as confidence decays."
          mark={false}
          className="py-8"
        />
      ) : (
        <ul className="space-y-4">
          {queue.map((topic) => {
            const status = topicStatus(topic.confidence, topic.lastSeenDays);
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
                  <Micro>{subjectName(topic.subjectId)}</Micro>
                  <Micro className={status === "fading" ? "text-amber-deep" : "text-ink-3"}>
                    {statusLabel[status]} · {topic.lastSeenDays}d ago
                  </Micro>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
