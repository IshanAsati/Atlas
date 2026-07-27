"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Micro } from "@/components/ui/Panel";

/* Both charts show one series each, so neither carries a legend — the
   panel heading names the measure. Colour is the system teal; the ink
   tokens carry all text. */

const W = 620;
const H = 170;
const PAD = { top: 16, right: 12, bottom: 22, left: 12 };

export function MomentumTrend({ data }: { data: number[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const min = Math.min(...data) - 6;
  const max = Math.max(...data) + 6;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;

  const line = data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L ${x(data.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`;

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, index)));
  };

  const last = data.length - 1;
  const active = hover ?? last;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`Momentum over the last ${data.length} days, currently ${data[last]}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="momentum-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Recessive baseline */}
        <line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={W - PAD.right}
          y2={PAD.top + innerH}
          stroke="var(--tick)"
          strokeWidth="1"
        />

        <path d={area} fill="url(#momentum-fill)" />
        <path d={line} fill="none" stroke="var(--color-teal)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Crosshair */}
        <line
          x1={x(active)}
          y1={PAD.top}
          x2={x(active)}
          y2={PAD.top + innerH}
          stroke="var(--tick-strong)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle cx={x(active)} cy={y(data[active])} r="5" fill="var(--color-teal)" stroke="var(--surface-hi)" strokeWidth="2" />
      </svg>

      <div className="mt-1 flex items-baseline justify-between">
        <Micro>14 days ago</Micro>
        <span className="readout text-[0.75rem] font-semibold text-ink">
          {data[active]}
          <span className="micro ml-1.5 text-ink-3">
            {active === last ? "today" : `day ${active + 1}`}
          </span>
        </span>
      </div>
    </div>
  );
}

export function WeeklyBars({
  data,
  target,
}: {
  data: { day: string; minutes: number }[];
  target: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(target, ...data.map((d) => d.minutes)) * 1.12;

  return (
    <div>
      <div className="relative h-[168px] rounded-key bg-linear-145 from-base-lo to-base-hi px-3 pb-3 pt-4 shadow-inset">
        {/* Daily target — the number the planner budgets against */}
        <div
          className="pointer-events-none absolute inset-x-3 z-10 flex items-center gap-2"
          style={{ bottom: `calc(0.75rem + ${(target / max) * 100}% - 1px)` }}
        >
          <div className="h-px flex-1 border-t border-dashed border-ink/25" />
          <Micro className="rounded-full bg-base-hi px-1.5 py-0.5 text-ink-2">
            {target}m target
          </Micro>
        </div>

        <div className="flex h-full items-end gap-[3px]">
          {data.map((d, i) => (
            <button
              key={i}
              type="button"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group relative flex h-full flex-1 items-end"
              aria-label={`${d.day}: ${d.minutes} minutes`}
            >
              <div
                className={cn(
                  "w-full rounded-t-[4px] transition-colors",
                  d.minutes === 0
                    ? "bg-groove-hatch"
                    : hover === i
                      ? "bg-teal-deep"
                      : "bg-teal",
                )}
                style={{ height: `${Math.max((d.minutes / max) * 100, d.minutes === 0 ? 2 : 6)}%` }}
              />
              {hover === i && d.minutes > 0 ? (
                <span className="readout pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[0.6rem] font-semibold text-base-hi">
                  {d.minutes}m
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex gap-[3px]">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <Micro className={hover === i ? "text-ink" : "text-ink-3"}>{d.day}</Micro>
          </div>
        ))}
      </div>
    </div>
  );
}
