import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Depth = "raised" | "raised-lg" | "inset" | "inset-deep" | "flush";
type Radius = "key" | "panel" | "bay" | "full";

const depthClass: Record<Depth, string> = {
  raised: "shadow-raised bg-linear-145 from-base-hi to-base-lo",
  "raised-lg": "shadow-raised-lg bg-linear-145 from-base-hi to-base-lo",
  inset: "shadow-inset bg-linear-145 from-base-lo to-base-hi",
  "inset-deep": "shadow-inset-deep bg-linear-145 from-base-lo to-base-hi",
  flush: "bg-base",
};

const radiusClass: Record<Radius, string> = {
  key: "rounded-key",
  panel: "rounded-panel",
  bay: "rounded-bay",
  full: "rounded-full",
};

interface PanelProps extends HTMLAttributes<HTMLElement> {
  depth?: Depth;
  radius?: Radius;
  as?: ElementType;
  children?: ReactNode;
}

/**
 * The one surface primitive. Everything on screen is a Panel that is
 * either pushed out of the sheet or pressed into it.
 */
export function Panel({
  depth = "raised",
  radius = "panel",
  as,
  className,
  children,
  ...rest
}: PanelProps) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn("relative", depthClass[depth], radiusClass[radius], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Small uppercase instrument label. Names the reading beside it. */
export function Micro({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("micro text-ink-3", className)} {...rest}>
      {children}
    </span>
  );
}

/** Etched separator — a groove, not a border. */
export function Groove({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-px w-full", className)}
      style={{
        background: "linear-gradient(90deg, transparent, var(--hairline) 12%, var(--hairline) 88%, transparent)",
        boxShadow: "0 1px 0 color-mix(in srgb, var(--emboss) 85%, transparent)",
      }}
    />
  );
}
