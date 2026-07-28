import { NextResponse } from "next/server";
import { toChatMessages } from "@/lib/coach/prompt";
import { offlineReply } from "@/lib/coach/offline";
import { loadThread, saveThread } from "@/lib/coach/memory";
import {
  EMPTY_RESULT,
  SENTINEL,
  normaliseResult,
  type CoachFrame,
  type CoachRequest,
  type CoachResult,
  type CoachTurn,
} from "@/lib/coach/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
const TIMEOUT_MS = 30_000;

export async function POST(request: Request) {
  let body: CoachRequest;
  try {
    body = (await request.json()) as CoachRequest;
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!body?.context?.topic || !Array.isArray(body.turns)) {
    return NextResponse.json({ error: "Missing topic or turns." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const key = process.env.DEEPSEEK_API_KEY;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (frame: CoachFrame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));

      if (!key) {
        await streamOffline(body, send);
        controller.close();
        return;
      }

      try {
        const memory = await loadThread(body.context.topicId);
        const turns = mergeTurns(memory, body.turns);

        await streamLive({ ...body, turns }, key, send);

        const lastCoach = [...turns, ...body.turns.filter((t) => t.role === "coach")];
        await saveThread(body.context.topicId, lastCoach);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        console.error("[coach] live call failed, falling back offline:", reason);
        await streamOffline(body, send);
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

function mergeTurns(memory: CoachTurn[], incoming: CoachTurn[]): CoachTurn[] {
  const out = [...memory];
  for (const turn of incoming) {
    const last = out[out.length - 1];
    if (last && last.role === turn.role && last.body === turn.body) continue;
    out.push(turn);
  }
  return out;
}

async function streamLive(
  body: CoachRequest,
  key: string,
  send: (frame: CoachFrame) => void,
) {
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: toChatMessages(body.context, body.turns),
      stream: true,
      temperature: 0.6,
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek ${response.status}: ${detail.slice(0, 200)}`);
  }

  send({ type: "source", value: "live" });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let sse = "";
  let full = "";
  let emitted = 0;
  let cut = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sse += decoder.decode(value, { stream: true });
    const lines = sse.split("\n");
    sse = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let delta = "";
      try {
        const parsed = JSON.parse(payload);
        delta = parsed?.choices?.[0]?.delta?.content ?? "";
      } catch {
        continue;
      }
      if (!delta) continue;

      full += delta;

      if (cut === -1) {
        const found = full.indexOf(SENTINEL);
        if (found !== -1) {
          cut = found;
          if (found > emitted) send({ type: "token", text: full.slice(emitted, found) });
          emitted = found;
        } else {
          const safe = full.length - (SENTINEL.length - 1);
          if (safe > emitted) {
            send({ type: "token", text: full.slice(emitted, safe) });
            emitted = safe;
          }
        }
      }
    }
  }

  if (cut === -1 && full.length > emitted) {
    send({ type: "token", text: full.slice(emitted) });
  }

  send({ type: "result", result: extractResult(full) });
}

function extractResult(full: string): CoachResult {
  const at = full.indexOf(SENTINEL);
  if (at === -1) return EMPTY_RESULT;

  const tail = full.slice(at + SENTINEL.length).trim();
  const start = tail.indexOf("{");
  const end = tail.lastIndexOf("}");
  if (start === -1 || end <= start) return EMPTY_RESULT;

  try {
    return normaliseResult(JSON.parse(tail.slice(start, end + 1)));
  } catch {
    return EMPTY_RESULT;
  }
}

async function streamOffline(body: CoachRequest, send: (frame: CoachFrame) => void) {
  const { text, result } = offlineReply(body.context, body.turns);
  send({ type: "source", value: "offline" });

  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    send({ type: "token", text: word });
    await new Promise((resolve) => setTimeout(resolve, 28));
  }

  send({ type: "result", result });
}

