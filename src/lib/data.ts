/**
 * Hybrid data layer — reads from Appwrite, falls back to mock.
 *
 * Server functions (exported directly) use the Appwrite server SDK and work
 * in Route Handlers and Server Components. Client components reach them
 * through the API routes defined in Phase 3–5.
 *
 * The mock fallback is always available so the app never breaks for want of
 * a database connection. The shape matches exactly so swapping is transparent.
 */

import {
  databases,
  DB_ID,
  COLLECTIONS,
} from "@/lib/appwrite/server";
import { ID } from "node-appwrite";

import {
  student as mockStudent,
  subjects as mockSubjects,
  topics as mockTopics,
  mission as mockMission,
  calendarDays as mockCalendarDays,
  type Subject,
  type Topic,
  type MissionTask,
} from "@/lib/mock";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STUDENT_ID = "student-1";

/** Strip Appwrite metadata from a document, keeping only our fields. */
function clean<T extends Record<string, unknown>>(doc: T): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc as Record<string, unknown>;
  return { id: $id as string, ...rest } as unknown as T;
}

async function safeGet<T>(collection: string, id: string): Promise<T | null> {
  if (!process.env.APPWRITE_SECRET_KEY) return null;
  try {
    const doc = await databases.getDocument(DB_ID, collection, id);
    return clean(doc as unknown as Record<string, unknown>) as unknown as T;
  } catch {
    return null;
  }
}

async function safeList<T>(collection: string, queries: string[] = []): Promise<T[]> {
  if (!process.env.APPWRITE_SECRET_KEY) return [];
  try {
    const { documents } = await databases.listDocuments(DB_ID, collection, queries);
    return documents.map((d) => clean(d as unknown as Record<string, unknown>)) as unknown as T[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

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

export async function getServerStudent(): Promise<StudentProfile> {
  const doc = await safeGet<StudentProfile>(COLLECTIONS.students, STUDENT_ID);
  if (doc) return doc;
  return { id: STUDENT_ID, ...mockStudent };
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function getServerSubjects(): Promise<Subject[]> {
  const docs = await safeList<Subject>(COLLECTIONS.subjects, [
    `equal("studentId", "${STUDENT_ID}")`,
  ]);
  if (docs.length > 0) return docs;
  return [...mockSubjects];
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export async function getServerTopics(subjectId?: string): Promise<Topic[]> {
  const queries = [`equal("studentId", "${STUDENT_ID}")`];
  if (subjectId) queries.push(`equal("subjectId", "${subjectId}")`);
  const docs = await safeList<Topic>(COLLECTIONS.topics, queries);
  if (docs.length > 0) return docs;
  if (subjectId) return mockTopics.filter((t) => t.subjectId === subjectId);
  return [...mockTopics];
}

export async function getServerTopic(id: string): Promise<Topic | null> {
  const doc = await safeGet<Topic>(COLLECTIONS.topics, id);
  return doc ?? mockTopics.find((t) => t.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Mission
// ---------------------------------------------------------------------------

export interface ServerMission {
  id: string;
  date: string;
  totalMinutes: number;
  tasks: MissionTask[];
}

export async function getServerMission(date?: string): Promise<ServerMission> {
  const target = date ?? new Date().toISOString().slice(0, 10);
  const missions = await safeList<Omit<ServerMission, "tasks">>(COLLECTIONS.missions, [
    `equal("studentId", "${STUDENT_ID}")`,
    `equal("date", "${target}")`,
  ]);

  if (missions.length > 0) {
    const m = missions[0];
    const tasks = await safeList<MissionTask>(COLLECTIONS.missionTasks, [
      `equal("missionId", "${m.id}")`,
    ]);
    const ordered = tasks.sort((a, b) => ((a as unknown as Record<string, number>).order ?? 0) - ((b as unknown as Record<string, number>).order ?? 0));
    return { ...m, tasks: ordered };
  }

  return { ...mockMission, tasks: [...mockMission.tasks] };
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarDay {
  id: string;
  date: string;
  state: "complete" | "partial" | "missed" | "planned";
  minutes: number;
}

export async function getServerCalendarDays(
  year: number,
  month: number,
): Promise<CalendarDay[]> {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const docs = await safeList<CalendarDay>(COLLECTIONS.calendarDays, [
    `equal("studentId", "${STUDENT_ID}")`,
    `startsWith("date", "${prefix}")`,
  ]);
  if (docs.length > 0) return docs;
  return Object.entries(mockCalendarDays)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, val]) => ({ id: key, date: key, ...val, minutes: val.minutes ?? 0 }));
}

// ---------------------------------------------------------------------------
// Mutation helpers (server-side)
// ---------------------------------------------------------------------------

export async function updateTopicConfidence(id: string, confidence: number) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  try {
    await databases.updateDocument(DB_ID, COLLECTIONS.topics, id, { confidence });
  } catch { /* silent — client-side override still holds */ }
}

export async function updateTaskStatus(id: string, status: string) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  try {
    await databases.updateDocument(DB_ID, COLLECTIONS.missionTasks, id, { status });
  } catch { /* silent */ }
}

export async function saveExtractedSubjects(
  subs: Omit<Subject, "id">[],
  tops: Omit<Topic, "id">[],
) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  // Clear existing
  const existingSubs = await safeList<Subject>(COLLECTIONS.subjects);
  const existingTops = await safeList<Topic>(COLLECTIONS.topics);
  for (const s of existingSubs) {
    await databases.deleteDocument(DB_ID, COLLECTIONS.subjects, s.id);
  }
  for (const t of existingTops) {
    await databases.deleteDocument(DB_ID, COLLECTIONS.topics, t.id);
  }
  // Insert new
  for (const s of subs) {
    await databases.createDocument(DB_ID, COLLECTIONS.subjects, ID.unique(), {
      ...s,
      studentId: STUDENT_ID,
    });
  }
  for (const t of tops) {
    await databases.createDocument(DB_ID, COLLECTIONS.topics, ID.unique(), {
      ...t,
      studentId: STUDENT_ID,
    });
  }
}

export async function saveMission(
  date: string,
  totalMinutes: number,
  tasks: Omit<MissionTask, "id">[],
) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  const mId = `m-${date}`;
  try { await databases.deleteDocument(DB_ID, COLLECTIONS.missions, mId); } catch {}
  await databases.createDocument(DB_ID, COLLECTIONS.missions, mId, {
    studentId: STUDENT_ID,
    date,
    totalMinutes,
  });
  for (const [i, t] of tasks.entries()) {
    await databases.createDocument(DB_ID, COLLECTIONS.missionTasks, ID.unique(), {
      ...t,
      missionId: mId,
      order: i,
    });
  }
}
