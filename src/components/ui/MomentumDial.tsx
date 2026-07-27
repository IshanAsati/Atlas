"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/* The dial sweeps 280°, leaving an 80° notch at the bottom for the
   digit window. 0 sits at the lower-left, 100 at the lower-right. */
const START = 130;
const SWEEP = 280;

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

const angleFor = (value: number) => START + (Math.min(100, Math.max(0, value)) / 100) * SWEEP;

interface MomentumDialProps {
  value: number;
  /** Change since last week. Negative values draw the amber shed arc. */
  delta?: number;
  size?: number;
  className?: string;
}

/**
 * Momentum, read the way you read a fuel gauge. The teal arc is what
 * you're carrying; the amber arc behind the needle is what decayed
 * this week. Momentum falls off — it never resets to zero — so the
 * needle always has somewhere to come back from.
 */
export function MomentumDial({ value, delta = 0, size = 268, className }: MomentumDialProps) {
  const reduce = useReducedMotion();
  const c = 100;
  const r = 74;

  const peak = Math.min(100, value + Math.max(0, -delta));
  const needleAngle = angleFor(value) - 270;

  const ticks = Array.from({ length: 21 }, (_, i) => {
    const major = i % 5 === 0;
    const a = START + (i / 20) * SWEEP;
    const outer = polar(c, c, 88, a);
    const inner = polar(c, c, major ? 78 : 82, a);
    return { key: i, major, outer, inner, label: major ? i * 5 : null, a };
  });

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Momentum"
    >
      {/* Bezel */}
      <div className="absolute inset-0 rounded-full bg-linear-145 from-base-hi to-base-lo shadow-raised-lg" />
      {/* Well cut into the bezel */}
      <div className="absolute inset-[9%] rounded-full bg-linear-145 from-base-lo to-base-hi shadow-inset-deep" />

      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
        {/* Groove the arc runs in */}
        <path
          d={arc(c, c, r, START, START + SWEEP)}
          stroke="var(--groove)"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={arc(c, c, r, START, START + SWEEP)}
          stroke="var(--emboss)"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
          transform="translate(0.8 0.8)"
        />

        {/* What decayed this week */}
        {peak > value && (
          <path
            d={arc(c, c, r, angleFor(value), angleFor(peak))}
            stroke="var(--color-amber)"
            strokeWidth="9"
            strokeLinecap="butt"
            fill="none"
            opacity="0.6"
          />
        )}

        {/* What you're carrying */}
        <motion.path
          d={arc(c, c, r, START, angleFor(value))}
          stroke="var(--color-teal)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          initial={reduce ? undefined : { pathLength: 0 }}
          animate={reduce ? undefined : { pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Bearing ticks */}
        {ticks.map((t) => (
          <g key={t.key}>
            <line
              x1={t.inner.x}
              y1={t.inner.y}
              x2={t.outer.x}
              y2={t.outer.y}
              stroke={t.major ? "var(--tick-strong)" : "var(--tick)"}
              strokeWidth={t.major ? 1.5 : 1}
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* Needle */}
      <motion.div
        className="absolute inset-0 origin-center"
        initial={reduce ? false : { rotate: angleFor(0) - 270 }}
        animate={{ rotate: needleAngle }}
        transition={{ type: "spring", stiffness: 42, damping: 12, mass: 1.1, delay: 0.15 }}
      >
        <svg viewBox="0 0 200 200" className="size-full overflow-visible">
          <path
            d="M100 34 L103.4 100 L96.6 100 Z"
            fill="var(--color-ink)"
            style={{ filter: "drop-shadow(2px 2px 3px var(--needle-shadow))" }}
          />
          <path d="M100 100 L102 116 L98 116 Z" fill="var(--color-ink-3)" />
        </svg>
      </motion.div>

      {/* Hub cap */}
      <div className="absolute left-1/2 top-1/2 size-[13%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-145 from-base-hi to-base-lo shadow-raised-sm" />

      {/* Digit window, set into the notch at the bottom */}
      <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 rounded-[10px] bg-linear-145 from-base-lo to-base-hi px-3.5 py-1.5 shadow-inset text-center">
        <div className="readout text-[1.55rem] font-bold leading-none text-ink">{value}</div>
        <div
          className={cn(
            "micro mt-1",
            delta < 0 ? "text-amber-deep" : delta > 0 ? "text-teal-deep" : "text-ink-3",
          )}
        >
          {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
          {Math.abs(delta)} 7d
        </div>
      </div>

      {/* Face label */}
      <div className="micro absolute left-1/2 top-[25%] -translate-x-1/2 text-ink-3">Momentum</div>
    </div>
  );
}
