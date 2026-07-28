/**
 * Tool executor for the Atlas coach.
 *
 * DeepSeek can request these functions during a coaching session. Each
 * tool runs server-side and returns a result that is fed back to the model.
 */

import { getServerTopics, getServerSubjects, getServerMission, getServerCalendarDays } from "@/lib/data";
import type { CoachAction, ToolCall } from "@/lib/coach/types";

export interface ToolResult {
  ok: boolean;
  result: string;
  action?: CoachAction;
}

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const name = call.function.name;
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.function.arguments);
  } catch {
    return { ok: false, result: "Invalid tool arguments." };
  }

  switch (name) {
    case "query_appwrite":
      return queryAppwrite(args);
    case "web_search":
      return webSearch(args);
    case "ui_action":
      return uiAction(args);
    default:
      return { ok: false, result: `Unknown tool: ${name}` };
  }
}

async function queryAppwrite(args: Record<string, unknown>): Promise<ToolResult> {
  const entity = String(args.entity ?? "");
  const filter = String(args.filter ?? "");

  try {
    switch (entity) {
      case "topics": {
        const topics = await getServerTopics();
        const subjectMatch = filter.match(/subjectId=(.+)/);
        if (subjectMatch) {
          return { ok: true, result: JSON.stringify(topics.filter((t) => t.subjectId === subjectMatch[1])) };
        }
        const topic = topics.find((t) => t.id === filter || t.name === filter);
        return { ok: true, result: JSON.stringify(topic ?? topics) };
      }
      case "subjects": {
        const subjects = await getServerSubjects();
        const subject = subjects.find((s) => s.id === filter || s.name === filter);
        return { ok: true, result: JSON.stringify(subject ?? subjects) };
      }
      case "missions": {
        const mission = await getServerMission(filter === "today" ? undefined : filter);
        return { ok: true, result: JSON.stringify(mission) };
      }
      case "calendar": {
        const today = new Date();
        const days = await getServerCalendarDays(today.getFullYear(), today.getMonth());
        return { ok: true, result: JSON.stringify(days) };
      }
      default:
        return { ok: false, result: `Unsupported entity: ${entity}` };
    }
  } catch (e) {
    return { ok: false, result: `Appwrite query failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function webSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const query = String(args.query ?? "");
  if (!query) return { ok: false, result: "No query provided." };

  // Web search requires a third-party provider. Add a key to enable it:
  // SERPER_API_KEY, BING_API_KEY, or similar.
  const provider = process.env.SERPER_API_KEY
    ? "serper"
    : process.env.BING_API_KEY
      ? "bing"
      : null;

  if (!provider) {
    return {
      ok: false,
      result:
        "Web search is not configured. Set SERPER_API_KEY or BING_API_KEY in .env.local to enable it.",
    };
  }

  try {
    if (provider === "serper") {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 3 }),
      });
      const data = await res.json();
      const snippets = (data.organic ?? [])
        .map((r: { title?: string; snippet?: string; link?: string }) => `${r.title}: ${r.snippet} (${r.link})`)
        .join("\n");
      return { ok: true, result: snippets || "No results." };
    }

    return { ok: false, result: "Search provider not yet implemented." };
  } catch (e) {
    return { ok: false, result: `Web search failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

function uiAction(args: Record<string, unknown>): ToolResult {
  const action = String(args.action ?? "");
  const payload = (args.payload ?? {}) as Record<string, unknown>;

  if (action === "mark_task_complete" && typeof payload.topicId === "string") {
    return { ok: true, result: "Task marked complete.", action: { type: "mark_task_complete", topicId: payload.topicId } };
  }
  if (action === "navigate" && typeof payload.to === "string") {
    return { ok: true, result: `Navigating to ${payload.to}.`, action: { type: "navigate" as const, to: payload.to as "/" | "/graph" | "/calendar" | "/progress" | "/focus" } };
  }
  if (action === "highlight_topic" && typeof payload.topicId === "string") {
    return { ok: true, result: "Topic highlighted.", action: { type: "highlight_topic", topicId: payload.topicId } };
  }

  return { ok: false, result: `Invalid ui_action: ${action}` };
}
