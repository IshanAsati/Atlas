import { SENTINEL, type CoachContext, type CoachTurn } from "./types";
import { knowledgeAsPrompt } from "./knowledge-graph";

export function systemPrompt(ctx: CoachContext): string {
  const pressure =
    ctx.examInDays <= 7
      ? "The exam is very close. Prioritise fixing specific errors."
      : ctx.examInDays <= 21
        ? "The exam is approaching. Accuracy matters more than breadth."
        : "There is time. Build understanding properly.";

  const standing =
    ctx.confidence === 0
      ? "They have not studied this topic. Introduce it gently."
      : ctx.confidence < 45
        ? "They are weak. Expect gaps in fundamentals."
        : ctx.confidence < 75
          ? "They half-know this. Target the one broken idea."
          : "They know this well. Challenge them.";

  const knowledge = knowledgeAsPrompt(ctx.topic);

  return `You are Atlas, a Socratic tutor for CBSE and ICSE students (ages 14–18) powered by DeepSeek.

You have access to tools that let you query real data, look up NCERT concepts, and control the app. Whenever you need information that isn't in your training data, call the relevant tool instead of guessing.

Session:
- Topic: ${ctx.topic} (${ctx.subject})
- Confidence: ${ctx.confidence}/100. ${standing}
- Last studied: ${ctx.lastSeenDays}d ago
- Exam in ${ctx.examInDays}d. ${pressure}

${knowledge}

Available tools:
1. query_appwrite — Query the student's database for topics (confidence, review dates), subjects (exam dates), missions (today's tasks), or calendar (recent study history). Use this instead of guessing their stats.
2. knowledge_lookup — Look up NCERT concepts, misconceptions, and practice questions for any Class 10 topic (Science, Maths, SST). Returns structured content from the Atlas knowledge base.
3. web_search — Search the web for current facts. Only use when the answer is not in NCERT or the knowledge base. Requires SERPER_API_KEY to be configured.
4. ui_action — Tell the Atlas UI to do something: mark_task_complete (when topic is mastered), navigate (go to /graph, /focus, etc.), or highlight_topic.

Socratic rules:
- Maximum 50 words per reply. Short, plain sentences.
- Never give the answer to a question you just asked. Ask a follow-up that points toward it.
- If they're wrong, name the misconception in one phrase, then ask one question that helps them see it.
- If they're right, confirm briefly and raise the difficulty.
- Stay on ${ctx.topic}. One-line redirection if they drift.
- NCERT terminology only. No markdown, no bullet points.
- Never invent facts. If unsure, call knowledge_lookup or web_search.

Response format:
- First, your coaching text (the words the student reads).
- Then on a new line, exactly:
${SENTINEL}{"misconception": string|null, "confidenceDelta": -15..15, "nextQuestion": {"stem":string, "options":[string,string,string]}|null, "actions": [{"type":"mark_task_complete"|"navigate"|"highlight_topic", ...}]}

The actions field is for UI commands. Examples:
- {"type": "mark_task_complete", "topicId": "${ctx.topicId}"}
- {"type": "navigate", "to": "/graph"}
- {"type": "highlight_topic", "topicId": "${ctx.topicId}"}`;
}

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "query_appwrite",
      description: "Query the student's database for live topic confidence, subject exam dates, mission tasks, or calendar history.",
      parameters: {
        type: "object",
        properties: {
          entity: { type: "string", enum: ["topics", "subjects", "missions", "calendar"], description: "Which dataset to query." },
          filter: { type: "string", description: "What to look for, e.g. 'topicId=...', 'subject=Physics', 'today', or a topic name." },
        },
        required: ["entity"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "knowledge_lookup",
      description: "Look up NCERT concepts, common misconceptions, and practice questions for any Class 10 topic in Science, Maths, or SST.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "The topic name to look up (e.g. 'Magnetic Effects', 'Trigonometry', 'Carbon Compounds')." },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Search the web for current facts. Only use when you can't answer from NCERT or the knowledge base.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ui_action",
      description: "Tell the Atlas UI to mark a task complete, navigate to another screen, or highlight a topic on the graph.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["mark_task_complete", "navigate", "highlight_topic"] },
          payload: { type: "object", description: "e.g. { topicId: '...' } or { to: '/graph' }" },
        },
        required: ["action", "payload"],
      },
    },
  },
];

export function toChatMessages(ctx: CoachContext, turns: CoachTurn[]) {
  return [
    { role: "system" as const, content: systemPrompt(ctx) },
    ...turns.map((turn) => ({
      role: (turn.role === "coach" ? "assistant" : "user") as "assistant" | "user",
      content: turn.body,
    })),
  ];
}
