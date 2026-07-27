"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { TopicStatus } from "@/lib/mock";
import { statusColor } from "@/lib/status";

/**
 * Confidence, cut into the surface as a groove with the fill resting
 * inside it. Teal for held, amber for decaying, grey for untouched.
 */
export function ConfidenceMeter({
  value,
  status,
  height = 10,
  className,
  showTrack = true,
}: {
  value: number;
  status: TopicStatus;
  height?: number;
  className?: string;
  showTrack?: boolean;
}) {
  const reduce = useReducedMotion();
  /* Width is driven by CSS rather than Framer: Framer resolves a
     percentage against the parent at animation start, which on a flex
     child that hasn't been laid out yet lands on the wrong pixel value. */
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full", showTrack && "shadow-inset", className)}
      style={{
        height,
        /* An untouched topic gets a hatched empty groove — visibly "no
           reading yet" rather than a bar that could be misread as full. */
        background: !showTrack
          ? "transparent"
          : status === "untouched"
            ? "repeating-linear-gradient(115deg, var(--groove-hatch) 0 3px, var(--surface-lo) 3px 7px)"
            : "var(--groove)",
      }}
    >
      {status !== "untouched" && (
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: reduce || filled ? `${Math.max(value, 2)}%` : "0%",
            background: statusColor[status],
            boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--emboss) 45%, transparent)",
            transition: reduce ? undefined : "width 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      )}
    </div>
  );
}

/**
 * XP ring. Sits around the level badge on Progress — a ring rather
 * than a bar because level is cyclical, not a journey to an end.
 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  color = "var(--color-teal)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* The ring sits in a groove, like every other reading */}
      <div
        className="absolute rounded-full shadow-inset"
        style={{ inset: stroke / 2 - 1 }}
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--groove)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** Coloured pip used in legends and calendar cells. */
export function Pip({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-1.5 rounded-full", className)}
      style={{ background: color, boxShadow: "0 1px 1px color-mix(in srgb, var(--emboss) 80%, transparent)" }}
    />
  );
}
