/** One exchange in the coaching session. */
export interface CoachTurn {
  role: "coach" | "student";
  body: string;
  /** Set on a coach turn when the evaluator named a specific wrong idea. */
  misconception?: string | null;
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
}

export interface CoachRequest {
  context: CoachContext;
  turns: CoachTurn[];
}

/** Newline-delimited JSON frames sent from /api/coach. */
export type CoachFrame =
  | { type: "source"; value: "live" | "offline" }
  | { type: "token"; text: string }
  | { type: "result"; result: CoachResult }
  | { type: "error"; message: string };

export const SENTINEL = "<<<ATLAS>>>";

export const EMPTY_RESULT: CoachResult = {
  misconception: null,
  confidenceDelta: 0,
  nextQuestion: null,
};

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

  return { misconception, confidenceDelta, nextQuestion };
}
