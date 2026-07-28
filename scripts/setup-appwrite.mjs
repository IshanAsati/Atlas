/**
 * One-shot setup: creates the Atlas database, collections, attributes,
 * and storage bucket in Appwrite. Safe to re-run — ignores existing resources.
 *
 *   node scripts/setup-appwrite.mjs
 *
 * Requires APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_SECRET_KEY in
 * .env.local (loaded automatically by Next.js for `npm run dev`, but this
 * script runs standalone so we load them with a quick dotenv-like read).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Databases, Storage } from "node-appwrite";

/* ----- env loader ----- */
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  let content;
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    console.error("✗ .env.local not found. Create it first.");
    process.exit(1);
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const SECRET_KEY = process.env.APPWRITE_SECRET_KEY;

if (!ENDPOINT || !PROJECT_ID || !SECRET_KEY) {
  console.error("✗ Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_SECRET_KEY");
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(SECRET_KEY);
const databases = new Databases(client);
const storage = new Storage(client);

const DB_ID = "atlas";
const BUCKET_ID = "syllabi";

/* ----- helpers ----- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDatabase() {
  try {
    await databases.get(DB_ID);
    console.log(`  Database "${DB_ID}" exists`);
  } catch {
    await databases.create(DB_ID, DB_ID);
    console.log(`  Created database "${DB_ID}"`);
    await sleep(500);
  }
}

async function ensureCollection(id, name) {
  try {
    await databases.getCollection(DB_ID, id);
    console.log(`  Collection "${name}" (${id}) exists`);
    return;
  } catch {
    /* will create below */
  }
  await databases.createCollection(DB_ID, id, name);
  console.log(`  Created collection "${name}"`);
}

const STRING = "string";
const INTEGER = "integer";
const BOOLEAN = "boolean";

async function addAttr(colId, key, type, opts = {}) {
  const { required = false, size = 255, default: def } = opts;
  try {
    if (type === STRING) {
      await databases.createStringAttribute(DB_ID, colId, key, size, required, def ?? null, false, false);
    } else if (type === INTEGER) {
      await databases.createIntegerAttribute(DB_ID, colId, key, required, undefined, undefined, def ?? null);
    } else if (type === BOOLEAN) {
      await databases.createBooleanAttribute(DB_ID, colId, key, required, def ?? null);
    }
    console.log(`    + ${key} (${type})`);
  } catch (e) {
    if (e.message?.includes("already exists") || e.code === 409) {
      console.log(`    ${key} (exists)`);
    } else throw e;
  }
}

async function ensureBucket() {
  try {
    await storage.getBucket(BUCKET_ID);
    console.log(`  Bucket "${BUCKET_ID}" exists`);
  } catch {
    await storage.createBucket(BUCKET_ID, BUCKET_ID);
    console.log(`  Created bucket "${BUCKET_ID}"`);
  }
}

/* ----- main ----- */
async function main() {
  console.log(`\n  Atlas · Appwrite setup\n`);
  console.log(`  Endpoint: ${ENDPOINT}\n`);

  console.log("Database");
  await ensureDatabase();

  console.log("\nCollections");

  console.log("  students");
  await ensureCollection("students", "Students");
  await addAttr("students", "name", STRING);
  await addAttr("students", "grade", STRING);
  await addAttr("students", "studyTime", INTEGER);
  await addAttr("students", "momentum", INTEGER);
  await addAttr("students", "momentumDelta", INTEGER);
  await addAttr("students", "xp", INTEGER);
  await addAttr("students", "level", INTEGER);
  await addAttr("students", "missionsCompleted", INTEGER);
  await addAttr("students", "missionsAttempted", INTEGER);

  console.log("  subjects");
  await ensureCollection("subjects", "Subjects");
  await addAttr("subjects", "studentId", STRING);
  await addAttr("subjects", "name", STRING);
  await addAttr("subjects", "discipline", STRING);
  await addAttr("subjects", "examDate", STRING);
  await addAttr("subjects", "accent", STRING);
  await addAttr("subjects", "topicCount", INTEGER);

  console.log("  topics");
  await ensureCollection("topics", "Topics");
  await addAttr("topics", "studentId", STRING);
  await addAttr("topics", "subjectId", STRING);
  await addAttr("topics", "name", STRING);
  await addAttr("topics", "confidence", INTEGER);
  await addAttr("topics", "nextReview", STRING);
  await addAttr("topics", "lastSeenDays", INTEGER);

  console.log("  missions");
  await ensureCollection("missions", "Missions");
  await addAttr("missions", "studentId", STRING);
  await addAttr("missions", "date", STRING);
  await addAttr("missions", "totalMinutes", INTEGER);

  console.log("  mission_tasks");
  await ensureCollection("mission_tasks", "Mission Tasks");
  await addAttr("mission_tasks", "missionId", STRING);
  await addAttr("mission_tasks", "topicId", STRING);
  await addAttr("mission_tasks", "topic", STRING);
  await addAttr("mission_tasks", "subject", STRING);
  await addAttr("mission_tasks", "reason", STRING, { size: 512 });
  await addAttr("mission_tasks", "minutes", INTEGER);
  await addAttr("mission_tasks", "status", STRING);
  await addAttr("mission_tasks", "kind", STRING);
  await addAttr("mission_tasks", "order", INTEGER);

  console.log("  calendar_days");
  await ensureCollection("calendar_days", "Calendar Days");
  await addAttr("calendar_days", "studentId", STRING);
  await addAttr("calendar_days", "date", STRING);
  await addAttr("calendar_days", "state", STRING);
  await addAttr("calendar_days", "minutes", INTEGER);

  console.log("  coach_threads");
  await ensureCollection("coach_threads", "Coach Threads");
  await addAttr("coach_threads", "studentId", STRING);
  await addAttr("coach_threads", "topicId", STRING);
  await addAttr("coach_threads", "turns", STRING, { size: 65535 });

  console.log("\nStorage");
  await ensureBucket();

  console.log("\n✓ Setup complete.\n");
}

main().catch((e) => {
  console.error("\n✗ Setup failed:", e.message);
  process.exit(1);
});
