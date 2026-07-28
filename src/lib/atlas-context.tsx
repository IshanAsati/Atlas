"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Subject, Topic, MissionTask } from "@/lib/mock";

export interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  studyTime: number;
  momentum: number;
  momentumDelta: number;
  xp: number;
  level: number;
  missionsCompleted: number;
  missionsAttempted: number;
}

interface AtlasData {
  student: StudentProfile | null;
  subjects: Subject[];
  topics: Topic[];
  calendarDays: Record<string, { state: "complete" | "partial" | "missed" | "planned"; minutes?: number }>;
  mission: {
    id: string;
    date: string;
    totalMinutes: number;
    tasks: MissionTask[];
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateTaskStatus: (taskId: string, status: MissionTask["status"]) => void;
  setCalendarDays: (days: Record<string, { state: "complete" | "partial" | "missed" | "planned"; minutes?: number }>) => void;
}

const Ctx = createContext<AtlasData>({
  student: null,
  subjects: [],
  topics: [],
  calendarDays: {},
  mission: null,
  loading: true,
  error: null,
  refresh: () => {},
  updateTaskStatus: () => {},
  setCalendarDays: () => {},
});

export function useAtlasData() {
  return useContext(Ctx);
}

export function useAtlasSubjects() {
  return useAtlasData().subjects;
}

export function useAtlasTopics(subjectId?: string) {
  const { topics } = useAtlasData();
  if (!subjectId) return topics;
  return topics.filter((t) => t.subjectId === subjectId);
}

export function useAtlasMission() {
  return useAtlasData().mission;
}

export function useAtlasStudent() {
  return useAtlasData().student;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mission, setMission] = useState<AtlasData["mission"] | null>(null);
  const [calendarDays, setCalendarDays] = useState<AtlasData["calendarDays"]>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studRes, subsRes, topsRes, missRes] = await Promise.all([
        fetch("/api/student").then((r) => r.ok ? r.json() : null),
        fetch("/api/topics?type=subjects").then((r) => r.ok ? r.json() : null),
        fetch("/api/topics").then((r) => r.ok ? r.json() : null),
        fetch("/api/mission").then((r) => r.ok ? r.json() : null),
      ]);

      if (mounted.current) {
        if (studRes?.id) setStudent(studRes);
        if (Array.isArray(subsRes)) setSubjects(subsRes);
        if (Array.isArray(topsRes)) setTopics(topsRes);
        if (missRes?.tasks) setMission(missRes);
      }
    } catch {
      // Network error — leave state as-is (null/empty)
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const inited = useRef(false);
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    refresh();
  }, [refresh]);

  const updateTaskStatus = useCallback(
    (taskId: string, status: MissionTask["status"]) => {
      setMission((prev) => {
        if (!prev) return prev;
        return { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) };
      });
    },
    [],
  );

  return (
    <Ctx.Provider value={{
      student, subjects, topics, calendarDays, mission,
      loading, error, refresh, updateTaskStatus, setCalendarDays,
    }}>
      {children}
    </Ctx.Provider>
  );
}
