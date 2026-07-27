# MINDBOT — demo brief

**Event:** MINDBOT, TAPS Fest Day 2, 29 July · 3 min demo + 1–2 min judges' interaction
**Theme:** SYNAPTICA — Duality of Mind

---

## The one line

> Atlas is your second mind. It keeps a running model of what you know — every
> topic, a confidence score, a decay curve. Your first mind forgets. The second
> mind doesn't. The chatbot is where the two of them talk.

That is the theme, stated literally. Human intelligence and AI collaborating is
not a metaphor here — it's the data model.

---

## Before you leave the house

```bash
npm run dev
npm run check:coach     # must print "LIVE"
```

If it prints `OFFLINE`, the key isn't loading. Check `.env.local` exists and
that you restarted `npm run dev` after creating it.

Then, at the venue, **run `npm run check:coach` again on the hotspot** before
you go up. If it says OFFLINE there, don't panic — the coach still works, the
badge just reads "Offline" and you have a better story than the team before you.

Other pre-flight:

- Close every other tab. A backgrounded tab freezes animations.
- Browser zoom at 100%.
- Reload the page right before you start — confidence resets to seed data.
- Pick your theme for the room. Dark for a dim hall, light for a bright one.
- Phone hotspot already connected and tested, not "ready to connect".

---

## The 3 minutes

| Time | Screen | What you do | What you say |
|---|---|---|---|
| 0:00 | `/onboarding` | Drop the syllabus, let the four stages run | "Students don't lack information. They lack a second mind that remembers what they're forgetting. Setup is one file — Atlas reads the units and finds the exam dates. The student types nothing." |
| 0:25 | `/` | Point at the mission and the dial | "I never told it what to study. It decided — this topic, because confidence fell to 30% and the Physics paper is 18 days out. That dial is momentum: miss a day and it eases off instead of resetting to zero." |
| 0:45 | `/focus` | Start the timer. Type the **wrong** answer: *"it gets weaker because the wire is longer now"* | "Now the two minds talk. Watch what it does with a wrong answer." |
| 1:10 | — | Let the reply stream. Point at the amber flag | "It didn't correct me and move on. It named the misconception — I was treating field strength as a function of wire length — and asked me a question instead of answering. That's the difference between a coach and a chatbot." |
| 1:30 | — | Point at the confidence strip | "And my confidence in this topic just dropped. The second mind updated." |
| 1:45 | `/graph` | Navigate. The topic is now lower and amber | "Same number, everywhere. This is Atlas's model of my mind — my whole syllabus with a confidence score on every topic. Tomorrow's mission is computed from this." |
| 2:15 | — | Toggle the theme once | "Two faces of the same instrument." *(one beat, don't linger)* |
| 2:25 | — | Face the judges | "Three AI pipelines, not one prompt: one reads the syllabus, one plans the day, one evaluates the answer. And if the wifi dies mid-session, the coach degrades instead of dying." |
| 2:50 | — | Close | "Students shouldn't have to wonder what to study next. They should open Atlas, and it already knows." |

**Rehearse the wrong answer.** Type it from muscle memory — do not improvise on
stage. Have it on a sticky note.

---

## What the poster explicitly asks you to explain

**Purpose.** Eliminate the decision fatigue in studying. Students lose more time
deciding what to revise than revising. Atlas decides for them, then coaches them
through it.

**Features.** Zero-type onboarding, AI daily missions, interactive calendar,
Pomodoro focus mode, Socratic AI coach with misconception detection, a learning
graph with per-topic confidence, momentum and XP.

**AI tools used.** DeepSeek `deepseek-v4-flash` via its OpenAI-compatible API,
streaming, thinking mode off for latency. Called from a Next.js route handler so
the API key stays server-side and never reaches the browser.

**Workflow.**

```
Syllabus PDF ──▶ Pipeline 1: extract subjects, units, exam dates ──▶ database
                                                                        │
   database ──▶ Pipeline 2: plan today's mission from confidence,        │
                            exam distance and available time ◀───────────┘
                                       │
                                       ▼
   student answer ──▶ Pipeline 3: evaluate ──▶ prose reply (streamed)
                                            └▶ misconception + confidence delta
                                                          │
                                                          └─▶ back to the database
```

Be straight if asked: Pipelines 1 and 2 run on prepared data in this build.
Pipeline 3 — the coach — is a live model call. Judges respect a clear boundary
far more than a vague claim, and one of them will ask.

---

## Likely judge questions

**"How is this different from just using ChatGPT?"**
ChatGPT doesn't know I got three nomenclature questions wrong on Thursday, or
that my Physics paper is in 18 days. Atlas answers differently *because* it
knows both. And it won't give me the answer — watch. *(Ask it for the answer
live. It refuses and hands back the next step.)*

**"What if it gives a wrong answer?"**
Two guards. The prompt forbids inventing a fact — it says so and asks what the
textbook says. And it mostly asks rather than asserts, so there's less surface
to be wrong on. It's a coach, not an encyclopaedia.

**"Did you build this or generate it?"**
Show `src/lib/coach/prompt.ts` and `src/app/api/coach/route.ts`. Explain the
sentinel protocol: one call returns both streamed prose and structured JSON, and
the route splits them so the client never parses a half-written object. That's a
design decision you can defend, and it's the kind of answer that separates
entries.

**"What's next?"**
Live syllabus extraction, spaced repetition scheduling from the confidence
decay curve, and a mobile app.

---

## If something breaks

- **Coach won't answer** → the badge tells you why. If it says Offline, say so
  and keep going: "no network — it's running on-device now." Then continue. The
  offline coach handles the wrong-answer beat correctly.
- **Page looks broken** → hard reload. Confidence resets to seed, which is
  exactly where you want to restart the demo from anyway.
- **Timer already running** → it doesn't matter, don't mention it.
- **You run out of time** → the graph beat is the one to protect. Cut the theme
  toggle first, then onboarding.
