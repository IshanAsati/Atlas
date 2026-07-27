import type { TopicStatus } from "@/lib/mock";

/**
 * Kept out of the client component that draws the meters: server
 * components read these too, and a `"use client"` module only exports
 * client references, not usable values.
 */
export const statusColor: Record<TopicStatus, string> = {
  strong: "var(--color-teal)",
  steady: "var(--color-teal)",
  fading: "var(--color-amber)",
  untouched: "var(--color-ink-3)",
};

export const statusLabel: Record<TopicStatus, string> = {
  strong: "Solid",
  steady: "Holding",
  fading: "Fading",
  untouched: "Not started",
};
