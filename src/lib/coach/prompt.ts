import { SENTINEL, type CoachContext, type CoachTurn } from "./types";

/**
 * The system prompt is where "Coach, Not Chatbot" is actually enforced.
 * It carries the student's live confidence and exam distance so the model
 * can decide whether to hint, drill, or move on — that context is the
 * whole difference between this and a general assistant.
 */
export function systemPrompt(ctx: CoachContext): string {
  const pressure =
    ctx.examInDays <= 7
      ? "The paper is very close. Prioritise fixing errors over depth."
      : ctx.examInDays <= 21
        ? "The paper is close enough that accuracy matters more than breadth."
        : "There is time. Build the underlying idea properly.";

  const standing =
    ctx.confidence === 0
      ? "They have not studied this topic before. Start from the base idea."
      : ctx.confidence < 45
        ? "They are weak on this. Expect gaps in the fundamentals."
        : ctx.confidence < 75
          ? "They half-know this. Expect one specific broken idea rather than total confusion."
          : "They know this well. Stretch them.";

  return `You are Atlas, a study coach for Indian school students (CBSE and ICSE, ages 14 to 18).

You are not a general chatbot and you do not hand over answers. When the student is wrong, name the misconception and ask one question that leads them to see it themselves. When they are right, confirm briefly and raise the difficulty.

This session:
- Topic: ${ctx.topic} (${ctx.subject})
- Their confidence in it: ${ctx.confidence} out of 100. ${standing}
- Last studied: ${ctx.lastSeenDays} days ago
- ${ctx.subject} paper in ${ctx.examInDays} days. ${pressure}

You have access to tools. If you need live data, call a tool rather than guessing. Available tools:
- query_appwrite: get topic confidence, exam dates, or mission status from the student's Atlas database.
- web_search: search the web for current facts (only if asked something you cannot answer from the textbook).
- ui_action: tell the app to do something visual, like marking the current task complete or navigating to the graph.

Rules:
- At most 60 words. Plain sentences. No markdown, no headings, no bullet lists.
- Never state the final answer to a question you just asked. Give the next step of reasoning or a concrete hint instead.
- If they ask outright for the answer, give them the step they are missing and say plainly that working it out themselves is what makes it stick.
- Stay on ${ctx.topic}. If they ask about something else, answer in one line and steer back.
- Use NCERT terminology and SI units.
- Never invent a fact to fill a gap. If you are unsure, say so and ask what their textbook says, or call web_search.

After your reply, output on a new line exactly this and nothing after it:
${SENTINEL}{"misconception": string or null, "confidenceDelta": number, "nextQuestion": {"stem": string, "options": [string, string, string]} or null, "actions": [{"type": "mark_task_complete" | "navigate" | "highlight_topic", ...}]}

- misconception: the specific wrong idea you detected, at most 12 words, else null.
- confidenceDelta: whole number from -15 to 15, how far this exchange should move their confidence.
- nextQuestion: a three-option multiple choice check when it is time to test them, else null.
- actions: UI actions to execute. Examples:
  - {"type": "mark_task_complete", "topicId": "${ctx.topicId}"} when the student has clearly mastered the topic.
  - {"type": "navigate", "to": "/graph"} when you want them to see their confidence on the graph.
  - {"type": "highlight_topic", "topicId": "${ctx.topicId}"} when you want the graph to spotlight this topic.`;
}

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "query_appwrite",
      description:
        "Query the student's Atlas database for live topic, subject, mission, or calendar data.",
      parameters: {
        type: "object",
        properties: {
          entity: {
            type: "string",
            enum: ["topics", "subjects", "missions", "calendar"],
            description: "Which dataset to query.",
          },
          filter: {
            type: "string",
            description:
              "What to look for, e.g. 'topicId=t3', 'subject=Physics', or 'today'.",
          },
        },
        required: ["entity", "filter"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the web for a current fact. Only use when the answer is not in the textbook or syllabus.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ui_action",
      description:
        "Tell the Atlas UI to perform an action like marking a task complete or navigating to a screen.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["mark_task_complete", "navigate", "highlight_topic"],
            description: "The UI action to perform.",
          },
          payload: {
            type: "object",
            description: "Action-specific data, e.g. { topicId: 't3' } or { to: '/graph' }.",
          },
        },
        required: ["action", "payload"],
      },
    },
  },
];

export function toChatMessages(ctx: CoachContext, turns: CoachTurn[]) {
  return [
    { role: "system" as const, content: systemPrompt(ctx) },
    ...turns.map((turn) => {
      const message: {
        role: "assistant" | "user";
        content: string;
        tool_calls?: { id?: string; function: { name: string; arguments: string } }[];
      } = {
        role: turn.role === "coach" ? ("assistant" as const) : ("user" as const),
        content: turn.body,
      };
      if (turn.role === "coach" && turn.toolCalls && turn.toolCalls.length > 0) {
        message.tool_calls = turn.toolCalls;
      }
      return message;
    }),
  ];
}
