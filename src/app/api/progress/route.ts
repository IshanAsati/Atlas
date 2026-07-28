import { NextResponse } from "next/server";
import { denyIfSignedOut } from "@/lib/auth/guard";
import { getServerStudent, getServerSubjects, getServerTopics, getServerCalendarDays } from "@/lib/data";

export const dynamic = "force-dynamic";

function calcStreak(days: { date: string; state: string }[]): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const record = days.find((r) => r.date === key);
    if (record?.state === "complete" || record?.state === "partial") {
      streak++;
    } else if (i > 0) break; // allow today to be incomplete
  }
  return streak;
}

function calcBestStreak(days: { date: string; state: string }[]): number {
  let best = 0, cur = 0;
  for (const d of days.sort((a, b) => a.date.localeCompare(b.date))) {
    if (d.state === "complete" || d.state === "partial") {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}

function calcMomentumHistory(days: { date: string; state: string; minutes: number }[], studyTime: number): number[] {
  const today = new Date();
  const history: number[] = [];
  let momentum = 50;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const record = days.find((r) => r.date === key);
    if (!record || record.state === "missed") {
      momentum = Math.max(0, momentum - 8);
    } else if (record.state === "complete") {
      momentum = Math.min(100, momentum + (record.minutes >= studyTime ? 4 : 2));
    } else if (record.state === "partial") {
      momentum = Math.max(0, momentum + 1);
    }
    history.push(momentum);
  }
  return history;
}

function getWeekDays(): { day: string; date: string }[] {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      day: d.toLocaleDateString("en", { weekday: "short" }),
      date: d.toISOString().slice(0, 10),
    });
  }
  return days;
}

export async function GET() {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  try {
    const student = await getServerStudent();
    const subjects = await getServerSubjects();
    const topics = await getServerTopics();
    const now = new Date();
    const calendarDays = await getServerCalendarDays(now.getFullYear(), now.getMonth());

    if (!student || subjects.length === 0) {
      return NextResponse.json({ student, subjects, momentumHistory: [], weeklyMinutes: [], subjectConfidence: [] });
    }

    // Subject confidence averages
    const subjectConfidence = subjects.map((s) => {
      const t = topics.filter((topic) => topic.subjectId === s.id);
      const avg = t.length ? Math.round(t.reduce((sum, c) => sum + c.confidence, 0) / t.length) : 0;
      return { id: s.id, name: s.name, accent: s.accent, confidence: avg };
    });

    // Weekly minutes
    const weekDays = getWeekDays();
    const weeklyMinutes = weekDays.map((wd) => {
      const record = calendarDays.find((cd) => cd.date === wd.date);
      return { day: wd.day.slice(0, 2), minutes: record?.minutes ?? 0, state: record?.state ?? "missed" };
    });

    // Momentum history (14 days)
    const momentumHistory = calcMomentumHistory(calendarDays, student.studyTime);

    // Streak
    const streak = calcStreak(calendarDays);
    const bestStreak = calcBestStreak(calendarDays);

    // XP target for next level
    const xpToNextLevel = (student.level + 1) * 1000 - student.xp;
    const levelProgress = Math.round((student.xp / ((student.level + 1) * 1000)) * 100);

    return NextResponse.json({
      student: { ...student, xpToNextLevel: Math.max(xpToNextLevel, 1) },
      subjects,
      subjectConfidence,
      momentumHistory,
      weeklyMinutes,
      momentum: student.momentum,
      streak,
      bestStreak,
      levelProgress,
      completionRate: student.missionsAttempted > 0
        ? Math.round((student.missionsCompleted / student.missionsAttempted) * 100)
        : 0,
    });
  } catch (error) {
    console.error("[progress] GET error:", error);
    return NextResponse.json({ error: "Failed to load progress." }, { status: 500 });
  }
}
