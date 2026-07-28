import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";

/**
 * Refuse an API request that carries no session.
 *
 * The data layer already scopes every query to the signed-in student, so an
 * unauthenticated request could only ever read an empty set — this isn't
 * plugging a leak. It's so the app says "unauthorized" rather than "you have
 * no subjects", which are very different things to debug.
 *
 * Returns null when the caller is allowed through.
 */
export async function denyIfSignedOut(): Promise<NextResponse | null> {
  const studentId = await getSessionUserId();
  if (studentId) return null;
  return NextResponse.json(
    { error: "Sign in to continue." },
    { status: 401 },
  );
}
