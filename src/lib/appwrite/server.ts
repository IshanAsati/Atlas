const DB_ID = "atlas";
const BUCKET_ID = "syllabi";

const NCERT_BUCKETS = {
  science: "6a68e392002c9f9cc421",
  math: "6a68e598001354634d95",
} as const;

const COLLECTIONS = {
  students: "students",
  subjects: "subjects",
  topics: "topics",
  missions: "missions",
  missionTasks: "mission_tasks",
  calendarDays: "calendar_days",
  coachThreads: "coach_threads",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _databases: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _storage: any = null;
let _initing = false;

async function init() {
  if (_databases) return;
  if (_initing) return;
  _initing = true;
  try {
    const { Client, Databases, Storage } = await import("node-appwrite");
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_SECRET_KEY!);
    _databases = new Databases(client);
    _storage = new Storage(client);
  } finally {
    _initing = false;
  }
}

export async function getDatabases() {
  await init();
  return _databases;
}

export async function getStorage() {
  await init();
  return _storage;
}

export { DB_ID, BUCKET_ID, NCERT_BUCKETS, COLLECTIONS };
