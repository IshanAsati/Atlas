"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import {
  AtlasMark,
  CalendarIcon,
  CoachIcon,
  ImproveIcon,
  LearnIcon,
  PlanIcon,
  TrackIcon,
} from "@/components/ui/Icons";

/* Destinations are named for what the student does there, not for the
   pillar they belong to. The pillar is noted underneath for orientation. */
const destinations = [
  { href: "/", label: "Today", pillar: "Plan", Icon: PlanIcon },
  { href: "/calendar", label: "Calendar", pillar: "Plan", Icon: CalendarIcon },
  { href: "/focus", label: "Pomodoro", pillar: "Learn", Icon: LearnIcon },
  { href: "/coach", label: "Coach", pillar: "Learn", Icon: CoachIcon },
  { href: "/graph", label: "Graph", pillar: "Track", Icon: TrackIcon },
  { href: "/progress", label: "Progress", pillar: "Improve", Icon: ImproveIcon },
];

export function Rail() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Desktop: a fixed control column down the left edge */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-30 hidden w-[92px] flex-col items-center justify-between py-6 md:flex"
      >
        <Link
          href="/"
          aria-label="Atlas home"
          className="grid size-14 place-items-center rounded-[18px] bg-linear-145 from-base-hi to-base-lo text-ink shadow-raised transition-shadow hover:shadow-raised-lg"
        >
          <AtlasMark size={26} />
        </Link>

        <ul className="flex flex-col items-center gap-3.5">
          {destinations.map(({ href, label, pillar, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex w-[68px] flex-col items-center gap-1.5 rounded-[18px] px-1 py-3",
                    "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active
                      ? "bg-linear-145 from-base-lo to-base-hi text-teal shadow-inset"
                      : "text-ink-3 hover:text-ink-2 hover:shadow-raised-sm",
                  )}
                >
                  <Icon width={21} height={21} />
                  <span className="micro leading-none">{label}</span>
                  <span
                    className={cn(
                      "h-px w-4 rounded-full transition-colors",
                      active ? "bg-teal/50" : "bg-transparent",
                    )}
                  />
                  <span className="sr-only">{pillar}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col items-center gap-4">
          <ThemeToggle />
          {/* Settings lives on the avatar rather than a seventh dock key —
              six labels already fill a 375px phone. */}
          <Link
            href="/settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            className={cn(
              "grid size-11 place-items-center rounded-full transition-shadow",
              isActive("/settings")
                ? "bg-linear-145 from-base-lo to-base-hi text-teal shadow-inset"
                : "bg-linear-145 from-base-hi to-base-lo text-ink-2 shadow-raised hover:shadow-raised-lg",
            )}
            aria-label="Settings"
          >
            <span className="font-display text-[0.8rem] font-semibold">A</span>
          </Link>
        </div>
      </nav>

      {/* Mobile: the same keys, docked along the bottom */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-3 z-30 flex items-stretch justify-between gap-1 rounded-bay bg-linear-145 from-base-hi to-base-lo p-2 shadow-raised-lg md:hidden"
      >
        {destinations.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-key px-0.5 py-2.5 transition-all",
                active ? "from-base-lo to-base-hi bg-linear-145 text-teal shadow-inset" : "text-ink-3",
              )}
            >
              <Icon width={19} height={19} />
              {/* Tracking comes off so six labels fit across a 375px phone */}
              <span className="micro w-full truncate text-center text-[0.5rem] leading-none tracking-[0.05em]">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
