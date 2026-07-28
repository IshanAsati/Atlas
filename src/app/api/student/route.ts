import { NextResponse } from "next/server";
import { getServerStudent } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const student = await getServerStudent();
    return NextResponse.json(student);
  } catch (error) {
    console.error("[student] GET error:", error);
    return NextResponse.json({ error: "Failed to load student." }, { status: 500 });
  }
}
