# Atlas — UI + Backend

Front end **and back end** for Atlas, the study operating system described in `docs/Atlas_PRD_v1.7_Fig3_Fixed.pdf`.

- **Coach (Pipeline 3)**: real streaming DeepSeek `deepseek-v4-flash` call with rule-based offline fallback. Verified LIVE.
- **Extraction (Pipeline 1)**: real PDF upload → DeepSeek → structured subjects + topics. Streaming stage updates.
- **Persistence**: Appwrite DB (6 collections) + Storage. Hybrid data layer with mock fallback — app runs with or without a backend.
- **Screens**: all six built. All dead controls wired. Dashboard, Calendar, Focus Mode, Graph, Progress, Onboarding.

Still mocked: Pipeline 2 (mission planning). Still missing: auth, spaced repetition, mobile apps.

```bash
npm install
npm run dev              # http://localhost:3000
cp .env.example .env.local   # paste DeepSeek + Appwrite keys
npm run check:coach      # must print LIVE before any demo

# Appwrite setup (one-time)
node scripts/setup-appwrite.mjs
node scripts/seed-appwrite.mjs
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
  api/
    coach/            Pipeline 3: streaming coaching endpoint (NDJSON)
    extract/          Pipeline 1: PDF syllabus extraction (NDJSON)
    mission/          Pipeline 2: mission CRUD (planned)
    topics/           topic confidence PATCH (planned)
src/components/
  ui/                 Panel, Key, Icons, Meters, MomentumDial — the kit
  shell/              Rail, PageHeader, ThemeToggle
  dashboard/ focus/ calendar/ graph/ progress/ onboarding/
src/lib/
  mock.ts             placeholder data, shaped like the PRD schema
  data.ts             hybrid data layer — Appwrite with mock fallback
  status.ts           topic status → colour/label (shared by server + client)
  liveConfidence.ts   coach's confidence changes, shared across screens
  cn.ts               className join helper
  coach/              types, system prompt, offline responder, useCoach hook
  extract/            extraction prompt for Pipeline 1
  appwrite/           server SDK client
scripts/
  setup-appwrite.mjs  one-shot DB + storage setup
  seed-appwrite.mjs   populate DB from mock data
  check-coach.mjs     verify the live coach end-to-end
```

`Panel` and `Key` are the only two surface primitives. A `Panel` has a `depth`
(`raised`, `raised-lg`, `inset`, `inset-deep`, `flush`) and a `radius`. A `Key`
is anything you can physically push — its pressed state is genuinely inset, not
tinted.

## The AI Coach (Pipeline 3)

Bound to the topic you're revising, not a general chat box.

**Setup**

```bash
cp .env.example .env.local     # then paste your DeepSeek key
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

If `DEEPSEEK_API_KEY` is missing or the call fails, the route falls back to
`src/lib/coach/offline.ts` — a rule-based Socratic responder over the Class 10
topics Atlas ships with. The panel badges it "Offline."

**Prompt design**

`src/lib/coach/prompt.ts` is where "Coach, Not Chatbot" is enforced: never state
the answer to a question it just asked, at most 60 words, stay on topic, say so
rather than invent. The student's confidence and exam distance go into the system
prompt, which is what lets it decide between hinting and drilling.

## Syllabus Extraction (Pipeline 1)

The onboarding beat is now real. Drop a PDF → DeepSeek extracts subjects, units,
and exam dates → results stream back as stage updates → saved to Appwrite.

```
POST /api/extract (multipart PDF)
→ {"type":"stage","text":"Reading your syllabus..."}
→ {"type":"stage","text":"Finding units and chapters"}
→ {"type":"stage","text":"Matching exam dates"}
→ {"type":"stage","text":"Building your topic graph"}
→ {"type":"result","subjects":[...],"topics":[...]}
```

If the API key is missing or extraction fails, `Onboarding.tsx` falls back to
seed data so the demo never breaks.

## Appwrite Backend

| Collection | Purpose |
|---|---|
| `students` | single-user profile (momentum, XP, study time) |
| `subjects` | board → subject → exam date |
| `topics` | per-subject topics with confidence + next review |
| `missions` | daily mission container |
| `mission_tasks` | individual tasks with status/reason/kind |
| `calendar_days` | day-level activity records |
| Bucket `syllabi` | uploaded PDF storage |

**Setup:**
```bash
node scripts/setup-appwrite.mjs   # creates DB, collections, bucket
node scripts/seed-appwrite.mjs    # populates from mock data
```

The data layer (`src/lib/data.ts`) is hybrid: reads from Appwrite, falls back to
`mock.ts`. Mutations go to the API → Appwrite; if unreachable, changes hold in
memory for the session.

## Notes for the next pass

- `src/lib/mock.ts` is a fallback, not the source. `data.ts` is where components
  should pull from going forward.
- Anything importing plain values (not components) out of a `"use client"` module
  from a server component gets a client reference, not the value — that's why
  `status.ts` sits in `lib/`.
- Framer Motion resolves percentage widths to pixels at animation start, which is
  wrong for a flex child that hasn't been laid out. `ConfidenceMeter` drives width
  with CSS instead.
- `liveConfidence.ts` is session-scoped on purpose: reload and you're back to the
  seed data, so a demo always starts from a known state. Appwrite persistence is
  available via the `/api/topics` route for long-lived sessions.
- Still mocked: Pipeline 2 (mission planning). The planner is rule-based priority
  scoring — designed but not yet wired.
- The API key is server-side only. Never in a client component, a `NEXT_PUBLIC_`
  variable, or a committed file.
