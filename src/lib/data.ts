/**
 * Server data layer — reads from Appwrite only.
 * No mock fallbacks. Callers handle empty/null states.
 */

import {
  getDatabases,
  DB_ID,
  COLLECTIONS,
} from "@/lib/appwrite/server";

import { getSessionUserId } from "@/lib/auth/session";

import {
  daysUntil,
  TODAY,
  type Subject,
  type Topic,
  type MissionTask,
} from "@/lib/mock";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the current user ID from the session cookie, or null if unauthenticated. */
async function resolveStudentId(): Promise<string | null> {
  return await getSessionUserId();
}

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

export async function getServerStudent(): Promise<StudentProfile | null> {
  const studentId = await resolveStudentId();
  if (!studentId) return null;
  return await safeGet<StudentProfile>(COLLECTIONS.students, studentId);
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function getServerSubjects(): Promise<Subject[]> {
  const sid = await resolveStudentId();
  if (!sid) return [];
  return await safeList<Subject>(COLLECTIONS.subjects, [
    `equal("studentId", "${sid}")`,
  ]);
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export async function getServerTopics(subjectId?: string): Promise<Topic[]> {
  const sid = await resolveStudentId();
  if (!sid) return [];
  const queries = [`equal("studentId", "${sid}")`];
  if (subjectId) queries.push(`equal("subjectId", "${subjectId}")`);
  return await safeList<Topic>(COLLECTIONS.topics, queries);
}

export async function getServerTopic(id: string): Promise<Topic | null> {
  return await safeGet<Topic>(COLLECTIONS.topics, id);
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

export async function getServerMission(date?: string): Promise<ServerMission | null> {
  const sid = await resolveStudentId();
  if (!sid) return null;
  const target = date ?? new Date().toISOString().slice(0, 10);
  const missions = await safeList<Omit<ServerMission, "tasks">>(COLLECTIONS.missions, [
    `equal("studentId", "${sid}")`,
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

  return null;
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
  const sid = await resolveStudentId();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const docs = await safeList<CalendarDay>(COLLECTIONS.calendarDays, [
    `equal("studentId", "${sid}")`,
    `startsWith("date", "${prefix}")`,
  ]);
  if (!docs.length) return [];
  return docs;
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

/**
 * Persist an exam date the student corrected during onboarding. Without
 * this the correction lives only in client state and the next mission is
 * planned against the date that was extracted, not the one they fixed.
 */
export async function updateSubjectExamDate(id: string, examDate: string) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  try {
    const d = await db();
    await d.updateDocument(DB_ID, COLLECTIONS.subjects, id, { examDate });
  } catch { /* silent — the client keeps showing the corrected date */ }
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
  const sid = await resolveStudentId();
  const d = await db();
  // Clear existing for this user
  const existingSubs = await safeList<Subject>(COLLECTIONS.subjects, [`equal("studentId", "${sid}")`]);
  const existingTops = await safeList<Topic>(COLLECTIONS.topics, [`equal("studentId", "${sid}")`]);
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
      studentId: sid,
    });
  }
  for (const t of tops) {
    await d.createDocument(DB_ID, COLLECTIONS.topics, await genId(), {
      ...t,
      studentId: sid,
    });
  }
}

export async function saveMission(
  date: string,
  totalMinutes: number,
  tasks: Omit<MissionTask, "id">[],
) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  const sid = await resolveStudentId();
  const d = await db();
  const mId = `m-${sid}-${date}`;
  try { await d.deleteDocument(DB_ID, COLLECTIONS.missions, mId); } catch {}
  await d.createDocument(DB_ID, COLLECTIONS.missions, mId, {
    studentId: sid,
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
): Promise<ServerMission | null> {
  const allTopics = await getServerTopics();
  const allSubjects = await getServerSubjects();
  if (!allTopics.length || !allSubjects.length) return null;

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
  const remaining = studyTime - 15;

  for (const { topic, subject } of scored) {
    if (minutesUsed >= remaining) break;
    if (topic.confidence === 0 && tasks.length > 0) continue;

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

    tasks.push({
      topicId: topic.id,
      topic: topic.name,
      subject: subject?.name ?? "General",
      reason: kind === "learn"
        ? `New topic — confidence is 0%. Build the base idea first.`
        : kind === "quiz"
          ? `Confidence is ${topic.confidence}%. A quick quiz will test what's stuck.`
          : `Confidence fell to ${topic.confidence}%. The ${subject?.name ?? "paper"} is ${subject ? daysUntil(subject.examDate, TODAY) : "?"} days out.`,
      minutes,
      status: tasks.length === 0 ? "active" : "pending",
      kind,
    });
    minutesUsed += minutes;
  }

  if (tasks.length === 0) return null;

  const totalMinutes = tasks.reduce((sum, t) => sum + t.minutes, 0);
  const sid = await resolveStudentId();
  if (!sid) return null;
  const missionId = `m-${sid}-${date}`;

  await saveMission(date, totalMinutes, tasks);

  return {
    id: missionId,
    date,
    totalMinutes,
    tasks: tasks.map((t, i) => ({ ...t, id: `mt${i + 1}` })),
  };
}
