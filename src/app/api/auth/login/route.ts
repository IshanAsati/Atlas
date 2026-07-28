import { NextResponse } from "next/server";
import { loginSession } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const token = await loginSession(email, password);
    if (!token) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = { email };

    return NextResponse.json({ token, user });
  } catch (error) {
    console.error("[login] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
