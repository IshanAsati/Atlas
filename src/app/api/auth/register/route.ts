import { NextResponse } from "next/server";
import { createAccount } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const user = await createAccount(email, password, name);
    if (!user) {
      return NextResponse.json({ error: "Could not create account. Email may already be in use." }, { status: 409 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[register] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
