import { NextResponse } from "next/server";
import { denyIfSignedOut } from "@/lib/auth/guard";
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

export async function POST(request: Request) {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

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
        const mergedTurns = mergeTurns(memory, body.turns);
        const requestWithMemory: CoachRequest = { ...body, turns: mergedTurns };

        send({ type: "source", value: "live" });

        // Single non-streaming call — DeepSeek either responds directly or calls tools
        const finalTurns = await runToolLoop(requestWithMemory, key, send);

        // Persist thread — use the final turns from the tool loop
        if (finalTurns) {
          await saveThread(body.context.topicId, finalTurns.slice(-30));
        }
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

async function runToolLoop(
  body: CoachRequest,
  key: string,
  send: (frame: CoachFrame) => void,
  depth = 0,
): Promise<CoachTurn[] | null> {
  if (depth > 3) return body.turns;

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: toChatMessages(body.context, body.turns),
      tools: TOOLS,
      temperature: 0.6,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
  };

  const message = data.choices?.[0]?.message;
  const content = message?.content ?? "";
  const toolCalls = message?.tool_calls ?? [];

  if (toolCalls.length === 0) {
    // Final answer — stream it token by token
    for (const word of content.split(/(\s+)/)) {
      if (!word) continue;
      send({ type: "token", text: word });
      await new Promise((r) => setTimeout(r, 12));
    }
    const result = extractResult(content);
    send({ type: "result", result });
    return [...body.turns, { role: "coach", body: content }];
  }

  // Execute each tool and append results as tool role (not user role)
  const turnsAfterCall: CoachTurn[] = [
    ...body.turns,
    { role: "coach", body: content || "Let me check that.", toolCalls: toolCalls.map((t) => ({ id: t.id, function: t.function })) },
  ];

  for (const call of toolCalls) {
    send({ type: "tool_call", call: { id: call.id, function: call.function } });
    const toolResult = await executeTool({ id: call.id, function: call.function });
    send({ type: "tool_result", callId: call.id, result: toolResult.result });
    if (toolResult.action) {
      send({ type: "action", action: toolResult.action });
    }
    turnsAfterCall.push({
      role: "student" as const,
      body: `[tool result for ${call.function.name}]: ${toolResult.result}`,
    });
  }

  return runToolLoop({ ...body, turns: turnsAfterCall }, key, send, depth + 1);
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
