"use client";

import { useAtlasStudent } from "@/lib/atlas-context";

export function DashboardGreeting() {
  const student = useAtlasStudent();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  if (!student) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-1">
        <p className="font-display text-[1.05rem] font-medium tracking-[-0.01em] text-ink-2">
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 pb-1">
      <p className="font-display text-[1.05rem] font-medium tracking-[-0.01em] text-ink-2">
        {greeting}, {student.name.split(" ")[0]}.
      </p>
      <p className="micro text-ink-3">{student.grade}</p>
    </div>
  );
}
