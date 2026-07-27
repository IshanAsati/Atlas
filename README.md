# Atlas — UI

Front end for Atlas, the study operating system described in `docs/Atlas_PRD_v1.7_Fig3_Fixed.pdf`.
This is the UI layer only: every screen runs on placeholder data shaped like the
Supabase schema in §8 of the PRD. No API, no auth, no AI calls yet.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Design direction

Neumorphism, played as an **instrument panel** rather than soft blobs. The whole
interface is one sheet of pale concrete lit from the top-left; every element is
either pushed out of the sheet or pressed into it. Nothing floats, nothing has a
drop shadow going the wrong way, and there are no borders — only relief.

**Colour is reserved for data.** The surface and all text are neutral. Teal means
confidence held, amber means confidence decaying, rust means a paper is close.
Nothing is coloured because it looked nice.

| Token | Value | Job |
|---|---|---|
| `--color-base` | `#e2e5e1` | the sheet |
| `--color-emboss` / `--color-relief` | `#ffffff` / `#b7bdb8` | the two light sources |
| `--color-ink` / `-2` / `-3` | `#1e2422` … | primary / secondary / muted text |
| `--color-teal` | `#0e8c7f` | mastery, progress, active state |
| `--color-amber` | `#d97a1e` | decay, "needs revision" |
| `--color-rust` | `#b4432e` | exam deadline |

Elevation is a fixed scale, not ad-hoc shadows: `shadow-raised-sm` → `raised` →
`raised-lg` for things standing proud, `shadow-inset` → `inset-deep` for things
cut into the sheet, `shadow-pressed` for the moment a key is held down. Use these
rather than writing new `box-shadow` values, or the light direction drifts.

**Type**: Bricolage Grotesque for display, Instrument Sans for body, Martian Mono
for every number and every instrument label (`.micro` utility). If it's a
reading, it's mono.

**Signature**: the momentum dial on the dashboard — a needle in a recessed well
with an amber arc showing what decayed this week. It is the one loud element;
everything around it stays quiet.

## Structure

```
src/app/
  (shell)/            rail + working surface
    page.tsx          Dashboard — today's mission, momentum, revision queue, exam horizon
    calendar/         Interactive calendar
    graph/            Learning graph
    progress/         XP, momentum trend, weekly minutes, confidence by subject
  focus/              Focus Mode — deliberately outside the shell, no rail
  onboarding/         Zero-type onboarding — also outside the shell
src/components/
  ui/                 Panel, Key, Icons, Meters, MomentumDial — the kit
  shell/              Rail, PageHeader
  dashboard/ focus/ calendar/ graph/ progress/ onboarding/
src/app/api/coach/    the coaching endpoint (streams NDJSON)
src/lib/
  mock.ts             placeholder data, shaped like the PRD schema
  status.ts           topic status → colour/label (shared by server + client)
  liveConfidence.ts   coach's confidence changes, shared across screens
  coach/              types, system prompt, offline responder, useCoach hook
```

`Panel` and `Key` are the only two surface primitives. A `Panel` has a `depth`
(`raised`, `raised-lg`, `inset`, `inset-deep`, `flush`) and a `radius`. A `Key`
is anything you can physically push — its pressed state is genuinely inset, not
tinted.

## The AI Coach

PRD Pipeline 3. Bound to the topic you're revising, not a general chat box.

**Setup**

```bash
cp .env.example .env.local     # then paste your key into .env.local
npm run dev
npm run check:coach            # verifies the whole path in one command
```

`check:coach` prints `LIVE` or `OFFLINE`, first-token latency, and the
structured evaluation. **Run it before any demo.**

**How a turn works**

1. The browser POSTs the topic, the student's live confidence, days since they
   last studied it, days to the exam, and the thread so far to `/api/coach`.
2. The route handler calls DeepSeek `deepseek-v4-flash` with `stream: true`
   and thinking mode off. The API key is read from the server environment and
   never reaches the browser.
3. The model streams prose, then one sentinel line carrying JSON:
   `misconception`, `confidenceDelta`, `nextQuestion`. The route forwards the
   prose as it arrives and emits the JSON as a single frame at the end, so the
   client never sees a half-written object.
4. `confidenceDelta` is written to `liveConfidence.ts`, which the learning
   graph also reads — so the number moves everywhere at once.

**When the network is down**

If `DEEPSEEK_API_KEY` is missing or the call fails for any reason, the route
falls back to `src/lib/coach/offline.ts` — a rule-based Socratic responder over
the Class 10 topics Atlas ships with. It is not a language model and doesn't
pretend to be one: the panel badges it "Offline" whenever it answers. This
exists so a dropped connection degrades the coach instead of killing it.

**Prompt design**

`src/lib/coach/prompt.ts` is where "Coach, Not Chatbot" is actually enforced:
never state the answer to a question it just asked, at most 60 words, stay on
topic, say so rather than invent. The student's confidence and exam distance go
into the system prompt, which is what lets it decide between hinting and
drilling.

## Notes for the next pass

- `src/lib/mock.ts` is the single seam. Replacing it with API calls should not
  require touching any component.
- Anything importing plain values (not components) out of a `"use client"` module
  from a server component gets a client reference, not the value — that's why
  `status.ts` sits in `lib/`.
- Framer Motion resolves percentage widths to pixels at animation start, which is
  wrong for a flex child that hasn't been laid out. `ConfidenceMeter` drives width
  with CSS instead.
- `liveConfidence.ts` is session-scoped on purpose: reload and you're back to the
  seed data, so a demo always starts from a known state.
- Still mocked: syllabus extraction (Pipeline 1) and mission planning
  (Pipeline 2). Only the coach (Pipeline 3) talks to a real model.
"# Atlas" 
