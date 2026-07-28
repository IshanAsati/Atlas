import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/onboarding", "/api/auth"];

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
    const response = NextResponse.redirect(new URL("/onboarding", request.url));
    response.cookies.delete("atlas-session");
    return response;
  }

  return NextResponse.next();
}
