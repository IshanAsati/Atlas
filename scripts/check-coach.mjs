/**
 * Verifies the whole coach path end to end against a running dev server.
 *
 *   npm run dev          (in one terminal)
 *   npm run check:coach  (in another)
 *
 * Prints whether the reply came from DeepSeek or the offline coach, how long
 * the first token took, and the structured evaluation. Run this before the
 * demo — it is the fastest way to know your key is live.
 */

const URL = process.env.ATLAS_URL ?? "http://localhost:3000/api/coach";

const payload = {
  context: {
    topic: "Magnetic Effects",
    subject: "Physics",
    confidence: 30,
    lastSeenDays: 11,
    examInDays: 18,
  },
  turns: [
    {
      role: "coach",
      body: "A current-carrying wire is bent into a loop. What happens to the magnetic field at the centre compared with the straight wire?",
    },
    { role: "student", body: "It gets weaker because the wire is longer now." },
  ],
};

const started = Date.now();
let firstToken = null;
let source = null;
let reply = "";
let result = null;

try {
  const response = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    console.error(`✗ ${URL} returned ${response.status}`);
    console.error("  Is the dev server running?");
    process.exit(1);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const frame = JSON.parse(line);
      if (frame.type === "source") source = frame.value;
      if (frame.type === "token") {
        firstToken ??= Date.now() - started;
        reply += frame.text;
      }
      if (frame.type === "result") result = frame.result;
    }
  }
} catch (error) {
  console.error(`✗ Could not reach ${URL}`);
  console.error(`  ${error.message}`);
  process.exit(1);
}

const total = Date.now() - started;

console.log("");
if (source === "live") {
  console.log("✓ LIVE — answering with DeepSeek");
} else {
  console.log("✗ OFFLINE — the rule-based coach answered");
  console.log("  Either DEEPSEEK_API_KEY is missing from .env.local, or the call failed.");
  console.log("  Check the dev server terminal for the [coach] line explaining why.");
}

console.log("");
console.log(`  first token   ${firstToken ?? "—"} ms`);
console.log(`  total         ${total} ms`);
console.log("");
console.log(`  reply         ${reply.trim() || "(empty)"}`);
console.log("");
console.log(`  misconception ${result?.misconception ?? "none detected"}`);
console.log(`  confidence    ${result?.confidenceDelta >= 0 ? "+" : ""}${result?.confidenceDelta ?? 0}`);
console.log(`  next question ${result?.nextQuestion ? result.nextQuestion.stem : "none"}`);
console.log("");

process.exit(source === "live" ? 0 : 1);
