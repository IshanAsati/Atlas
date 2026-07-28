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
  getDatabases,
  DB_ID,
  COLLECTIONS,
} from "@/lib/appwrite/server";

import {
  student as mockStudent,
  subjects as mockSubjects,
  topics as mockTopics,
  mission as mockMission,
  calendarDays as mockCalendarDays,
  daysUntil,
  TODAY,
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

async function db() {
  return getDatabases();
}

async function genId() {
  const { ID } = await import("node-appwrite");
  return ID.unique();
}

async function safeGet<T>(collection: string, id: string): Promise<T | null> {
  if (!process.env.APPWRITE_SECRET_KEY) return null;
  try {
    const d = await db();
    const doc = await d.getDocument(DB_ID, collection, id);
    return clean(doc as unknown as Record<string, unknown>) as unknown as T;
  } catch {
    return null;
  }
}

async function safeList<T>(collection: string, queries: string[] = []): Promise<T[]> {
  if (!process.env.APPWRITE_SECRET_KEY) return [];
  try {
    const d = await db();
    const { documents } = await d.listDocuments(DB_ID, collection, queries);
    return documents.map((dd: Record<string, unknown>) => clean(dd)) as unknown as T[];
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
    const d = await db();
    await d.updateDocument(DB_ID, COLLECTIONS.topics, id, { confidence });
  } catch { /* silent — client-side override still holds */ }
}

export async function updateTaskStatus(id: string, status: string) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  try {
    const d = await db();
    await d.updateDocument(DB_ID, COLLECTIONS.missionTasks, id, { status });
  } catch { /* silent */ }
}

export async function saveExtractedSubjects(
  subs: Omit<Subject, "id">[],
  tops: Omit<Topic, "id">[],
) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  const d = await db();
  // Clear existing
  const existingSubs = await safeList<Subject>(COLLECTIONS.subjects);
  const existingTops = await safeList<Topic>(COLLECTIONS.topics);
  for (const s of existingSubs) {
    await d.deleteDocument(DB_ID, COLLECTIONS.subjects, s.id);
  }
  for (const t of existingTops) {
    await d.deleteDocument(DB_ID, COLLECTIONS.topics, t.id);
  }
  // Insert new
  for (const s of subs) {
    await d.createDocument(DB_ID, COLLECTIONS.subjects, await genId(), {
      ...s,
      studentId: STUDENT_ID,
    });
  }
  for (const t of tops) {
    await d.createDocument(DB_ID, COLLECTIONS.topics, await genId(), {
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
  const d = await db();
  const mId = `m-${date}`;
  try { await d.deleteDocument(DB_ID, COLLECTIONS.missions, mId); } catch {}
  await d.createDocument(DB_ID, COLLECTIONS.missions, mId, {
    studentId: STUDENT_ID,
    date,
    totalMinutes,
  });
  for (const [i, t] of tasks.entries()) {
    await d.createDocument(DB_ID, COLLECTIONS.missionTasks, await genId(), {
      ...t,
      missionId: mId,
      order: i,
    });
  }
}

// ---------------------------------------------------------------------------
// Pipeline 2 — Rule-based mission planner
// ---------------------------------------------------------------------------

/**
 * Generates a daily mission from the current topic states.
 *
 * Priority score per topic:
 *   confidence < 30           → +40
 *   confidence < 60           → +20
 *   lastSeenDays > 7          → +30
 *   examInDays < 7            → +25
 *   examInDays < 14           → +15
 *
 * Selects top topics until the daily time budget is filled.
 * Assigns kind: "learn" (confidence < 40), "quiz" (40–70), "revise" (≥ 70).
 */
export async function generateMission(
  date: string = new Date().toISOString().slice(0, 10),
  studyTime: number = 120,
): Promise<ServerMission> {
  const allTopics = await getServerTopics();
  const allSubjects = await getServerSubjects();

  interface ScoredTopic {
    topic: Topic;
    subject: Subject | undefined;
    score: number;
  }

  const scored: ScoredTopic[] = allTopics.map((topic) => {
    const subject = allSubjects.find((s) => s.id === topic.subjectId);
    const examInDays = subject ? daysUntil(subject.examDate, TODAY) : 999;
    let score = 0;
    if (topic.confidence < 30) score += 40;
    else if (topic.confidence < 60) score += 20;
    if (topic.lastSeenDays > 7) score += 30;
    if (examInDays < 7) score += 25;
    else if (examInDays < 14) score += 15;
    return { topic, subject, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const tasks: Omit<MissionTask, "id">[] = [];
  let minutesUsed = 0;
  const remaining = studyTime - 15; // reserve 15 min for a warm-up

  for (const { topic, subject } of scored) {
    if (minutesUsed >= remaining) break;
    if (topic.confidence === 0 && tasks.length > 0) continue; // skip untouched if we already have something

    let minutes: number;
    if (topic.confidence < 40) minutes = 35;
    else if (topic.confidence < 70) minutes = 28;
    else minutes = 20;

    if (minutesUsed + minutes > remaining + 15) {
      minutes = Math.max(15, remaining - minutesUsed);
      if (minutes <= 0) break;
    }

    const kind: MissionTask["kind"] =
      topic.confidence < 40 ? "learn" : topic.confidence < 70 ? "quiz" : "revise";

    const reasons = {
      learn: `New topic — confidence is 0%. Build the base idea first.`,
      quiz: `Confidence is ${topic.confidence}%. A quick quiz will test what's stuck.`,
      revise: `Confidence fell to ${topic.confidence}%. The ${subject?.name ?? "paper"} is ${subject ? daysUntil(subject.examDate, TODAY) : "?"} days out.`,
    };

    tasks.push({
      topicId: topic.id,
      topic: topic.name,
      subject: subject?.name ?? "General",
      reason: reasons[kind],
      minutes,
      status: tasks.length === 0 ? "active" : "pending",
      kind,
    });
    minutesUsed += minutes;
  }

  const totalMinutes = tasks.reduce((sum, t) => sum + t.minutes, 0);
  const missionId = `m-${date}`;

  await saveMission(date, totalMinutes, tasks);

  return {
    id: missionId,
    date,
    totalMinutes,
    tasks: tasks.map((t, i) => ({ ...t, id: `mt${i + 1}` })),
  };
}
