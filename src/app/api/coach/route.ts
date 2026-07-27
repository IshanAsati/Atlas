import { NextResponse } from "next/server";
import { toChatMessages } from "@/lib/coach/prompt";
import { offlineReply } from "@/lib/coach/offline";
import {
  EMPTY_RESULT,
  SENTINEL,
  normaliseResult,
  type CoachFrame,
  type CoachRequest,
  type CoachResult,
} from "@/lib/coach/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
const TIMEOUT_MS = 20_000;

/**
 * The coach endpoint. The DeepSeek key lives here and never reaches the
 * browser. Responds with newline-delimited JSON frames rather than SSE —
 * one less protocol to get wrong, and a plain ReadableStream reader on the
 * client can parse it.
 *
 * The model streams prose, then a single sentinel line carrying the
 * structured evaluation. This route splits the two so the client never
 * sees a half-written JSON object.
 */
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

      /* No key configured — go straight to the offline coach rather than
         failing. Same for any upstream error further down. */
      if (!key) {
        await streamOffline(body, send);
        controller.close();
        return;
      }

      try {
        await streamLive(body, key, send);
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

async function callDeepSeek(body: CoachRequest, key: string, withThinkingFlag: boolean) {
  return fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: toChatMessages(body.context, body.turns),
      // Thinking mode roughly triples latency; a coaching turn doesn't need it.
      ...(withThinkingFlag ? { thinking: { type: "disabled" } } : {}),
      stream: true,
      temperature: 0.6,
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function streamLive(
  body: CoachRequest,
  key: string,
  send: (frame: CoachFrame) => void,
) {
  let response = await callDeepSeek(body, key, true);

  /* If the account or model rejects the thinking flag, retry once without
     it rather than dropping the whole session to the offline coach. */
  if (response.status === 400) {
    console.warn("[coach] 400 with thinking flag; retrying without it");
    response = await callDeepSeek(body, key, false);
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek ${response.status}: ${detail.slice(0, 200)}`);
  }

  send({ type: "source", value: "live" });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let sse = "";        // unparsed SSE buffer from DeepSeek
  let full = "";       // everything the model has produced
  let emitted = 0;     // how much prose we've forwarded
  let cut = -1;        // index of the sentinel once seen

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
        continue; // a partial frame; the next chunk completes it
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
          /* Hold back the tail in case the sentinel is split across chunks. */
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

/** Pull the sentinel line out of the completed response. */
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

/** Replay a rule-based answer at a readable pace so the UI behaves identically. */
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
