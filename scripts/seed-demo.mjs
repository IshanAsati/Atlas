/**
 * Demo account seed — creates aarush@gmail.com / password and seeds
 * all pre-configured data scoped to that user.
 *
 *   node scripts/seed-demo.mjs
 *
 * Uses the Appwrite Users API to create the account, then creates
 * a session to get the userId, then seeds subjects/topics/missions/calendar
 * keyed to that userId.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Account, Databases, ID, Users } from "node-appwrite";

/* ----- env loader ----- */
(function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  let content;
  try { content = readFileSync(envPath, "utf-8"); } catch {
    console.error(".env.local not found");
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

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const KEY = process.env.APPWRITE_SECRET_KEY;
const DB = "atlas";

async function main() {
  console.log("\n  Atlas · Demo Seed\n");

  // --- Create user ---
  const serverClient = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY);
  const users = new Users(serverClient);

  console.log("Creating demo user: aarush@gmail.com...");
  let userId;
  try {
    const user = await users.create("unique()", "aarush@gmail.com", undefined, "password", "Aarush");
    userId = user.$id;
    console.log(`  Created user ${userId}`);
  } catch (e) {
    if (e.message?.includes("already") || e.message?.includes("exists")) {
      console.log("  User already exists. Listing all users...");
      const { users: list } = await users.list();
      const match = list.find((u) => u.email === "aarush@gmail.com");
      if (!match) {
        console.error("  Could not find user.");
        process.exit(1);
      }
      userId = match.$id;
      console.log(`  Found existing user ${userId}`);
    } else {
      console.error("  Create failed:", e.message);
      process.exit(1);
    }
  }

  console.log(`  Demo user ready: aarush@gmail.com (userId: ${userId})`);

  // --- Seed data ---
  const databases = new Databases(serverClient);

  console.log("\nClearing existing data for this user...");
  await purgeUser(databases, userId);

  console.log("\nSeeding data...");

  // Student profile — document ID is the userId for direct lookup
  await databases.createDocument(DB, "students", userId, {
    name: "Aarush",
    grade: "Class 10 · CBSE",
    studyTime: 120,
    momentum: 74,
    momentumDelta: -6,
    xp: 8420,
    level: 12,
    missionsCompleted: 63,
    missionsAttempted: 81,
  });
  console.log("  student profile");

  // Subjects
  const subs = [
    { name: "Physics", discipline: "Science", examDate: "2026-08-14", accent: "rust", topicCount: 4 },
    { name: "Chemistry", discipline: "Science", examDate: "2026-08-18", accent: "amber", topicCount: 3 },
    { name: "Biology", discipline: "Science", examDate: "2026-08-21", accent: "teal", topicCount: 2 },
    { name: "Mathematics Standard", discipline: "Mathematics", examDate: "2026-08-26", accent: "teal", topicCount: 3 },
  ];
  const subjectIds = [];
  for (const s of subs) {
    const doc = await databases.createDocument(DB, "subjects", ID.unique(), {
      ...s,
      studentId: userId,
    });
    subjectIds.push(doc.$id);
  }
  console.log(`  ${subs.length} subjects`);

  // Topics with realistic confidence — keyed to generated subject IDs
  const [sId1, sId2, sId3, sId4] = subjectIds;
  const topics = [
    { subjectId: sId1, name: "Electricity", confidence: 90, nextReview: "2026-08-04", lastSeenDays: 2 },
    { subjectId: sId1, name: "Light — Reflection", confidence: 65, nextReview: "2026-07-29", lastSeenDays: 6 },
    { subjectId: sId1, name: "Magnetic Effects", confidence: 30, nextReview: "2026-07-27", lastSeenDays: 11 },
    { subjectId: sId1, name: "Sources of Energy", confidence: 0, nextReview: "2026-07-28", lastSeenDays: 0 },
    { subjectId: sId2, name: "Acids, Bases & Salts", confidence: 78, nextReview: "2026-08-02", lastSeenDays: 3 },
    { subjectId: sId2, name: "Carbon Compounds", confidence: 44, nextReview: "2026-07-27", lastSeenDays: 9 },
    { subjectId: sId2, name: "Periodic Classification", confidence: 61, nextReview: "2026-07-31", lastSeenDays: 5 },
    { subjectId: sId3, name: "Life Processes", confidence: 82, nextReview: "2026-08-06", lastSeenDays: 1 },
    { subjectId: sId3, name: "Heredity", confidence: 55, nextReview: "2026-07-30", lastSeenDays: 7 },
    { subjectId: sId4, name: "Quadratic Equations", confidence: 88, nextReview: "2026-08-05", lastSeenDays: 2 },
    { subjectId: sId4, name: "Trigonometry", confidence: 37, nextReview: "2026-07-27", lastSeenDays: 10 },
    { subjectId: sId4, name: "Surface Areas & Volumes", confidence: 0, nextReview: "2026-08-01", lastSeenDays: 0 },
  ];
  const topicIds = [];
  for (const t of topics) {
    const doc = await databases.createDocument(DB, "topics", ID.unique(), { ...t, studentId: userId });
    topicIds.push({ id: doc.$id, subjectId: t.subjectId, name: t.name });
  }
  console.log(`  ${topics.length} topics`);

  // Today's mission
  const today = new Date().toISOString().slice(0, 10);
  const mId = `m-${userId}-${today}`;
  try { await databases.deleteDocument(DB, "missions", mId); } catch {}
  await databases.createDocument(DB, "missions", mId, {
    studentId: userId,
    date: today,
    totalMinutes: 118,
  });

  // Map topic names to their generated IDs for mission tasks
  const tMap = Object.fromEntries(topicIds.map((t) => [t.name, t.id]));
  const subjectNames = { [sId1]: "Physics", [sId2]: "Chemistry", [sId3]: "Biology", [sId4]: "Mathematics Standard" };

  const missionTasks = [
    { topicId: tMap["Magnetic Effects"], topic: "Magnetic Effects", subject: "Physics", reason: "Confidence fell to 30% and the Physics paper is 18 days out.", minutes: 40, status: "active", kind: "revise", order: 0 },
    { topicId: tMap["Trigonometry"], topic: "Trigonometry", subject: "Mathematics Standard", reason: "Ten days untouched. Identities decay fastest.", minutes: 35, status: "pending", kind: "revise", order: 1 },
    { topicId: tMap["Carbon Compounds"], topic: "Carbon Compounds", subject: "Chemistry", reason: "You missed 3 of 5 nomenclature questions on Thursday.", minutes: 28, status: "pending", kind: "quiz", order: 2 },
    { topicId: tMap["Light — Reflection"], topic: "Light — Reflection", subject: "Physics", reason: "Scheduled review lands today. Short top-up only.", minutes: 15, status: "complete", kind: "revise", order: 3 },
  ];
  for (const mt of missionTasks) {
    await databases.createDocument(DB, "mission_tasks", ID.unique(), { ...mt, missionId: mId });
  }
  console.log(`  mission (${missionTasks.length} tasks)`);

  // Calendar — 3 weeks of history
  const calendar = [
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
  ];
  for (const cd of calendar) {
    await databases.createDocument(DB, "calendar_days", ID.unique(), {
      ...cd,
      studentId: userId,
      minutes: cd.minutes ?? 0,
    });
  }
  console.log(`  ${calendar.length} calendar days`);

  console.log(`\nDemo account ready:
  Email:    aarush@gmail.com
  Password: password

Log in at /onboarding. The dashboard will show pre-seeded data.\n`);
}

async function purgeUser(databases, userId) {
  // The students doc uses the userId as the document ID
  const collections = ["students"];
  for (const name of collections) {
    try { await databases.deleteDocument(DB, name, userId); console.log(`  Cleared ${name}`); } catch {}
  }
  // Other collections use a 'studentId' attribute
  const attrCollections = ["subjects", "topics", "missions", "mission_tasks", "calendar_days", "coach_threads"];
  for (const name of attrCollections) {
    try {
      const { documents } = await databases.listDocuments(DB, name, [
        `equal("studentId", "${userId}")`,
      ]);
      for (const doc of documents) {
        await databases.deleteDocument(DB, name, doc.$id);
      }
      if (documents.length) console.log(`  Cleared ${name} (${documents.length})`);
    } catch { /* collection may not exist yet */ }
  }
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
