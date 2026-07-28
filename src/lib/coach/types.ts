/** One exchange in the coaching session. */
export interface CoachTurn {
  role: "coach" | "student";
  body: string;
  /** Set on a coach turn when the evaluator named a specific wrong idea. */
  misconception?: string | null;
  /** Tool calls emitted by the coach in this turn. */
  toolCalls?: ToolCall[];
}

/** Everything the coach needs to be a coach rather than a search box. */
export interface CoachContext {
  /** `topics.id` — ties evaluations back to the record the graph reads. */
  topicId: string;
  topic: string;
  subject: string;
  /** 0–100, the `topics.confidence` column */
  confidence: number;
  lastSeenDays: number;
  examInDays: number;
}

export interface CoachQuestion {
  stem: string;
  options: string[];
}

/**
 * Pipeline 3's structured half. The prose is streamed; this arrives in one
 * frame at the end and drives the misconception flag and the confidence meter.
 */
export interface CoachResult {
  misconception: string | null;
  /** −15…+15, applied to the topic's confidence */
  confidenceDelta: number;
  nextQuestion: CoachQuestion | null;
  /** Actions the UI should execute in response to the coach. */
  actions: CoachAction[];
}

export type CoachAction =
  | { type: "mark_task_complete"; topicId: string }
  | { type: "navigate"; to: "/" | "/graph" | "/calendar" | "/progress" | "/focus" }
  | { type: "highlight_topic"; topicId: string };

export interface CoachRequest {
  context: CoachContext;
  turns: CoachTurn[];
}

/** Tool call emitted by DeepSeek. */
export interface ToolCall {
  id?: string;
  function: {
    name: string;
    arguments: string;
  };
}

/** Newline-delimited JSON frames sent from /api/coach. */
export type CoachFrame =
  | { type: "source"; value: "live" | "offline" }
  | { type: "token"; text: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "tool_result"; callId?: string; result: unknown }
  | { type: "result"; result: CoachResult }
  | { type: "action"; action: CoachAction }
  | { type: "error"; message: string };

export const SENTINEL = "<<<ATLAS>>>";

export const EMPTY_RESULT: CoachResult = {
  misconception: null,
  confidenceDelta: 0,
  nextQuestion: null,
  actions: [],
};


function normaliseActions(raw: unknown): CoachAction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> => a && typeof a === "object")
    .map((a) => {
      const type = a.type;
      if (type === "mark_task_complete" && typeof a.topicId === "string") {
        return { type: "mark_task_complete", topicId: a.topicId };
      }
      if (type === "navigate" && typeof a.to === "string") {
        return { type: "navigate", to: a.to } as unknown as CoachAction;
      }
      if (type === "highlight_topic" && typeof a.topicId === "string") {
        return { type: "highlight_topic", topicId: a.topicId };
      }
      return null;
    })
    .filter((a): a is CoachAction => a !== null);
}

/** Clamp anything the model returns into the range the UI can trust. */
export function normaliseResult(raw: unknown): CoachResult {
  if (!raw || typeof raw !== "object") return EMPTY_RESULT;
  const value = raw as Record<string, unknown>;

  const misconception =
    typeof value.misconception === "string" && value.misconception.trim().length > 0
      ? value.misconception.trim().slice(0, 120)
      : null;

  const deltaRaw = Number(value.confidenceDelta);
  const confidenceDelta = Number.isFinite(deltaRaw)
    ? Math.max(-15, Math.min(15, Math.round(deltaRaw)))
    : 0;

  let nextQuestion: CoachQuestion | null = null;
  const q = value.nextQuestion as Record<string, unknown> | null | undefined;
  if (q && typeof q.stem === "string" && Array.isArray(q.options)) {
    const options = q.options.filter((o): o is string => typeof o === "string").slice(0, 4);
    if (options.length >= 2) nextQuestion = { stem: q.stem, options };
  }

  const actions = normaliseActions(value.actions);

  return { misconception, confidenceDelta, nextQuestion, actions };
}
