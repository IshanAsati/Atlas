import { Client, Databases, Storage, Users } from "node-appwrite";

const ENDPOINT = process.env.APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const SECRET_KEY = process.env.APPWRITE_SECRET_KEY!;

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(SECRET_KEY);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const users = new Users(client);

export const DB_ID = "atlas";
export const BUCKET_ID = "syllabi";

export const COLLECTIONS = {
  students: "students",
  subjects: "subjects",
  topics: "topics",
  missions: "missions",
  missionTasks: "mission_tasks",
  calendarDays: "calendar_days",
} as const;
