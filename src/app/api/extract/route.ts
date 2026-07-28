import { NextResponse } from "next/server";
import { extractionPrompt } from "@/lib/extract/prompt";
import { saveExtractedSubjects } from "@/lib/data";
import { extractPdfText, looksLikeProse } from "@/lib/extract/pdf-text";
import type { Subject, Topic } from "@/lib/mock";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
const TIMEOUT_MS = 50_000;

interface ExtractionFrame {
  type: "source" | "stage" | "result" | "error";
  value?: string;
  text?: string;
  message?: string;
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
        send({
          type: "error",
          message: "Atlas can't reach the extractor — DEEPSEEK_API_KEY isn't set on the server.",
        });
        controller.close();
        return;
      }

      try {
        // Extract text from PDF
        send({ type: "stage", text: "Reading your syllabus..." });
        const pdfText = await extractText(file);
        if (!pdfText.trim()) {
          send({
            type: "error",
            message:
              "No text found in that PDF. If it's a scan or a photo, Atlas can't read it yet — try a text-based PDF.",
          });
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
            messages: [
              { role: "system", content: extractionPrompt() },
              { role: "user", content: pdfText.slice(0, 60_000) },
            ],
            stream: true,
            temperature: 0.2,
            // A full syllabus is a lot of JSON; 3000 truncated it mid-object,
            // which surfaced as "couldn't find any subjects".
            max_tokens: 8000,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => "");
          console.error("[extract] DeepSeek", response.status, detail.slice(0, 300));
          send({
            type: "error",
            message:
              response.status === 401
                ? "The DeepSeek key was rejected. Check DEEPSEEK_API_KEY."
                : `The extractor returned ${response.status}. Try again in a moment.`,
          });
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

        if (!result.subjects?.length) {
          console.error("[extract] no subjects parsed from:", full.slice(0, 400));
          send({
            type: "error",
            message:
              "Atlas read the file but couldn't find any subjects in it. Is this a syllabus?",
          });
          controller.close();
          return;
        }

        send({ type: "stage", text: "Saving to your account..." });
        try {
          await saveExtractedSubjects(result.subjects, result.topics ?? []);
        } catch (saveError) {
          const why = saveError instanceof Error ? saveError.message : "unknown error";
          console.error("[extract] save failed:", why);
          send({
            type: "error",
            message: `Atlas read your syllabus but couldn't save it. ${why}`,
          });
          controller.close();
          return;
        }

        send({ type: "stage", text: `Saved ${result.subjects.length} subjects and ${result.topics?.length ?? 0} topics.` });
        send(result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        console.error("[extract]", reason);
        send({
          type: "error",
          message:
            reason.includes("timeout") || reason.includes("aborted")
              ? "That took too long to read. Try a shorter PDF."
              : "Couldn't read that file. Try a different PDF.",
        });
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

/**
 * Read the syllabus text, dependency-free first.
 *
 * pdf-parse (pdf.js) works locally but dies on Vercel with "Setting up fake
 * worker failed" — the worker is loaded through a dynamic import the file
 * tracer can't follow. So the zlib-based reader goes first because it has no
 * moving parts, and pdf.js is only tried if that comes back implausibly
 * short. Whichever wins, extraction is never left with nothing.
 */
async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  let direct = "";
  try {
    direct = extractPdfText(buffer);
  } catch (error) {
    console.error("[extract] direct reader failed:", error);
  }

  /* Only trust the direct read if it produced actual words. A subset font
     yields plenty of characters in the wrong alphabet, and passing that to
     the model is worse than admitting we couldn't read the file. */
  if (looksLikeProse(direct)) {
    console.log(`[extract] direct reader: ${direct.length} chars`);
    return direct;
  }

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const viaPdfjs = (await parser.getText()).text ?? "";
      if (viaPdfjs.trim()) {
        console.log(`[extract] pdf.js: ${viaPdfjs.length} chars`);
        return viaPdfjs;
      }
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (error) {
    console.error("[extract] pdf.js fallback failed:", error);
  }

  // Neither route produced readable words.
  return looksLikeProse(direct) ? direct : "";
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

    /* A syllabus often has no exam dates in it at all. Leaving the date
       empty produces an Invalid Date in the UI, so fall back to a month out
       and let the student correct it on the confirm step. */
    const fallbackDate = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };
    const isDate = (v: unknown): v is string =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

    for (const sub of data.subjects ?? []) {
      if (!sub?.name) continue;
      const subjectId = `s${subjects.length + 1}`;
      subjects.push({
        name: String(sub.name),
        discipline: sub.discipline ?? "General",
        examDate: isDate(sub.examDate) ? sub.examDate : fallbackDate(30 + subjects.length * 4),
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
