/**
 * Seeds the Appwrite database from src/lib/mock.ts data.
 * Run after setup-appwrite.mjs:
 *
 *   node scripts/seed-appwrite.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Databases, ID } from "node-appwrite";

/* ----- env loader ----- */
(function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  let content;
  try { content = readFileSync(envPath, "utf-8"); } catch {
    console.error("✗ .env.local not found");
    process.exit(1);
  }
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    process.env[t.slice(0, eq).trim()] ||= t.slice(eq + 1).trim();
  }
})();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_SECRET_KEY);

const databases = new Databases(client);
const DB = "atlas";

/* ----- inline the mock data (avoids TS import issues) ----- */

const STUDENT_ID = "student-1";

const student = {
  name: "Aarush",
  grade: "Class 10 · CBSE",
  studyTime: 120,
  momentum: 74,
  momentumDelta: -6,
  xp: 8420,
  level: 12,
  missionsCompleted: 63,
  missionsAttempted: 81,
};

const subjects = [
  { id: "s1", name: "Physics", discipline: "Science", examDate: "2026-08-14", accent: "rust", topicCount: 4 },
  { id: "s2", name: "Chemistry", discipline: "Science", examDate: "2026-08-18", accent: "amber", topicCount: 3 },
  { id: "s3", name: "Biology", discipline: "Science", examDate: "2026-08-21", accent: "teal", topicCount: 2 },
  { id: "s4", name: "Mathematics Standard", discipline: "Mathematics", examDate: "2026-08-26", accent: "teal", topicCount: 3 },
];

const topics = [
  { id: "t1", subjectId: "s1", name: "Electricity", confidence: 90, nextReview: "2026-08-04", lastSeenDays: 2 },
  { id: "t2", subjectId: "s1", name: "Light — Reflection", confidence: 65, nextReview: "2026-07-29", lastSeenDays: 6 },
  { id: "t3", subjectId: "s1", name: "Magnetic Effects", confidence: 30, nextReview: "2026-07-27", lastSeenDays: 11 },
  { id: "t4", subjectId: "s1", name: "Sources of Energy", confidence: 0, nextReview: "2026-07-28", lastSeenDays: 0 },
  { id: "t5", subjectId: "s2", name: "Acids, Bases & Salts", confidence: 78, nextReview: "2026-08-02", lastSeenDays: 3 },
  { id: "t6", subjectId: "s2", name: "Carbon Compounds", confidence: 44, nextReview: "2026-07-27", lastSeenDays: 9 },
  { id: "t7", subjectId: "s2", name: "Periodic Classification", confidence: 61, nextReview: "2026-07-31", lastSeenDays: 5 },
  { id: "t8", subjectId: "s3", name: "Life Processes", confidence: 82, nextReview: "2026-08-06", lastSeenDays: 1 },
  { id: "t9", subjectId: "s3", name: "Heredity", confidence: 55, nextReview: "2026-07-30", lastSeenDays: 7 },
  { id: "t10", subjectId: "s4", name: "Quadratic Equations", confidence: 88, nextReview: "2026-08-05", lastSeenDays: 2 },
  { id: "t11", subjectId: "s4", name: "Trigonometry", confidence: 37, nextReview: "2026-07-27", lastSeenDays: 10 },
  { id: "t12", subjectId: "s4", name: "Surface Areas & Volumes", confidence: 0, nextReview: "2026-08-01", lastSeenDays: 0 },
];

const mission = {
  id: "m-2026-07-27",
  date: "2026-07-27",
  totalMinutes: 118,
};

const missionTasks = [
  { id: "mt1", topicId: "t3", topic: "Magnetic Effects", subject: "Physics", reason: "Confidence fell to 30% and the Physics paper is 18 days out.", minutes: 40, status: "active", kind: "revise", order: 0 },
  { id: "mt2", topicId: "t11", topic: "Trigonometry", subject: "Mathematics", reason: "Ten days untouched. Identities decay fastest.", minutes: 35, status: "pending", kind: "revise", order: 1 },
  { id: "mt3", topicId: "t6", topic: "Carbon Compounds", subject: "Chemistry", reason: "You missed 3 of 5 nomenclature questions on Thursday.", minutes: 28, status: "pending", kind: "quiz", order: 2 },
  { id: "mt4", topicId: "t2", topic: "Light — Reflection", subject: "Physics", reason: "Scheduled review lands today. Short top-up only.", minutes: 15, status: "complete", kind: "revise", order: 3 },
];

