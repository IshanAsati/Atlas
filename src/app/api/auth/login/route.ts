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

    // Decode to get user info
    const decoded = JSON.parse(Buffer.from(token, "base64").toString());
    const user = { email, id: decoded.userId };

    const response = NextResponse.json({ token, user });

    // Set the session cookie so server-side code can read it
    response.cookies.set("atlas-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (error) {
    console.error("[login] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
