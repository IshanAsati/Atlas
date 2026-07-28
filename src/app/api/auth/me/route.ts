import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/server";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = auth.slice(7);
  const user = await verifySession(token);
  if (!user) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
