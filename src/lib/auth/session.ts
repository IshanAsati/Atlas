/**
 * Server-side session extraction.
 *
 * The login route sets a `session_token` cookie (HTTP-only).
 * All data-layer functions read this cookie to scope Appwrite queries
 * to the authenticated user. No hardcoded "student-1" anymore.
 */

import { cookies } from "next/headers";

export const SESSION_COOKIE = "atlas-session";

/** Parse the session cookie to get the Appwrite user ID. */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const decoded = JSON.parse(Buffer.from(token, "base64").toString());
    return (decoded.userId as string) ?? null;
  } catch {
    return null;
  }
}
