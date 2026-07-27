import { Client, Databases, Storage, Users } from "node-appwrite";

let _client: Client | null = null;
let _databases: Databases | null = null;
let _storage: Storage | null = null;
let _users: Users | null = null;

function getClient() {
  if (!_client) {
    _client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_SECRET_KEY!);
  }
  return _client;
}

export function getDatabases() {
  if (!_databases) _databases = new Databases(getClient());
  return _databases;
}

export function getStorage() {
  if (!_storage) _storage = new Storage(getClient());
  return _storage;
}

export function getUsers() {
  if (!_users) _users = new Users(getClient());
  return _users;
}

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
