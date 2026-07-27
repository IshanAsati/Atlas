import { EMPTY_RESULT, type CoachContext, type CoachResult, type CoachTurn } from "./types";

/**
 * The coach with the network unplugged.
 *
 * This is not a language model and does not pretend to be one — it is a
 * rule-based Socratic responder over the Class 10 topics Atlas ships with.
 * It exists because a demo that dies when the venue wifi drops scores zero,
 * and because a study tool that only works online is not much use on a train.
 * The UI badges it honestly as "offline" whenever it answers.
 */

interface Rule {
  when: RegExp;
  reply: string;
  result?: Partial<CoachResult>;
}

/* Topic-specific rules, keyed by a fragment of the topic name. */
const TOPIC_RULES: Record<string, Rule[]> = {
  magnetic: [
    {
      when: /longer|length|long wire|more wire/i,
      reply:
        "Length isn't what sets the field here. Picture the field lines from each small segment of the loop — at the centre, are they pointing the same way or fighting each other?",
      result: {
        misconception: "Treating field strength as a function of wire length",
        confidenceDelta: -4,
        nextQuestion: {
          stem: "At the centre of a circular loop, the contributions from each segment:",
          options: [
            "Cancel out completely",
            "Add up, all pointing the same way",
            "Depend only on the wire's thickness",
          ],
        },
      },
    },
    {
      when: /add|same (way|direction)|reinforc|stronger/i,
      reply:
        "That's it. Every segment pushes the field the same way through the centre, so a loop concentrates it. Now — what happens if you stack a hundred such loops into a solenoid?",
      result: { confidenceDelta: 8 },
    },
    {
      when: /left hand|right hand|fleming/i,
      reply:
        "Both rules exist because two different things are happening. One tells you the force on a wire that already carries current; the other tells you the current induced when you move a wire. Which of those two is your question about?",
      result: {
        misconception: "Confusing Fleming's left-hand and right-hand rules",
        confidenceDelta: -3,
      },
    },
    {
      when: /solenoid|coil/i,
      reply:
        "Good place to go. Inside a long solenoid the field is almost uniform — like a bar magnet's. What does that tell you about where its north pole ends up?",
      result: { confidenceDelta: 4 },
    },
    {
      when: /field line|closed|start|end/i,
      reply:
        "Careful — magnetic field lines never start or stop anywhere. They're closed loops. If that's true, what does it say about whether a single magnetic pole can exist on its own?",
      result: {
        misconception: "Thinking field lines begin and end like electric ones",
        confidenceDelta: -5,
      },
    },
    {
      when: /induc|generator|emf/i,
      reply:
        "Induction needs change. A magnet sitting still next to a coil induces nothing at all. So what exactly has to be changing for a current to appear?",
      result: { confidenceDelta: 3 },
    },
  ],
  trigonometry: [
    {
      when: /sin|cos|tan|ratio/i,
      reply:
        "Before the identity, get the triangle right. In a right triangle, which side is opposite your angle and which is adjacent? Name them for me and the ratio follows on its own.",
      result: { confidenceDelta: 3 },
    },
    {
      when: /identit|formula|remember|forget/i,
      reply:
        "Don't memorise it — derive it. sin²θ + cos²θ = 1 is just Pythagoras with the hypotenuse set to 1. Draw that triangle and tell me what you see.",
      result: {
        misconception: "Memorising identities instead of deriving them",
        confidenceDelta: -2,
      },
    },
  ],
  carbon: [
    {
      when: /nomenclature|name|suffix|prefix/i,
      reply:
        "Naming follows the functional group, not the chain length. Which group is present in your compound — and what suffix does that group demand?",
      result: {
        misconception: "Naming from chain length before identifying the group",
        confidenceDelta: -4,
      },
    },
    {
      when: /bond|covalent|share/i,
      reply:
        "Right idea. Carbon shares rather than transfers. Given it has four outer electrons, how many bonds does it need to form, and why does that make such long chains possible?",
      result: { confidenceDelta: 6 },
    },
  ],
};

/* Rules that apply whatever the topic. Checked before the topic rules. */
const GENERAL_RULES: Rule[] = [
  {
    when: /^\s*(just )?(tell|give) me the answer|what('?s| is) the answer|answer it for me/i,
    reply:
      "I'll give you the step you're missing instead of the answer — that's the part that sticks when you're in the exam hall. Tell me what you've got so far and I'll take you from there.",
    result: { confidenceDelta: 0 },
  },
  {
    when: /^\s*(i )?(don'?t know|no idea|dunno|not sure|idk)\s*[.!]?\s*$/i,
    reply:
      "That's fine — it's a starting point, not a verdict. Give me the one thing you do remember about this, even if it's only a word from the chapter title.",
    result: { confidenceDelta: -2 },
  },
  {
    when: /thank|thanks|got it|makes sense|understood/i,
    reply:
      "Good. I'll fold that into your next mission and bring this topic back in a few days to check it held.",
    result: { confidenceDelta: 5 },
  },
];

function pickRules(topic: string): Rule[] {
  const key = Object.keys(TOPIC_RULES).find((k) => topic.toLowerCase().includes(k));
  return key ? TOPIC_RULES[key] : [];
}

/** The opening question when a session starts with no history. */
export function offlineOpener(ctx: CoachContext): { text: string; result: CoachResult } {
  if (ctx.topic.toLowerCase().includes("magnetic")) {
    return {
      text: "A current-carrying wire is bent into a loop. What happens to the magnetic field at the centre compared with the straight wire?",
      result: EMPTY_RESULT,
    };
  }
  return {
    text: `Let's start where it's weakest. In one sentence and your own words — what does ${ctx.topic} actually describe?`,
    result: EMPTY_RESULT,
  };
}

export function offlineReply(
  ctx: CoachContext,
  turns: CoachTurn[],
): { text: string; result: CoachResult } {
  const last = [...turns].reverse().find((t) => t.role === "student");
  if (!last) return offlineOpener(ctx);

  const rules = [...GENERAL_RULES, ...pickRules(ctx.topic)];
  const hit = rules.find((rule) => rule.when.test(last.body));

  if (hit) {
    return {
      text: hit.reply,
      result: { ...EMPTY_RESULT, ...hit.result },
    };
  }

  /* No rule matched. Reflect the answer back rather than bluffing — an
     honest "show me your reasoning" is never the wrong coaching move. */
  return {
    text: `Walk me through how you got there. Which part of ${ctx.topic} are you leaning on for that step — and are you sure it applies here?`,
    result: { ...EMPTY_RESULT, confidenceDelta: -1 },
  };
}
