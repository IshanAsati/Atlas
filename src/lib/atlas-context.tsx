"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Subject, Topic, MissionTask } from "@/lib/mock";
import {
  subjects as mockSubjects,
  topics as mockTopics,
  mission as mockMission,
  student as mockStudent,
  calendarDays as mockCalendarDays,
} from "@/lib/mock";

interface AtlasData {
  student: typeof mockStudent;
  subjects: Subject[];
  topics: Topic[];
  calendarDays: Record<string, { state: "complete" | "partial" | "missed" | "planned"; minutes?: number }>;
  mission: {
    id: string;
    date: string;
    totalMinutes: number;
    tasks: MissionTask[];
  };
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateTaskStatus: (taskId: string, status: MissionTask["status"]) => void;
}

const Ctx = createContext<AtlasData>({
  student: mockStudent,
  subjects: mockSubjects,
  topics: mockTopics,
  calendarDays: {},
  mission: { ...mockMission, tasks: [...mockMission.tasks] },
  loading: false,
  error: null,
  refresh: () => {},
  updateTaskStatus: () => {},
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
  const [student, setStudent] = useState(mockStudent);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [topics, setTopics] = useState<Topic[]>(mockTopics);
  const [mission, setMission] = useState<AtlasData["mission"]>({
    ...mockMission,
    tasks: [...mockMission.tasks],
  });
  const [calendarDays, setCalendarDays] = useState<AtlasData["calendarDays"]>(mockCalendarDays);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, topsRes, missRes] = await Promise.all([
        fetch("/api/topics?type=subjects").then((r) => r.ok ? r.json() : null),
        fetch("/api/topics").then((r) => r.ok ? r.json() : null),
        fetch("/api/mission").then((r) => r.ok ? r.json() : null),
      ]);

      if (mounted.current && subsRes) setSubjects(subsRes);
      if (mounted.current && topsRes) setTopics(topsRes);
      if (mounted.current && missRes) setMission(missRes);
    } catch {
      // Fall back to mock data — already loaded
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  /* Load from API on mount, falling back silently to mock data already set. */
  const inited = useRef(false);
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTaskStatus = useCallback(
    (taskId: string, status: MissionTask["status"]) => {
      setMission((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      }));
    },
    [],
  );

  return (
    <Ctx.Provider value={{ student, subjects, topics, calendarDays, mission, loading, error, refresh, updateTaskStatus }}>
      {children}
    </Ctx.Provider>
  );
}
