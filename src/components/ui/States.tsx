"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Micro, Panel } from "@/components/ui/Panel";

/* ============================================================
   Empty and loading states, in the panel's own language.

   An instrument with nothing to show doesn't display a cartoon —
   it sits at zero with its dial at rest. Empty states here are a
   recessed well with the needle parked, one sentence saying what
   would fill it, and exactly one way to fill it. Loading states
   are the same panel with its grooves cut but no reading yet.
   ============================================================ */

/**
 * The parked-needle mark. A gauge arc with the needle at its rest
 * position — the visual for "no reading yet" across every screen.
 */
export function RestingDial({ size = 68 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {/* Bearing arc, 280° with the notch at the bottom */}
      <path
        d="M 26.9 73.1 A 33 33 0 1 1 73.1 73.1"
        stroke="var(--tick)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Needle parked at the zero detent */}
      <path
        d="M50 50 L28.5 71.5"
        stroke="var(--ink-3)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="4.5" fill="var(--ink-3)" />
    </svg>
  );
}

interface EmptyBayProps {
  /** What this panel measures, in the pillar's voice. */
  eyebrow?: string;
  /** One sentence. Say what would appear here, not that it's empty. */
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** Drop the dial when the bay is small or sits beside another one. */
  mark?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * The empty state for a whole panel. Sits inside the panel it replaces
 * so the page keeps its shape whether there's data or not.
 */
export function EmptyBay({
  eyebrow,
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  mark = true,
  className,
  children,
}: EmptyBayProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 rounded-panel px-6 py-10 text-center",
        "bg-linear-145 from-base-lo to-base-hi shadow-inset",
        className,
      )}
    >
      {mark ? <RestingDial /> : null}

      <div className="max-w-[26rem] space-y-2.5">
        {eyebrow ? <Micro className="block">{eyebrow}</Micro> : null}
        <p className="font-display text-[1.25rem] font-semibold leading-snug tracking-[-0.02em] text-ink">
          {title}
        </p>
        {body ? <p className="text-[0.9rem] leading-relaxed text-ink-2">{body}</p> : null}
      </div>

      {actionLabel ? (
        <Key tone="primary" size="md" href={actionHref} onClick={onAction}>
          {actionLabel}
        </Key>
      ) : null}

      {children}
    </div>
  );
}

/* ============================================================
   Loading
   ============================================================ */

/**
 * A groove with no reading in it. Breathes rather than shimmers —
 * a sweeping gradient reads as a web template; a slow pulse reads
 * as an instrument warming up.
 */
export function Skeleton({
  className,
  radius = "rounded-full",
  delay = 0,
}: {
  className?: string;
  radius?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className={cn("block bg-groove shadow-inset", radius, className)}
      animate={reduce ? undefined : { opacity: [0.55, 0.95, 0.55] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

/* Ragged widths so a stack of lines reads as text, not as a table. */
const LINE_WIDTHS = ["w-[78%]", "w-[92%]", "w-[64%]", "w-[84%]", "w-[70%]"];

/** A few skeleton lines at text proportions. */
export function SkeletonLines({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", LINE_WIDTHS[i % LINE_WIDTHS.length])}
          delay={i * 0.12}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Placeholder for a labelled meter row — the shape used all over Atlas. */
export function SkeletonMeterRow({ delay = 0 }: { delay?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-[45%]" delay={delay} />
        <Skeleton className="h-3 w-9" delay={delay + 0.05} />
      </div>
      <Skeleton className="h-2" delay={delay + 0.1} />
    </div>
  );
}

/** A whole panel's worth of loading, with the heading shape preserved. */
export function SkeletonPanel({
  rows = 4,
  title = true,
  label,
  className,
}: {
  rows?: number;
  title?: boolean;
  /** Announced to screen readers so the wait isn't silent. */
  label: string;
  className?: string;
}) {
  return (
    <Panel
      depth="raised"
      radius="bay"
      className={cn("p-6 sm:p-7", className)}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      {title ? (
        <div className="mb-6 space-y-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-5 w-40" delay={0.08} />
        </div>
      ) : null}
      <div className="space-y-5">
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonMeterRow key={i} delay={i * 0.14} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </Panel>
  );
}

/** The dial bay while the reading is still being fetched. */
export function SkeletonDial({ size = 244 }: { size?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      aria-busy="true"
      aria-label="Loading momentum"
      className="relative grid place-items-center rounded-full bg-linear-145 from-base-lo to-base-hi shadow-inset-deep"
      style={{ width: size, height: size }}
      animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <RestingDial size={size * 0.42} />
      <span className="sr-only">Loading momentum</span>
    </motion.div>
  );
}
