import { NextResponse } from "next/server";
import { denyIfSignedOut } from "@/lib/auth/guard";
import { getServerTopics, getServerSubjects, updateTopicConfidence } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * GET  /api/topics?subjectId=...  → list topics
 * GET  /api/topics?type=subjects  → list subjects
 * PATCH /api/topics/:id           → update a topic's confidence
 */
export async function GET(request: Request) {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId") ?? undefined;
  const type = searchParams.get("type");

  try {
    if (type === "subjects") {
      const subjects = await getServerSubjects();
      return NextResponse.json(subjects);
    }
    const topics = await getServerTopics(subjectId);
    return NextResponse.json(topics);
  } catch (error) {
    console.error("[topics] GET error:", error);
    return NextResponse.json({ error: "Failed to load data." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { topicId, confidence } = body;
    if (!topicId) {
      return NextResponse.json({ error: "topicId required." }, { status: 400 });
    }
    if (typeof confidence === "number") {
      await updateTopicConfidence(topicId, confidence);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[topics] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update topic." }, { status: 500 });
  }
}
