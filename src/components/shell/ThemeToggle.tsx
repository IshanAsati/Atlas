"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

/* The <html> attribute is the source of truth — an inline script sets it
   before first paint, so React reads from the DOM rather than owning it. */
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
const getServerSnapshot = (): Theme => "light";

function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("atlas-theme", next);
  } catch {
    /* private mode — the toggle still works for this session */
  }
  listeners.forEach((fn) => fn());
}

/**
 * A physical rocker. The knob sits in a groove and slides between two
 * detents — daylight and night — rather than fading an icon.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = theme === "dark";
  const flip = () => setTheme(dark ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={flip}
      role="switch"
      aria-checked={dark}
      aria-label="Night mode"
      title={dark ? "Switch to daylight" : "Switch to night"}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1",
        "bg-linear-145 from-base-lo to-base-hi shadow-inset",
        className,
      )}
    >
      {/* Detents */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-2.5">
        <SunGlyph className={cn("size-3", dark ? "text-ink-3" : "text-teal-deep")} />
        <MoonGlyph className={cn("size-3", dark ? "text-teal-deep" : "text-ink-3")} />
      </span>

      <span
        className={cn(
          "relative size-6 rounded-full bg-linear-145 from-base-hi to-base-lo shadow-raised-sm",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          dark ? "translate-x-6" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SunGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <path
        d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M13.4 10.3A5.8 5.8 0 0 1 5.7 2.6a5.8 5.8 0 1 0 7.7 7.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
