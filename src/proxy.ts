import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/welcome", "/onboarding", "/api/auth"];

function verifyCookie(cookieValue: string): boolean {
  try {
    const decoded = JSON.parse(Buffer.from(cookieValue, "base64").toString());
    const now = new Date();
    const expires = new Date(decoded.expire);
    return expires > now;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const prefix of PUBLIC_ROUTES) {
    if (pathname.startsWith(prefix)) return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("atlas-session");
  if (!cookie?.value || !verifyCookie(cookie.value)) {
    /* An API call gets a status it can act on. Redirecting it to an HTML
       page made every unauthenticated request look like a JSON parse error
       instead of an expired session. */
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }
    /* Signed out, the first thing you should meet is what Atlas is — not a
       login form. The landing page carries on to onboarding. */
    const response = NextResponse.redirect(new URL("/welcome", request.url));
    response.cookies.delete("atlas-session");
    return response;
  }

  return NextResponse.next();
}
