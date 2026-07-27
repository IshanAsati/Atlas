<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Atlas — status and backlog

Atlas is the "study operating system" specified in `docs/Atlas_PRD_v1.7_Fig3_Fixed.pdf`,
built as an entry for the **MINDBOT** competition (TAPS Fest Day 2, **29 July**,
theme "SYNAPTICA — Duality of Mind"). Demo brief and script: `docs/DEMO.md`.
Design system and architecture: `README.md`.

**Hard deadline is 29 July.** Anything that risks the live demo is worth less
than nothing. Prefer finishing a rough edge over starting a new system.

---

## Shipped — do not rebuild

All six screens, on placeholder data:

| Screen | Route | State |
|---|---|---|
| Dashboard | `/` | Done — mission, momentum dial, revision queue, exam horizon |
| Calendar | `/calendar` | Done — month grid, exam markers, month switcher |
| Focus Mode | `/focus` | Done — working Pomodoro, transport, live AI coach |
| Learning graph | `/graph` | Done — 3-level tree, topic inspector |
| Progress | `/progress` | Done — level ring, momentum trend, weekly bars |
| Onboarding | `/onboarding` | Done as UI — extraction itself is faked |

Also done: full light/dark token system with a no-flash theme script, the
neumorphic component kit (`Panel`, `Key`, `Meters`, `MomentumDial`), and
**Pipeline 3 — the AI Coach**, which is a real streaming DeepSeek call with a
rule-based offline fallback.

---

## Not built

### Backend and data

| PRD calls for | Reality |
|---|---|
| FastAPI service | **Not built.** `src/app/api/coach/route.ts` (a Next.js route handler) does the job instead. Deliberate — one process, not two. |
| Supabase / PostgreSQL | **Not built.** No persistence anywhere. |
| Clerk auth | **Not built.** No accounts, no login, no user record. |
| Pipeline 1 — syllabus extraction | **Faked.** The upload in `Onboarding.tsx` is a timed animation over `READING_STAGES`; no file is read and no model is called. |
| Pipeline 2 — mission planner | **Faked.** `mission` in `src/lib/mock.ts` is hand-written, including the `reason` strings the dashboard presents as AI output. |
| Pipeline 3 — AI coach | **Real.** Live `deepseek-v4-flash` call, streaming, with structured evaluation. |

All app data comes from `src/lib/mock.ts`. Confidence changes made by the coach
live in `src/lib/liveConfidence.ts` — client-side `sessionStorage`, gone on
reload by design so a demo always restarts from a known state.

### Controls that render but do nothing

Verified by inspection; each is a real gap, not a design choice:

| Where | Control | Note |
|---|---|---|
| `TodayMission.tsx:61` | "Swap this task" | No handler. Either wire it to reorder the queue or remove it. |
| `FocusConsole.tsx:132` | Skip-to-break key | No handler. |
| `FocusConsole.tsx:156` | Mark-task-complete key | No handler. Should mark the task done and bump confidence. |
| `CalendarBoard.tsx:189` | Every day cell | Focusable and hoverable, but clicking does nothing. |
| `Onboarding.tsx:200` | Exam date buttons | Copy says "tap any of them to correct it" — they aren't editable. Either add a date picker or change the copy. |

Also: selecting a different task on the dashboard changes the hero, but
`/focus` always loads the task with `status: "active"` — it ignores the
selection. And `/graph`'s "Revise for 8 min" links to `/focus` without passing
the topic, so it always opens Magnetic Effects.

### Not verified

- **The live DeepSeek path has never run.** Everything was tested against the
  offline fallback because no API key was available in the build environment.
  `npm run check:coach` must print `LIVE` before the demo. This is the single
  biggest open risk.
- Focus Mode and onboarding have not been checked at mobile widths.
- No test suite of any kind.

---

## Work to do, in priority order

### 1. Verify the live coach — blocking

```bash
cp .env.example .env.local     # paste the DeepSeek key in
npm run dev                    # restart after creating .env.local
npm run check:coach            # must print LIVE
```

If it prints `OFFLINE`, read the `[coach]` line in the dev server output. Then
send four or five real turns through the UI and check that replies stay inside
60 words, that a wrong answer produces a `misconception`, and that
`confidenceDelta` moves the meter. Tune `src/lib/coach/prompt.ts` if not.

### 2. Rehearse against `docs/DEMO.md`

The wrong-answer beat must be muscle memory. Watch for anything that only works
when the tab has been open a while.

### 3. Wire the dead controls above

Small, self-contained, and each one removes a thing a judge could click and see
fail during the Q&A. Highest value first: mark-task-complete, then the
dashboard selection reaching `/focus`, then the graph topic reaching `/focus`.

### 4. Pipeline 1 — real syllabus extraction

The best remaining feature. It's the demo's opening beat and it's currently pure
theatre. Roughly half a day: accept the file in `Onboarding.tsx`, POST to a new
`/api/extract` route, call DeepSeek with the PDF text, return subjects and exam
dates, feed them into step 2 instead of `subjects` from `mock.ts`. Reuse the
streaming and fallback shape from `src/app/api/coach/route.ts`.

### 5. After the fest, not before

Supabase persistence, Clerk auth, real Pipeline 2 planning, spaced repetition
from the decay curve, mobile apps. None of these earn a mark on 29 July and all
of them can break something that currently works.

---

## Conventions

- **Read `README.md` before touching styling.** Elevation and colour are a fixed
  token scale; new `box-shadow` or hex values break the light direction and the
  dark theme at once.
- Never hardcode a colour. Use the theme vars — every one has a dark counterpart.
- Server components cannot import plain values from a `"use client"` module;
  they get a client reference instead. Shared constants go in `src/lib/`
  (see `status.ts`, which exists for exactly this reason).
- Don't animate percentage `width` with Framer Motion — it resolves percentages
  to pixels before layout. `ConfidenceMeter` uses a CSS transition instead.
- The API key is server-side only. It must never appear in a client component,
  a `NEXT_PUBLIC_` variable, or a committed file.
- `npm run lint` and `npx tsc --noEmit` must both be clean before any commit.
  The lint config rejects `setState` called directly inside an effect.
