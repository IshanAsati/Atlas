import type { ReactNode } from "react";

/**
 * Every screen opens the same way: the pillar it belongs to, the name
 * of the screen, and one line saying what the screen is for.
 */
export function PageHeader({
  pillar,
  title,
  intro,
  aside,
}: {
  pillar: string;
  title: string;
  intro?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-xl">
        <span className="micro text-ink-3">{pillar}</span>
        <h1 className="mt-2.5 font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3rem]">
          {title}
        </h1>
        {intro ? <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{intro}</p> : null}
      </div>
      {aside ? <div className="flex items-center gap-3">{aside}</div> : null}
    </header>
  );
}
