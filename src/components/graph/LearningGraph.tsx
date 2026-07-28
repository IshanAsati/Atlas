"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ConfidenceMeter } from "@/components/ui/Meters";
import { statusColor, statusLabel } from "@/lib/status";
import { ArrowIcon } from "@/components/ui/Icons";
import { useLiveTopics } from "@/lib/liveConfidence";
import { useAtlasData } from "@/lib/atlas-context";
import { topicStatus, type Topic } from "@/lib/mock";

/* Geometry is fixed rather than measured, so the connector curves can be
   drawn without a layout pass. */
const NODE_H = 68;
const GAP = 18;
const COL_W = 196;
const COL_GAP = 76;
const STEP = NODE_H + GAP;

interface Placed {
  id: string;
  label: string;
  sub?: string;
  confidence?: number;
  x: number;
  y: number;
}

export function LearningGraph() {
  const reduce = useReducedMotion();
  const { subjects } = useAtlasData();
  const [subjectId, setSubjectId] = useState(subjects[0].id);
  const [topicId, setTopicId] = useState<string | null>("t3");

  /* Reads through the live store, so a confidence change made by the coach
     in Focus Mode is already reflected here. */
  const allTopics = useLiveTopics();
  const bySubject = useCallback(
    (id: string) => allTopics.filter((t) => t.subjectId === id),
    [allTopics],
  );
  const averageFor = useCallback(
    (id: string) => {
      const list = bySubject(id);
      if (!list.length) return 0;
      return Math.round(list.reduce((sum, t) => sum + t.confidence, 0) / list.length);
    },
    [bySubject],
  );

  const disciplines = useMemo(
    () => [...new Set(subjects.map((s) => s.discipline))],
    [],
  );
  const topics = useMemo(() => bySubject(subjectId), [bySubject, subjectId]);

  const canvasH = Math.max(subjects.length, topics.length) * STEP - GAP;

  const blockTop = (count: number) => (canvasH - (count * STEP - GAP)) / 2;

  const subjectNodes: Placed[] = subjects.map((s, i) => ({
    id: s.id,
    label: s.name,
    sub: `${bySubject(s.id).length} ${bySubject(s.id).length === 1 ? "topic" : "topics"}`,
    confidence: averageFor(s.id),
    x: COL_W + COL_GAP,
    y: blockTop(subjects.length) + i * STEP,
  }));

  const disciplineNodes: Placed[] = disciplines.map((d) => {
    const children = subjectNodes.filter(
      (n) => subjects.find((s) => s.id === n.id)?.discipline === d,
    );
    const y = children.reduce((sum, c) => sum + c.y, 0) / children.length;
    const sub = `${children.length} ${children.length === 1 ? "subject" : "subjects"}`;
    return { id: d, label: d, sub, x: 0, y };
  });

  const topicNodes: Placed[] = topics.map((t, i) => ({
    id: t.id,
    label: t.name,
    confidence: t.confidence,
    x: (COL_W + COL_GAP) * 2,
    y: blockTop(topics.length) + i * STEP,
  }));

  const selectedTopic = topics.find((t) => t.id === topicId) ?? null;

  const edges: { from: Placed; to: Placed; live: boolean }[] = [
    ...subjectNodes.map((n) => {
      const discipline = subjects.find((s) => s.id === n.id)?.discipline;
      return {
        from: disciplineNodes.find((d) => d.id === discipline)!,
        to: n,
        live: n.id === subjectId,
      };
    }),
    ...topicNodes.map((n) => ({
      from: subjectNodes.find((s) => s.id === subjectId)!,
      to: n,
      live: n.id === topicId,
    })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel depth="inset" radius="bay" className="overflow-x-auto p-6 sm:p-8">
        <div
          className="relative mx-auto"
          style={{ width: COL_W * 3 + COL_GAP * 2, height: canvasH }}
        >
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width="100%"
            height="100%"
            aria-hidden
          >
            {edges.map((edge, i) => {
              const x1 = edge.from.x + COL_W;
              const y1 = edge.from.y + NODE_H / 2;
              const x2 = edge.to.x;
              const y2 = edge.to.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={edge.live ? "var(--color-teal)" : "var(--tick)"}
                  strokeWidth={edge.live ? 2 : 1.25}
                  opacity={edge.live ? 0.9 : 0.55}
                />
              );
            })}
          </svg>

          {disciplineNodes.map((node) => (
            <GraphNode key={node.id} node={node} variant="discipline" />
          ))}

          {subjectNodes.map((node) => (
            <GraphNode
              key={node.id}
              node={node}
              variant="subject"
              active={node.id === subjectId}
              onSelect={() => {
                setSubjectId(node.id);
                setTopicId(bySubject(node.id)[0]?.id ?? null);
              }}
            />
          ))}

          {topicNodes.map((node) => {
            const topic = topics.find((t) => t.id === node.id)!;
            return (
              <GraphNode
                key={node.id}
                node={node}
                variant="topic"
                status={topicStatus(topic.confidence, topic.lastSeenDays)}
                active={node.id === topicId}
                onSelect={() => setTopicId(node.id)}
                reduce={!!reduce}
              />
            );
          })}
        </div>
      </Panel>

      <TopicInspector topic={selectedTopic} />
    </div>
  );
}

