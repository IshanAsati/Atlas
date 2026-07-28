import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * POST /api/auth/logout → end the session.
 *
 * The session cookie is httpOnly, so the browser cannot clear it itself.
 * Without this, "Log out" only forgot the token in localStorage: the cookie
 * survived, the proxy kept letting you through and the data layer kept
 * resolving your account. You were still signed in.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
