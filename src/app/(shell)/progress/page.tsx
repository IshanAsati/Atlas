import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ConfidenceMeter, ProgressRing } from "@/components/ui/Meters";
import { MomentumTrend, WeeklyBars } from "@/components/progress/Charts";
import {
  momentumHistory,
  student,
  subjectConfidence,
  subjects,
  weeklyMinutes,
} from "@/lib/mock";

export const metadata: Metadata = {
  title: "Progress — Atlas",
};

export default function ProgressPage() {
  const completion = Math.round((student.missionsCompleted / student.missionsAttempted) * 100);
  const levelProgress = Math.round(
    (student.xp / (student.xp + student.xpToNextLevel)) * 100,
  );

  return (
    <>
      <PageHeader
        pillar="Improve"
        title="Progress"
        intro="Measured in missions finished and confidence held, not hours logged."
      />

      <div className="space-y-6">
        {/* Level and completion, side by side */}
        <section className="grid gap-6 md:grid-cols-[300px_1fr]">
          <Panel depth="raised" radius="bay" className="flex flex-col items-center p-7">
            <ProgressRing value={levelProgress} size={132} stroke={10}>
              <div className="text-center">
                <div className="readout text-[1.9rem] font-bold leading-none text-ink">
                  {student.level}
                </div>
                <div className="micro mt-1.5 text-ink-3">Level</div>
              </div>
            </ProgressRing>
            <p className="readout mt-5 text-[0.8rem] font-semibold text-ink">
              {student.xp.toLocaleString()} XP
            </p>
            <p className="micro mt-1.5 text-ink-3">
              {student.xpToNextLevel.toLocaleString()} to level {student.level + 1}
            </p>
          </Panel>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Tile value={`${completion}%`} label="Mission completion" note="Target 70%" />
            <Tile value={`${student.missionsCompleted}`} label="Missions finished" note="All time" />
            <Tile value="41" label="Avg session" note="Minutes" />
            <Tile value={`${student.momentum}`} label="Momentum" note="Down 6 this week" />
            <Tile value="6" label="Current streak" note="Days" />
            <Tile value="21" label="Best streak" note="Days" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
            <Micro>Improve</Micro>
            <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
              Momentum, last 14 days
            </h2>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
              Two missed days pulled it back from 82. It decays — it never resets.
            </p>
            <Groove className="my-5" />
            <MomentumTrend data={momentumHistory} />
          </Panel>

          <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
            <Micro>Improve</Micro>
            <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
              Minutes studied this week
            </h2>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">
              You cleared the daily budget on four of seven days.
            </p>
            <Groove className="my-5" />
            <WeeklyBars data={weeklyMinutes} target={student.studyTime} />
          </Panel>
        </section>

        <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <Micro>Track</Micro>
              <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
                Confidence by subject
              </h2>
            </div>
            <Micro className="text-ink-2">Averaged across topics</Micro>
          </div>

          <Groove className="my-5" />

          <ul className="grid gap-5 sm:grid-cols-2">
            {subjects.map((subject) => {
              const value = subjectConfidence(subject.id);
              return (
                <li key={subject.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.9rem] font-medium text-ink">{subject.name}</span>
                    <span className="readout text-[0.75rem] font-semibold text-ink-2">{value}%</span>
                  </div>
                  <div className="mt-2">
                    <ConfidenceMeter
                      value={value}
                      status={value >= 75 ? "strong" : value >= 45 ? "steady" : "fading"}
                      height={9}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Tile({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <Panel depth="raised" radius="panel" className="flex flex-col justify-between p-5">
      <span className="readout text-[1.8rem] font-bold leading-none text-ink">{value}</span>
      <span className="mt-4 block">
        <span className="block text-[0.82rem] font-medium leading-snug text-ink-2">{label}</span>
        <Micro className="mt-1.5 block">{note}</Micro>
      </span>
    </Panel>
  );
}