const calendarDays = [
  { date: "2026-07-06", state: "complete", minutes: 120 },
  { date: "2026-07-07", state: "complete", minutes: 135 },
  { date: "2026-07-08", state: "partial", minutes: 45 },
  { date: "2026-07-09", state: "complete", minutes: 110 },
  { date: "2026-07-10", state: "missed" },
  { date: "2026-07-11", state: "complete", minutes: 160 },
  { date: "2026-07-12", state: "complete", minutes: 95 },
  { date: "2026-07-13", state: "complete", minutes: 120 },
  { date: "2026-07-14", state: "partial", minutes: 60 },
  { date: "2026-07-15", state: "complete", minutes: 128 },
  { date: "2026-07-16", state: "missed" },
  { date: "2026-07-17", state: "complete", minutes: 118 },
  { date: "2026-07-18", state: "complete", minutes: 142 },
  { date: "2026-07-19", state: "complete", minutes: 90 },
  { date: "2026-07-20", state: "complete", minutes: 105 },
  { date: "2026-07-21", state: "complete", minutes: 130 },
  { date: "2026-07-22", state: "missed" },
  { date: "2026-07-23", state: "partial", minutes: 55 },
  { date: "2026-07-24", state: "complete", minutes: 122 },
  { date: "2026-07-25", state: "complete", minutes: 165 },
  { date: "2026-07-26", state: "complete", minutes: 74 },
  { date: "2026-07-28", state: "planned", minutes: 120 },
  { date: "2026-07-29", state: "planned", minutes: 120 },
  { date: "2026-07-30", state: "planned", minutes: 120 },
  { date: "2026-07-31", state: "planned", minutes: 120 },
  { date: "2026-08-01", state: "planned", minutes: 90 },
  { date: "2026-08-03", state: "planned", minutes: 120 },
  { date: "2026-08-04", state: "planned", minutes: 120 },
];

/* ----- seed ----- */

async function clearCollection(name) {
  try {
    const { documents } = await databases.listDocuments(DB, name);
    for (const doc of documents) {
      await databases.deleteDocument(DB, name, doc.$id);
    }
    console.log(`  Cleared ${name} (${documents.length} docs)`);
  } catch (e) {
    console.log(`  ${name}: ${e.message}`);
  }
}

async function main() {
  console.log("\n  Atlas · Seed\n");

  // Clear first
  console.log("Clearing existing data...");
  await clearCollection("students");
  await clearCollection("subjects");
  await clearCollection("topics");
  await clearCollection("missions");
  await clearCollection("mission_tasks");
  await clearCollection("calendar_days");

  console.log("\nSeeding...");

  // Student
  await databases.createDocument(DB, "students", STUDENT_ID, student);
  console.log(`  ✓ student (${student.name})`);

  // Subjects
  for (const s of subjects) {
    const { id, ...data } = s;
    await databases.createDocument(DB, "subjects", id, {
      ...data,
      studentId: STUDENT_ID,
    });
  }
  console.log(`  ✓ ${subjects.length} subjects`);

  // Topics
  for (const t of topics) {
    const { id, ...data } = t;
    await databases.createDocument(DB, "topics", id, {
      ...data,
      studentId: STUDENT_ID,
    });
  }
  console.log(`  ✓ ${topics.length} topics`);

  // Mission + tasks
  const { id: mId, ...missionData } = mission;
  await databases.createDocument(DB, "missions", mId, {
    ...missionData,
    studentId: STUDENT_ID,
  });

  for (const mt of missionTasks) {
    const { id, ...data } = mt;
    await databases.createDocument(DB, "mission_tasks", id, {
      ...data,
      missionId: mId,
    });
  }
  console.log(`  ✓ mission (${missionTasks.length} tasks)`);

  // Calendar days
  for (const cd of calendarDays) {
    await databases.createDocument(DB, "calendar_days", ID.unique(), {
      ...cd,
      studentId: STUDENT_ID,
      minutes: cd.minutes ?? 0,
    });
  }
  console.log(`  ✓ ${calendarDays.length} calendar days`);

  console.log("\n✓ Seed complete.\n");
}

main().catch((e) => {
  console.error("\n✗ Seed failed:", e.message);
  process.exit(1);
});
