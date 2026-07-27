import { NextResponse } from "next/server";
import { extractionPrompt } from "@/lib/extract/prompt";
import { saveExtractedSubjects } from "@/lib/data";
import type { Subject, Topic } from "@/lib/mock";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
const TIMEOUT_MS = 50_000;

interface ExtractionFrame {
  type: "source" | "stage" | "result";
  value?: string;
  text?: string;
  subjects?: Omit<Subject, "id">[];
  topics?: Omit<Topic, "id">[];
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const key = process.env.DEEPSEEK_API_KEY;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (frame: ExtractionFrame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));

      if (!key) {
        send({ type: "stage", text: "No API key configured. Using placeholder data." });
        controller.close();
        return;
      }

      try {
        // Extract text from PDF
        send({ type: "stage", text: "Reading your syllabus..." });
        const pdfText = await extractText(file);
        if (!pdfText.trim()) {
          send({ type: "stage", text: "Could not read text from this file." });
          controller.close();
          return;
        }

        send({ type: "stage", text: `Read ${pdfText.length.toLocaleString()} characters. Finding subjects...` });

        // Call DeepSeek
        const response = await fetch(DEEPSEEK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "system", content: extractionPrompt(pdfText) }],
            stream: true,
            temperature: 0.3,
            max_tokens: 3000,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => "");
          send({ type: "stage", text: `DeepSeek error: ${response.status}` });
          console.error("[extract]", response.status, detail.slice(0, 200));
          controller.close();
          return;
        }

        send({ type: "source", value: "live" });
        send({ type: "stage", text: "Extracting subjects and exam dates..." });

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        let result: ExtractionFrame | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta?.content ?? "";
              if (delta) full += delta;
            } catch { /* partial frame */ }
          }
        }

        send({ type: "stage", text: "Building your topic graph..." });

        // Parse the result
        result = parseResponse(full);

        // Save to Appwrite
        if (result?.subjects) {
          send({ type: "stage", text: "Saving to database..." });
          await saveExtractedSubjects(result.subjects, result.topics ?? []);
        }

        send(result ?? { type: "result" });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        console.error("[extract]", reason);
        send({ type: "stage", text: `Extraction failed: ${reason}` });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function extractText(file: File): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")) as unknown as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    return data.text;
  } catch {
    // pdf-parse may not be available or file may be corrupt
    return "";
  }
}

function parseResponse(full: string): ExtractionFrame {
  // Try to find a JSON object in the response
  const start = full.indexOf("{");
  const end = full.lastIndexOf("}");
  if (start === -1 || end <= start) return { type: "result" };

  try {
    const data = JSON.parse(full.slice(start, end + 1));
    const subjects: Omit<Subject, "id">[] = [];
    const topics: Omit<Topic, "id">[] = [];
    const accents: Array<"teal" | "amber" | "rust"> = ["teal", "amber", "rust"];
    let accentIdx = 0;

    for (const sub of data.subjects ?? []) {
      const subjectId = `s${subjects.length + 1}`;
      subjects.push({
        name: sub.name,
        discipline: sub.discipline ?? "General",
        examDate: sub.examDate ?? "",
        accent: accents[accentIdx++ % 3],
      });

      for (const top of sub.topics ?? []) {
        topics.push({
          name: top.name,
          subjectId,
          confidence: 0,
          nextReview: new Date().toISOString().slice(0, 10),
          lastSeenDays: 0,
        });
        topicIdx++;
      }
    }

    if (subjects.length === 0) return { type: "result" };

    return {
      type: "result",
      subjects,
      topics,
    };
  } catch (e) {
    console.error("[extract] parse error:", e);
    return { type: "result" };
  }
}
