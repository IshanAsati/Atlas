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

/**
 * Appwrite's SDK expects queries as JSON strings built by its Query helper.
 * This layer was passing the legacy `equal("field", "value")` syntax, which
 * the server rejects — every list threw, safeList swallowed it, and the whole
 * app read as empty no matter what had been saved.
 */
async function Q() {
  const { Query } = await import("node-appwrite");
  return Query;
}

/** Appwrite pages at 25 documents by default; a year's syllabus is bigger. */
const PAGE_LIMIT = 500;

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

  const existing = await safeGet<StudentProfile>(COLLECTIONS.students, studentId);
  if (existing) return existing;

  /* Registration creates the Appwrite user but never a profile document, so
     every new account read back as null: no greeting, no momentum, no XP.
     Create it the first time it's asked for. */
  return await createStudentProfile(studentId);
}

async function createStudentProfile(studentId: string): Promise<StudentProfile | null> {
  if (!process.env.APPWRITE_SECRET_KEY) return null;

  /* Use the name they signed up with rather than greeting them as "there". */
  let name = "there";
  try {
    const { Client, Users } = await import("node-appwrite");
    const users = new Users(
      new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT!)
        .setProject(process.env.APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_SECRET_KEY!),
    );
    const user = await users.get(studentId);
    if (user?.name) name = user.name;
  } catch {
    /* Fall back to the generic greeting. */
  }

  const profile = {
    name,
    grade: "Class 10",
    studyTime: 120,
    momentum: 50,
    momentumDelta: 0,
    xp: 0,
    level: 1,
    missionsCompleted: 0,
    missionsAttempted: 0,
  };
  try {
    const d = await db();
    const doc = await d.createDocument(DB_ID, COLLECTIONS.students, studentId, profile);
    return clean(doc as unknown as Record<string, unknown>) as unknown as StudentProfile;
  } catch (error) {
    console.error("[data] could not create student profile:", error);
    // Still let the UI render with sensible defaults.
    return { id: studentId, ...profile };
  }
}

/** Update the student's own settings (name, grade, daily study time). */
export async function updateStudentProfile(
  patch: Partial<Pick<StudentProfile, "name" | "grade" | "studyTime">>,
) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  const studentId = await resolveStudentId();
  if (!studentId) return;
  await getServerStudent(); // make sure the document exists
  try {
    const d = await db();
    await d.updateDocument(DB_ID, COLLECTIONS.students, studentId, patch);
  } catch (error) {
    console.error("[data] could not update student profile:", error);
  }
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function getServerSubjects(): Promise<Subject[]> {
  const sid = await resolveStudentId();
  if (!sid) return [];
  const Query = await Q();
  return await safeList<Subject>(COLLECTIONS.subjects, [
    Query.equal("studentId", sid),
    Query.limit(PAGE_LIMIT),
  ]);
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export async function getServerTopics(subjectId?: string): Promise<Topic[]> {
  const sid = await resolveStudentId();
  if (!sid) return [];
  const Query = await Q();
  const queries = [Query.equal("studentId", sid), Query.limit(PAGE_LIMIT)];
  if (subjectId) queries.push(Query.equal("subjectId", subjectId));
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
  const Query = await Q();
  const missions = await safeList<Omit<ServerMission, "tasks">>(COLLECTIONS.missions, [
    Query.equal("studentId", sid),
    Query.equal("date", target),
  ]);

  if (missions.length > 0) {
    const m = missions[0];
    const tasks = await safeList<MissionTask>(COLLECTIONS.missionTasks, [
      Query.equal("missionId", m.id),
      Query.limit(PAGE_LIMIT),
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
  if (!sid) return [];
  const Query = await Q();
  const docs = await safeList<CalendarDay>(COLLECTIONS.calendarDays, [
    Query.equal("studentId", sid),
    Query.startsWith("date", prefix),
    Query.limit(PAGE_LIMIT),
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
  if (!process.env.APPWRITE_SECRET_KEY) {
    throw new Error("APPWRITE_SECRET_KEY is not set — nothing can be saved.");
  }
  const sid = await resolveStudentId();
  /* Saving with a null studentId writes documents nobody can ever read back.
     Fail loudly instead — the caller turns this into a visible message. */
  if (!sid) throw new Error("No signed-in student — can't save the syllabus.");

  const d = await db();
  // Clear existing for this user
  const Query = await Q();
  const existingSubs = await safeList<Subject>(COLLECTIONS.subjects, [
    Query.equal("studentId", sid),
    Query.limit(PAGE_LIMIT),
  ]);
  const existingTops = await safeList<Topic>(COLLECTIONS.topics, [
    Query.equal("studentId", sid),
    Query.limit(PAGE_LIMIT),
  ]);
  for (const s of existingSubs) {
    await d.deleteDocument(DB_ID, COLLECTIONS.subjects, s.id);
  }
  for (const t of existingTops) {
    await d.deleteDocument(DB_ID, COLLECTIONS.topics, t.id);
  }
  /* The extractor numbers subjects s1, s2, s3… and points each topic at one
     of those. Appwrite then assigns its own IDs, so writing the topics
     unchanged left every subjectId dangling: no topic belonged to any
     subject, the graph had empty branches and the planner couldn't tell
     which paper a topic was for. Map the temporary IDs to the real ones. */
  const realIdFor = new Map<string, string>();

  for (const [i, s] of subs.entries()) {
    const id = await genId();
    realIdFor.set(`s${i + 1}`, id);
    await d.createDocument(DB_ID, COLLECTIONS.subjects, id, {
      ...s,
      studentId: sid,
    });
  }

  for (const t of tops) {
    const subjectId = realIdFor.get(t.subjectId) ?? t.subjectId;
    await d.createDocument(DB_ID, COLLECTIONS.topics, await genId(), {
      ...t,
      subjectId,
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
    const examInDays = subject ? daysUntil(subject.examDate, new Date()) : 999;
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

  /* On a brand-new syllabus every topic sits at zero, so a blanket "one new
     topic per mission" rule left the student with a single task. Allow a
     handful of new topics, and lift the cap entirely when nothing has been
     studied yet — there is nothing else to schedule. */
  const hasHistory = allTopics.some((t) => t.confidence > 0);
  const newTopicBudget = hasHistory ? 2 : Number.POSITIVE_INFINITY;
  let newTopicsUsed = 0;

  for (const { topic, subject } of scored) {
    if (minutesUsed >= remaining) break;
    if (topic.confidence === 0) {
      if (newTopicsUsed >= newTopicBudget) continue;
      newTopicsUsed += 1;
    }

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
          : `Confidence fell to ${topic.confidence}%. The ${subject?.name ?? "paper"} is ${subject ? daysUntil(subject.examDate, new Date()) : "?"} days out.`,
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
