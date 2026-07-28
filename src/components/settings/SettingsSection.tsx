"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { CheckIcon } from "@/components/ui/Icons";

/* ============================================================
   Settings chrome.

   Every section is one raised bay opened the same way the rest of
   Atlas opens a panel: instrument label, name, one line saying what
   the section changes, then a groove and the controls.
   ============================================================ */

export function SettingsSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel as="section" depth="raised" radius="bay" className={cn("p-6 sm:p-7", className)}>
      <Micro>{eyebrow}</Micro>
      <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-[40rem] text-[0.875rem] leading-relaxed text-ink-2">
          {description}
        </p>
      ) : null}
      <Groove className="my-5" />
      {children}
    </Panel>
  );
}

/**
 * A labelled well. Text inputs are pressed into the sheet — the same
 * relief the login form uses, so a field reads as a field everywhere.
 */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="micro text-ink-2">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-[0.78rem] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  );
}

export const fieldClass = cn(
  "w-full rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-3",
  "text-[0.9rem] text-ink shadow-inset outline-none placeholder:text-ink-3",
  "disabled:opacity-60",
);

/**
 * A one-line result of something the student just did. Amber is the
 * decay colour and carries the failures; teal is the confidence colour
 * and carries the confirmations. Nothing else is tinted.
 */
export function Notice({
  tone,
  children,
  className,
}: {
  tone: "error" | "success";
  children: ReactNode;
  className?: string;
}) {
  const error = tone === "error";
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-key px-3.5 py-2.5 text-[0.82rem] leading-snug",
        error ? "bg-amber-wash/70 text-amber-deep" : "bg-teal-wash/70 text-teal-deep",
        className,
      )}
    >
      {error ? (
        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />
      ) : (
        <CheckIcon aria-hidden width={13} height={13} className="mt-0.5 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  );
}