function GraphNode({
  node,
  variant,
  active = false,
  status,
  onSelect,
  reduce = false,
}: {
  node: Placed;
  variant: "discipline" | "subject" | "topic";
  active?: boolean;
  status?: ReturnType<typeof topicStatus>;
  onSelect?: () => void;
  reduce?: boolean;
}) {
  const interactive = Boolean(onSelect);
  const Tag = interactive ? motion.button : motion.div;

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onSelect}
      aria-pressed={interactive ? active : undefined}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute flex flex-col justify-center rounded-key px-4 text-left",
        "transition-shadow duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        active
          ? "bg-linear-145 from-base-lo to-base-hi shadow-inset"
          : "bg-linear-145 from-base-hi to-base-lo shadow-raised",
        interactive && !active && "hover:shadow-raised-lg",
        variant === "discipline" && "opacity-90",
      )}
      style={{ left: node.x, top: node.y, width: COL_W, height: NODE_H }}
    >
      <span
        className={cn(
          "truncate font-medium",
          variant === "discipline" ? "font-display text-[1rem]" : "text-[0.9rem]",
          active ? "text-teal-deep" : "text-ink",
        )}
      >
        {node.label}
      </span>

      {variant === "topic" && status ? (
        <span className="mt-2 flex items-center gap-2.5">
          <ConfidenceMeter value={node.confidence ?? 0} status={status} height={6} />
          <span className="readout shrink-0 text-[0.62rem] font-semibold text-ink-2">
            {node.confidence}%
          </span>
        </span>
      ) : (
        <span className="micro mt-1.5 block text-ink-3">
          {node.sub}
          {variant === "subject" && node.confidence !== undefined
            ? ` · ${node.confidence}%`
            : ""}
        </span>
      )}
    </Tag>
  );
}

function TopicInspector({ topic }: { topic: Topic | null }) {
  if (!topic) {
    return (
      <Panel depth="raised" radius="bay" className="grid place-items-center p-8 text-center">
        <p className="max-w-[15rem] text-[0.9rem] leading-relaxed text-ink-2">
          Pick a topic on the left to see where it stands and start a short revision.
        </p>
      </Panel>
    );
  }

  const status = topicStatus(topic.confidence, topic.lastSeenDays);

  return (
    <Panel depth="raised" radius="bay" className="flex flex-col p-6 sm:p-7">
      <Micro>Track</Micro>
      <h2 className="mt-2.5 font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
        {topic.name}
      </h2>

      <div className="mt-6 flex items-end justify-between gap-3">
        <span className="readout text-[2.6rem] font-bold leading-none text-ink">
          {topic.confidence}
          <span className="text-[1.1rem] text-ink-3">%</span>
        </span>
        <span
          className="micro rounded-full px-3 py-1.5"
          style={{
            color: statusColor[status],
            background: "linear-gradient(145deg, var(--surface-lo), var(--surface-hi))",
            boxShadow: "var(--shadow-inset)",
          }}
        >
          {statusLabel[status]}
        </span>
      </div>

      <div className="mt-4">
        <ConfidenceMeter value={topic.confidence} status={status} height={10} />
      </div>

      <Groove className="my-6" />

      <dl className="space-y-3.5">
        <Row label="Last studied" value={`${topic.lastSeenDays} days ago`} />
        <Row
          label="Next review"
          value={new Date(`${topic.nextReview}T00:00:00`).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })}
        />
      </dl>

      <Key
        href={`/focus?topic=${topic.id}`}
        tone="primary"
        size="md"
        className="mt-7 w-full"
        icon={<ArrowIcon width={16} height={16} />}
      >
        Revise for 8 min
      </Key>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[0.85rem] text-ink-2">{label}</dt>
      <dd className="readout text-[0.8rem] font-medium text-ink">{value}</dd>
    </div>
  );
}
