"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ConfidenceMeter, ProgressRing } from "@/components/ui/Meters";
import { MomentumTrend, WeeklyBars } from "@/components/progress/Charts";

interface ProgressData {
  student: {
    name: string;
    grade: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    momentum: number;
    momentumDelta: number;
    missionsCompleted: number;
    missionsAttempted: number;
    studyTime: number;
  };
  subjects: { id: string; name: string; accent: string }[];
  subjectConfidence: { id: string; name: string; accent: string; confidence: number }[];
  momentumHistory: number[];
  weeklyMinutes: { day: string; minutes: number; state: string }[];
  streak: number;
  bestStreak: number;
  levelProgress: number;
  completionRate: number;
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/progress")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d?.student) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader pillar="Improve" title="Progress" intro="Loading your stats…" />
        <Panel depth="raised" radius="bay" className="p-7">
          <Micro className="text-ink-3">Loading progress…</Micro>
        </Panel>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader pillar="Improve" title="Progress" intro="Complete onboarding to see your stats." />
        <Panel depth="raised" radius="bay" className="p-7">
          <Micro className="text-ink-3">No data yet. Upload your syllabus to get started.</Micro>
        </Panel>
      </div>
    );
  }

  const { student, subjects, subjectConfidence, momentumHistory, weeklyMinutes, streak, bestStreak, levelProgress, completionRate } = data;
  // Calculate average session minutes from weekly data
  const studiedMinutes = weeklyMinutes.reduce((s, d) => s + d.minutes, 0);
  const studiedDays = weeklyMinutes.filter((d) => d.minutes > 0).length;
  const avgSession = studiedDays > 0 ? Math.round(studiedMinutes / studiedDays) : 0;

  return (
    <div className="space-y-6">
      <PageHeader pillar="Improve" title="Progress" intro="Measured in missions finished and confidence held, not hours logged." />

      <section className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Panel depth="raised" radius="bay" className="flex flex-col items-center p-7">
          <ProgressRing value={levelProgress} size={132} stroke={10}>
            <div className="text-center">
              <div className="readout text-[1.9rem] font-bold leading-none text-ink">{student.level}</div>
              <div className="micro mt-1.5 text-ink-3">Level</div>
            </div>
          </ProgressRing>
          <p className="readout mt-5 text-[0.8rem] font-semibold text-ink">{student.xp.toLocaleString()} XP</p>
          <p className="micro mt-1.5 text-ink-3">{student.xpToNextLevel.toLocaleString()} to level {student.level + 1}</p>
        </Panel>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <Tile value={`${completionRate}%`} label="Mission completion" note="Target 70%" />
          <Tile value={`${student.missionsCompleted}`} label="Missions finished" note="All time" />
          <Tile value={`${avgSession}`} label="Avg session" note="Minutes" />
          <Tile value={`${student.momentum}`} label="Momentum" note={student.momentumDelta >= 0 ? `Up ${student.momentumDelta}` : `Down ${Math.abs(student.momentumDelta)}`} />
          <Tile value={`${streak}`} label="Current streak" note="Days" />
          <Tile value={`${bestStreak}`} label="Best streak" note="Days" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
          <Micro>Improve</Micro>
          <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">Momentum, last 14 days</h2>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">Your consistency trend over the past two weeks.</p>
          <Groove className="my-5" />
          {momentumHistory.length > 0 ? <MomentumTrend data={momentumHistory} /> : <Micro className="text-ink-3">Not enough data yet.</Micro>}
        </Panel>

        <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
          <Micro>Improve</Micro>
          <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">Minutes studied this week</h2>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-2">{weeklyMinutes.filter(d => d.minutes >= student.studyTime).length} of 7 days hit the daily target.</p>
          <Groove className="my-5" />
          <WeeklyBars data={weeklyMinutes.map(d => ({ day: d.day, minutes: d.minutes }))} target={student.studyTime} />
        </Panel>
      </section>

      <Panel depth="raised" radius="bay" className="p-6 sm:p-7">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <Micro>Track</Micro>
            <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">Confidence by subject</h2>
          </div>
          <Micro className="text-ink-2">Averaged across topics</Micro>
        </div>
        <Groove className="my-5" />
        <ul className="grid gap-5 sm:grid-cols-2">
          {subjectConfidence.map((subj) => (
            <li key={subj.id}>
              <Link
                href="/graph"
                className="block rounded-key p-2 -m-2 transition-colors hover:bg-base-lo/30"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.9rem] font-medium text-ink">{subj.name}</span>
                  <span className="readout text-[0.75rem] font-semibold text-ink-2">{subj.confidence}%</span>
                </div>
                <div className="mt-2">
                  <ConfidenceMeter value={subj.confidence} status={subj.confidence >= 75 ? "strong" : subj.confidence >= 45 ? "steady" : "fading"} height={9} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
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
