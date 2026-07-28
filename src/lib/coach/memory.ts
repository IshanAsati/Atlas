/**
 * Coach memory persistence — loads and saves coaching threads to Appwrite.
 * Scoped per-user via the session cookie.
 */

import { getDatabases, DB_ID, COLLECTIONS } from "@/lib/appwrite/server";
import { getSessionUserId } from "@/lib/auth/session";
import type { CoachTurn } from "@/lib/coach/types";

async function db() {
  return getDatabases();
}

async function genId() {
  const { ID } = await import("node-appwrite");
  return ID.unique();
}

/** Same legacy-query bug as the data layer: Appwrite rejects these strings. */
async function threadQueries(studentId: string, topicId: string) {
  const { Query } = await import("node-appwrite");
  return [Query.equal("studentId", studentId), Query.equal("topicId", topicId)];
}

export async function loadThread(topicId: string): Promise<CoachTurn[]> {
  if (!process.env.APPWRITE_SECRET_KEY) return [];
  const studentId = (await getSessionUserId()) ?? "student-1";
  const databases = await db();
  try {
    const { documents } = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.coachThreads,
      await threadQueries(studentId, topicId),
    );
    if (documents.length === 0) return [];
    const raw = documents[0];
    const turnsJson = raw.turns as string;
    return JSON.parse(turnsJson) as CoachTurn[];
  } catch (e) {
    console.error("[coach memory] load failed:", e);
    return [];
  }
}

export async function saveThread(topicId: string, turns: CoachTurn[]) {
  if (!process.env.APPWRITE_SECRET_KEY) return;
  const studentId = (await getSessionUserId()) ?? "student-1";
  const databases = await db();
  try {
    const { documents } = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.coachThreads,
      await threadQueries(studentId, topicId),
    );
    const payload = {
      studentId,
      topicId,
      turns: JSON.stringify(turns),
    };
    if (documents.length > 0) {
      await databases.updateDocument(DB_ID, COLLECTIONS.coachThreads, documents[0].$id, payload);
    } else {
      await databases.createDocument(DB_ID, COLLECTIONS.coachThreads, await genId(), payload);
    }
  } catch (e) {
    console.error("[coach memory] save failed:", e);
  }
}
