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

All six screens:

| Screen | Route | State |
|---|---|---|
| Dashboard | `/` | Done — mission, momentum dial, revision queue, exam horizon |
| Calendar | `/calendar` | Done — month grid, exam markers, month switcher |
| Focus Mode | `/focus` | Done — working Pomodoro, transport, live AI coach |
| Learning graph | `/graph` | Done — 3-level tree, topic inspector |
| Progress | `/progress` | Done — level ring, momentum trend, weekly bars |
| Onboarding | `/onboarding` | Done — real PDF upload + DeepSeek extraction |

Also done: full light/dark token system with a no-flash theme script, the
neumorphic component kit (`Panel`, `Key`, `Meters`, `MomentumDial`), and all
three pipelines have live paths with offline fallbacks.

---

## Backend and data

| Pipeline | Status |
|---|---|
| Pipeline 1 — syllabus extraction | **Real.** `src/app/api/extract/route.ts` — streaming DeepSeek call, PDF text extraction via `pdf-parse`, structured JSON output saved to Appwrite. Falls back to seed data on failure. |
| Pipeline 2 — mission planner | **Real.** `src/lib/data.ts` → `generateMission()` — rule-based priority scoring (confidence + decay + exam distance). API at `src/app/api/mission/route.ts` (GET/POST/PATCH). Wired for server-side calls. |
| Pipeline 3 — AI coach | **Real.** Live `deepseek-v4-flash` call, streaming NDJSON, with structured evaluation. Rule-based offline fallback. Verified LIVE via `npm run check:coach`. |

**Persistence:** Appwrite — 6 collections (`students`, `subjects`, `topics`, `missions`,
`mission_tasks`, `calendar_days`) + Storage bucket `syllabi`. Hybrid data layer in
`src/lib/data.ts` reads from Appwrite, falls back to `mock.ts`.

**Setup:**
```bash
node scripts/setup-appwrite.mjs   # creates DB + collections + bucket
node scripts/seed-appwrite.mjs    # populates from mock data
```

Confidence changes made by the coach live in `src/lib/liveConfidence.ts` —
client-side `sessionStorage`, gone on reload by design so a demo always restarts
from a known state.

---

## Controls — all wired

All previously dead controls now have handlers:

| Where | Control | What it does |
|---|---|---|
| `TodayMission.tsx` | "Swap this task" | Rotates next pending task to hero position |
| `TodayMission.tsx` | "Begin focus" | Links to `/focus?topic=<id>` — passes the selected task |
| `FocusConsole.tsx` | Skip-to-break | Ends session, shows "Break time" |
| `FocusConsole.tsx` | Mark-task-complete | Sets status to complete, bumps confidence +5, promotes next pending |
| `CalendarBoard.tsx` | Day cells | Changed to visual-only (`<div>`, not `<button>`) — no inert controls |
| `Onboarding.tsx` | Exam date buttons | Click opens inline `<input type="date">` |
| `LearningGraph.tsx` | "Revise for 8 min" | Links to `/focus?topic=<id>` |
| `FocusConsole.tsx` | Topic param | Reads `?topic=` from URL, loads the selected task |

---

## Verified

- **Live DeepSeek path.** `npm run check:coach` prints `✓ LIVE` (1427ms first token, 2146ms total). Wrong answer produces `misconception`, `confidenceDelta` moves the meter.
- `npm run lint` clean, `tsc --noEmit` clean.

### Not verified

- Focus Mode and onboarding have not been checked at mobile widths.
- No test suite of any kind.
- Pipeline 1 extraction has not been tested with a real CBSE PDF (the API route is built and wired but needs a PDF).

---

## Work to do, in priority order

### 1. Rehearse against `docs/DEMO.md`

The wrong-answer beat must be muscle memory. Watch for anything that only works
when the tab has been open a while.

### 2. Test Pipeline 1 with a real syllabus PDF

Upload a CBSE Class 10 syllabus, verify subjects/topics/dates come back correctly,
tune the extraction prompt if needed.

### 3. After the fest, not before

Appwrite auth, spaced repetition from the decay curve, mobile apps. None of these earn a mark on 29 July
and all of them can break something that currently works.

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
- Data goes through `src/lib/data.ts` (the hybrid layer), not directly from
  `mock.ts`. Components should read from the layer; API routes handle mutations.
- `npm run lint` and `npx tsc --noEmit` must both be clean before any commit.
  The lint config rejects `setState` called directly inside an effect.
