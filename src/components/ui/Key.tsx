"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "quiet";
type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.7rem] tracking-[0.12em] rounded-key",
  md: "h-12 px-6 text-[0.75rem] tracking-[0.14em] rounded-key",
  lg: "h-16 px-8 text-[0.8125rem] tracking-[0.14em] rounded-[18px]",
};

const toneClass: Record<Tone, string> = {
  neutral: "text-ink",
  primary: "text-teal-deep",
  quiet: "text-ink-3 hover:text-ink-2",
};

const base =
  "group relative inline-flex select-none items-center justify-center gap-2.5 font-mono font-semibold uppercase " +
  "transition-[box-shadow,transform,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "disabled:pointer-events-none disabled:opacity-40";

const surface =
  "bg-linear-145 from-base-hi to-base-lo shadow-raised " +
  "hover:shadow-raised-lg " +
  "active:from-base-lo active:to-base-hi active:shadow-pressed active:translate-y-px";

interface KeyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: Size;
  href?: string;
  icon?: ReactNode;
  /** Renders the key already depressed — for toggles that are on. */
  held?: boolean;
}

/**
 * A key is anything you physically push. Pressed state is genuinely
 * inset rather than tinted, so the surface metaphor never breaks.
 */
export function Key({
  tone = "neutral",
  size = "md",
  href,
  icon,
  held = false,
  className,
  children,
  ...rest
}: KeyProps) {
  const classes = cn(
    base,
    sizeClass[size],
    toneClass[tone],
    held
      ? "bg-linear-145 from-base-lo to-base-hi shadow-inset text-teal-deep"
      : surface,
    className,
  );

  const content = (
    <>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}

/** Square key for icon-only controls: transport buttons, rail items. */
export function IconKey({
  label,
  held = false,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; held?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={held || undefined}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-key transition-all duration-200",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
        held
          ? "bg-linear-145 from-base-lo to-base-hi shadow-inset text-teal"
          : "bg-linear-145 from-base-hi to-base-lo shadow-raised text-ink-2 hover:text-ink active:shadow-pressed active:translate-y-px",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
