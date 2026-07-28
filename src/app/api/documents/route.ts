import { NextResponse } from "next/server";
import { denyIfSignedOut } from "@/lib/auth/guard";
import { deleteSyllabus, getServerSubjects, getServerTopics } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * The documents concept, without a documents collection.
 *
 * Atlas never stored the PDF a student uploaded — extraction reads it, saves
 * subjects and topics, and throws the file away. So "your syllabus" is the
 * set of subjects currently on the account, each one standing for the part of
 * the upload it came from. That keeps this honest: the list shows what Atlas
 * actually plans from, not what was once posted to it.
 */
export interface SyllabusDocument {
  id: string;
  name: string;
  discipline: string;
  examDate: string;
  accent: "teal" | "amber" | "rust";
  topicCount: number;
}

/** GET /api/documents → the syllabus, one row per subject. */
export async function GET() {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  try {
    const [subjects, topics] = await Promise.all([getServerSubjects(), getServerTopics()]);

    const counts = new Map<string, number>();
    for (const topic of topics) {
      counts.set(topic.subjectId, (counts.get(topic.subjectId) ?? 0) + 1);
    }

    const documents: SyllabusDocument[] = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      discipline: subject.discipline,
      examDate: subject.examDate,
      accent: subject.accent,
      topicCount: counts.get(subject.id) ?? 0,
    }));

    return NextResponse.json(documents);
  } catch (error) {
    console.error("[documents] GET error:", error);
    return NextResponse.json({ error: "Failed to load your syllabus." }, { status: 500 });
  }
}

/**
 * DELETE /api/documents             → remove every subject and topic
 * DELETE /api/documents?subjectId=X → remove one subject and its topics
 *
 * The id goes in the query rather than a body: a DELETE with a body is
 * dropped by enough proxies that it isn't worth the ambiguity.
 */
export async function DELETE(request: Request) {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  const subjectId = new URL(request.url).searchParams.get("subjectId") ?? undefined;

  try {
    const removed = await deleteSyllabus(subjectId);
    return NextResponse.json({ success: true, ...removed });
  } catch (error) {
    const why = error instanceof Error ? error.message : "unknown error";
    console.error("[documents] DELETE error:", why);
    return NextResponse.json(
      {
        error: subjectId
          ? `Couldn't remove that subject. ${why}`
          : `Couldn't remove your syllabus. ${why}`,
      },
      { status: 500 },
    );
  }
}
