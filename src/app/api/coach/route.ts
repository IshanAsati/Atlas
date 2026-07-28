import { NextResponse } from "next/server";
import { toChatMessages, TOOLS } from "@/lib/coach/prompt";
import { offlineReply } from "@/lib/coach/offline";
import { loadThread, saveThread } from "@/lib/coach/memory";
import { executeTool } from "@/lib/coach/tools";
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

/**
 * The coach endpoint. Streams newline-delimited JSON frames.
 *
 * What's new:
 * - Loads the persisted thread from Appwrite so the coach remembers past turns.
 * - Gives DeepSeek tools (query Appwrite, web search, UI actions).
 * - Runs a tool loop: if the model calls tools, executes them and asks again.
 * - Persists the updated thread back to Appwrite.
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

      if (!key) {
        await streamOffline(body, send);
        controller.close();
        return;
      }

      try {
        // Merge incoming turns with persisted memory
        const memory = await loadThread(body.context.topicId);
        const mergedTurns = mergeTurns(memory, body.turns);
        const requestWithMemory: CoachRequest = { ...body, turns: mergedTurns };

        const finalTurns = await runToolLoop(requestWithMemory, key, send);

        // Persist final thread
        await saveThread(body.context.topicId, finalTurns);

        // Stream the final response with all tool results already injected
        await streamLive({ ...body, turns: finalTurns }, key, send);
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

/** Merge memory and new turns, avoiding duplicates by role+body. */
function mergeTurns(memory: CoachTurn[], incoming: CoachTurn[]): CoachTurn[] {
  const seen = new Set<string>();
  const out: CoachTurn[] = [];
  for (const turn of [...memory, ...incoming]) {
    const key = `${turn.role}:${turn.body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(turn);
  }
  return out;
}

/** Repeatedly call DeepSeek until it stops calling tools. */
async function runToolLoop(
  body: CoachRequest,
  key: string,
  send: (frame: CoachFrame) => void,
  depth = 0,
): Promise<CoachTurn[]> {
  if (depth > 3) return body.turns; // safety limit

  const response = await callDeepSeekNonStreaming(body, key);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: {
      message?: {
        content?: string;
        tool_calls?: {
          id: string;
          function: { name: string; arguments: string };
        }[];
      };
    }[];
  };

  const message = data.choices?.[0]?.message;
  const content = message?.content ?? "";
  const toolCalls = message?.tool_calls ?? [];

  if (toolCalls.length === 0) {
    // No tools — final answer ready
    if (content.trim()) {
      return [...body.turns, { role: "coach", body: content.trim() }];
    }
    return body.turns;
  }

  // Append coach turn that issued tool calls
  const turnsAfterCall: CoachTurn[] = [
    ...body.turns,
    { role: "coach", body: content || "Let me check that.", toolCalls: toolCalls.map((t) => ({ id: t.id, function: t.function })) },
  ];

  // Execute each tool and append tool results as user turns
  for (const call of toolCalls) {
    send({ type: "tool_call", call: { id: call.id, function: call.function } });
    const result = await executeTool({ id: call.id, function: call.function });
    send({ type: "tool_result", callId: call.id, result: result.result });

    if (result.action) {
      send({ type: "action", action: result.action });
    }

    turnsAfterCall.push({
      role: "student",
      body: `[tool result for ${call.function.name}]: ${result.result}`,
    });
  }

  return runToolLoop({ ...body, turns: turnsAfterCall }, key, send, depth + 1);
}

async function callDeepSeekNonStreaming(body: CoachRequest, key: string) {
  return fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: toChatMessages(body.context, body.turns),
      tools: TOOLS,
      temperature: 0.6,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
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
      max_tokens: 800,
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
