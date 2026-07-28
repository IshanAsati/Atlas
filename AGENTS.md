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
| Focus Mode (Pomodoro) | `/focus` | Done — working Pomodoro with presets, break timer, session tracking |
| AI Coach | `/coach` | Done — dedicated chat screen, Socratic tutor with DeepSeek |
| Learning graph | `/graph` | Done — 3-level tree, topic inspector |
| Progress | `/progress` | Done — level ring, momentum trend, weekly bars |
| Onboarding | `/onboarding` | Done — login/signup + PDF upload + topic extraction |

Also done:

| Feature | Details |
|---|---|
| **Auth system** | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Appwrite email/password. Session cookie (`atlas-session`). AuthProvider wraps root layout. LoginForm gates onboarding. |
| **Session proxy** | `src/proxy.ts` — Edge-runtime middleware that checks session cookie expiry on every page navigation. Redirects expired sessions to `/onboarding`. |
| **Data per-user scoping** | Every Appwrite query scoped by `studentId` from the session cookie. No hardcoded `student-1` anymore. |
| **DataProvider** | Client-side context that fetches student, subjects, topics, mission from API. Starts null — no mock defaults. Shows loading state everywhere while data loads. |
| **NCERT knowledge base** | `src/lib/coach/knowledge-graph.ts` — 40+ topics covering Science (Phy/Chem/Bio), Maths, SST (History/Geo/Polity/Eco). Each: core concepts, misconceptions, scaffolded questions. Injected into coach system prompt. |
| **Coach tool system** | 4 tools: `query_appwrite` (live student data), `knowledge_lookup` (NCERT concepts), `web_search` (needs API key), `ui_action` (mark complete/navigate/highlight). Non-streaming tool loop (up to 3 rounds), final answer streamed token-by-token. |
| **Coach memory** | Threads persisted to Appwrite per-user per-topic. `loadThread()` / `saveThread()`. |
| **Pomodoro customization** | 4 duration presets (15/25/45/60 min). Break timer auto-engages. 1–4 repetitions. Play/pause/skip-to-break. Session + "All done" states. Web Audio chime on transitions. |
| **Coach in sidebar** | Coach icon in the rail between Pomodoro and Graph. Accessible from any screen. |
| **Student profile API** | `GET /api/student` — serves name, grade, momentum, XP, level. DataProvider fetches this. |
| **Progress API** | `GET /api/progress` — computes momentum history, weekly minutes, subject confidence, streak, best streak, level progress from real Appwrite data. |
| **Graph topic inspector** | Click a topic node → shows NCERT concepts, misconceptions, and revise link in side panel. |
| **Calendar interactivity** | Day cells are `<button>` elements with keyboard support. Planned topic rows link to `/focus`. Selected day shows detail panel with study record. |
| **ALL dashboard elements interactive** | Revision queue rows link to `/focus`, exam horizon rows link to `/calendar`, progress subject cards link to `/graph`. |
| **Dark mode polish** | Deeper surface, wider shadow contrast, brighter ink, luminous accent colors, grain texture, smooth 300ms CSS theme transitions. |
| **Demo seed script** | `node scripts/seed-demo.mjs` — creates `aarush@gmail.com / password` with 4 subjects, 12 topics, 4-task mission, 21 calendar days. |
| **Confidence system** | Coach sends `confidenceDelta` per exchange. `liveConfidence.ts` applies it client-side (sessionStorage). |

---

## Design/UX pass — 28 July

Closed in this pass. Don't redo these.

| Was | Now |
|---|---|
| Momentum dial disappeared whenever there was no mission — the empty branch replaced the whole two-column section | Page keeps its shape with or without data; a resting-needle dial holds the momentum bay |
| `/graph` sat on "Loading graph…" forever, plus 5 `rules-of-hooks` errors (hooks after an early return) | Selection derived instead of synced through an effect; loading and empty states; canvas scrolls instead of collapsing under ~880px |
| Coach thread was an empty ~250px void | `initialTurns` was set in an effect but `useCoach` reads it once via `useState`, so the opening turn never arrived. Now derived, with `key={task.id}` to reset per topic |
| Chrome autofill painted the login inputs blue, over the top of the panel | `-webkit-autofill` repaints the well and keeps our own relief |
| Bare "Loading…" / "NO MISSION YET. COMPLETE ONBOARDING FIRST." | `EmptyBay` + skeletons in `src/components/ui/States.tsx` — an instrument at rest, one sentence, one action |
| Dashboard mixed real empty states with seed data in neighbouring panels | `RevisionQueue` and `ExamTimeline` read the context, not `mock.ts` |
| Day streak hardcoded `"0"` (#7) | `calcStreak` / `calcBestStreak` in `src/lib/stats.ts`, wired to `calendarDays` |
| Exam date edits discarded (#6) | `PATCH /api/subjects` + `updateSubjectExamDate`; onboarding saves before planning |
| Pomodoro silent, break hid the big readout | Web Audio chimes (`src/lib/useChime.ts`, no audio files), one readout across both phases, phase-change pulse, mark-complete confirms on screen |
| `micro` labels at 9px | 10px with tighter tracking — these are read off a projector |
| Martian Mono shipped 5 weights | 4; only 400–700 are used |
| Calendar days were `<div>` — not keyboard accessible | Day cells are now `<button>` with aria-pressed, aria-label, hover/active states |
| Revision queue / exam horizon / progress cards were static lists | Every row links to relevant screen (focus, calendar, graph) with hover effects |
| Dark mode flat and low-contrast | Deeper surface (#1e2320), wider shadow gap, brighter ink (#eef2ee), luminous accents, CSS transitions |

**Not verified:** mobile. The browser tooling here refused to resize, so the
375px fixes (dock labels truncating, calendar gap) were made by inspection
only. Check in DevTools device mode before the demo.

---

## HANDOVER — 29 July

Build, `npx tsc --noEmit` and `npm run lint` are all clean: **0 errors, 0
warnings**. Everything is committed and pushed.

### Closed in this pass

| Was | Now |
|---|---|
| Nothing a student did reached the calendar | `logStudyMinutes()` + `PATCH /api/calendar`. FocusConsole logs every finished session, so the day streak and momentum move. |
| The calendar was never even fetched | `DataProvider` fetches `GET /api/calendar?days=1`. `calendarDays` was permanently `{}`, which is why the streak read 0 and the grid was blank. |
| Momentum was a seed value nothing updated | `calcMomentum()` scores a rolling 14 days against the student's own target; `GET /api/student` applies it on every fetch. |
| "At 120 minutes a day … four papers … 14 Aug" | Computed from the extracted subjects, their real dates and today. Says something different when a paper is close, or when the day's budget can't cover the syllabus. |
| No chat on the first screen — in a chatbot competition | `CoachDock` sits in the dashboard grid, opening on today's topic. Not a floating bubble. |
| API routes returned empty data when signed out | `denyIfSignedOut()` on every data route, and the proxy now returns 401 for `/api/*` instead of redirecting an API call to an HTML page. |
| OCR progress invisible | The scan drives the first stage's share of the progress bar. It used to sit frozen at 0% for the whole scan. |

Earlier the same day: the Appwrite query-syntax bug (every read returned
nothing), the dangling `subjectId` on saved topics, the zero-dependency PDF
reader with subset-font decoding, both exam-date faults, and the provider
being mounted inside `(shell)` so Focus and Coach hung on a skeleton.

### Not done — deliberately

- **Coach UI redesign** (a wider ChatGPT-style conversation column). The dock
  and the existing panel both work; this is polish, and it is the kind of
  change that breaks a working screen the morning of a demo.
- **Web search for the coach** (#2) — needs a third API key.
- **Push notifications** (#13) — a permission prompt mid-demo is a liability.
- **WebSocket sync** (#19), **error tracking** (#21), **cross-topic coach
  memory** (#1) — real work, no demo value today.
- **SM-2 spaced repetition** (#10). `nextReview` is stored but never
  recalculated. The revision queue sorts by confidence instead, which is a
  reasonable proxy — but don't claim spaced repetition to a judge.

### Still worth knowing

- **Mobile is only partly verified.** The bottom dock and dashboard were seen
  at ~960px and hold up. Nothing has been checked at 375px.
- Accounts created before the query fix hold orphaned records. Sign up fresh.
- `scripts/seed-demo.mjs` still exists for a known-good demo account.
- The deck is `docs/Atlas-MINDBOT.pptx`; `node docs/deck.js` regenerates it.

---

## Known gaps and planned features

### 1. Coach memory persists only per-topic, not per-user across topics
`memory.ts` saves threads keyed by `(studentId, topicId)`. If a student talks about "Electricity" then "Trigonometry", the coach forgets the first thread. The coach should have a unified thread per user so it can connect concepts across subjects ("That displacement reaction is like how we solved the pair of linear equations — both are about moving terms around").

**What it needs:** The coach thread storage should accept a `threadId` (a single ongoing conversation ID) instead of `topicId`. When the student switches topics, new turns append to the same thread. The system prompt should include relevant context from recent turns, not just the current topic. Alternatively: a separate "session" ID that spans multiple topic chats within a single sitting, flushed when the user explicitly closes the coach.

### 2. Web search for coach is not wired
`TOOLS` in `prompt.ts` and the `tools.ts` module were built but then removed when the coach route was simplified. The coach currently has no way to search the web for current facts. DeepSeek returns anything it doesn't know as "I'm not sure."

**What it needs:** A web search API key (Tavily, SerpAPI, or Brave Search) added to `.env.local`. A tool definition in the system prompt so DeepSeek knows it can call `web_search`. A handler in the coach route that executes search, injects results as context, and lets the model answer from them. The tool loop from the earlier build (`runToolLoop()` in `route.ts`) can be restored — it calls DeepSeek non-streaming, checks for tool calls, executes them, appends results, and calls DeepSeek again with the enriched context.

### 3. Coach can query Appwrite — ✅ done
The `query_appwrite` tool is wired with `knowledge_lookup`, `web_search`, and `ui_action`. Tool loop runs non-streaming up to 3 rounds.

### 4. Pipeline 1 (PDF extraction) never tested with a real CBSE PDF
The extraction endpoint (`/api/extract`) is fully built — accepts a PDF, extracts text via `pdf-parse`, sends it to DeepSeek with a structured prompt that asks for subjects, exam dates, and topics. But it has never been run against an actual CBSE Class 10 syllabus PDF. The parsing logic (`parseResponse` in `route.ts`) may not match DeepSeek's output format.

**What it needs:** Download a CBSE Class 10 syllabus PDF for any subject. Upload it through the onboarding screen. Watch the streamed stages in the dev tools. If the result looks wrong (wrong subjects, missing topics, wrong dates), tune the `extractionPrompt` in `src/lib/extract/prompt.ts` and the parsing logic. The prompt currently asks for JSON with `{subjects: [{name, discipline, examDate, topics: [{name}]}]}`. DeepSeek may wrap this in markdown code blocks or add commentary — the parser needs to handle that.

### 5. Auth on API routes — ✅ done
The proxy middleware checks the session cookie for page navigations, but API routes (`GET /api/mission`, `POST /api/coach`, etc.) aren't individually protected. Data layer returns `null`/`[]` without a session (no mock fallback).

**What it needs:** Each API route should call `verifySession()` and return `401 { error: "Unauthorized" }` when no valid session is found.

### 6. Onboarding exam date edits and study time persist — ✅ done
`PATCH /api/subjects` and `PATCH /api/student` are called in `handleBuildMission()` before generating the mission.

### 7. Day streak — ✅ done
`calcStreak()` in `src/lib/stats.ts` counts consecutive study days from calendar data. Wired into the dashboard.

### 8. Momentum — ✅ done
`GET /api/progress` computes 14-day momentum history from calendar data. `student.momentum`/`student.momentumDelta` still seed values on the profile.

**What it needs:** Move `calcMomentum()` into the student profile endpoint so momentum updates on every fetch.

### 9. Dashboard greeting and grade — ✅ done
Greeting reads from student profile API. Settings page exists at `/settings`.

### 10. No spaced repetition algorithm on the revision queue
The dashboard's `RevisionQueue` shows topics in a fixed order. It doesn't apply a spaced repetition algorithm (SM-2 or similar). Topics that are due for review should appear at the top, sorted by `nextReview` date. The `nextReview` field on each topic is set during extraction and never recalculated.

**What it needs:** After a coach session on a topic, update that topic's `nextReview` based on the student's performance. If they got it right (high confidence, no misconception), schedule the next review further out (e.g., 3 days, then 7, then 14). If they got it wrong (low confidence delta), bring it back sooner (next day). This is the SM-2 algorithm. The `nextReview` date should be saved to the topic document.

### 11. Mission generation uses study time — ✅ done
Study time is persisted via `PATCH /api/student` during onboarding before mission generation. Planner reads the authoritative value.

### 12. Calendar saves study data from Pomodoro sessions — ✅ done
When a Pomodoro session completes (all repetitions done or the student marks time), there's no record saved. The calendar stays on seed data. The `calendar_days` collection should get a daily document created or updated with minutes studied, and the day's state (complete if target met, partial if not).

**What it needs:** After a focus session ends, send `PATCH /api/calendar` with the date and minutes studied. Create `src/app/api/calendar/route.ts`. The endpoint upserts a document in `calendar_days` for that user+date, summing minutes and setting state based on whether the total meets the student's daily study target.

### 13. No push notifications or reminders
The app doesn't prompt the student to start their mission, return from break, or review a topic that's due. There's no service worker, no push subscription, no time-based alerts.

**What it needs:** A `NotificationProvider` that checks if the browser supports notifications and asks for permission. When the daily mission is generated (after onboarding or each morning), show a notification: "Your mission is ready — 4 tasks, 118 minutes." When a Pomodoro break ends: "Break's over. Ready for the next session?" When a topic's `nextReview` is today: "Due for review: Magnetic Effects (confidence 30%)."

### 14. Coach conversation history — ✅ done
Coach threads persist to Appwrite (`memory.ts`) and load on mount via `loadThread()` in the route handler.

### 15. Progress page API — ✅ done
`GET /api/progress` computes and returns momentum history, weekly minutes, subject confidence, streak, best streak, level progress from real Appwrite data. Page fetches from this endpoint.

### 16. Graph shows NCERT knowledge — ✅ done
Topic inspector panel calls `getKnowledge()` from the NCERT knowledge base. Shows concepts, misconceptions, and "Revise this topic" link.

### 17. No onboarding for returning users
After logging in, a returning user is always sent to `/onboarding` (the proxy redirects there if no session). But once they've completed onboarding, they should go to `/` directly. There's no `isOnboarded` flag on the student profile that the proxy could check.

**What it needs:** Add an `onboarded: boolean` field to the `students` collection (default false). Set it to `true` when the user completes the Time step. The proxy should check this field (via `GET /api/auth/me` or by reading the student profile) and redirect onboarded users to `/` instead of `/onboarding`.

### 18. Daily mission auto-regeneration — ✅ done (GET /api/mission plans one if the day has none)
The mission is generated once during onboarding and never refreshed. If the student finishes all tasks, the dashboard shows "No mission yet." There should be a mechanism to regenerate tomorrow's mission each day, and to generate a fresh mission if today's is fully done.

**What it needs:** A `cron` job (or a check in the `GET /api/mission` handler) that auto-generates a mission for today if none exists and today's date is >= last generated date. The mission planner already handles this pattern — `getServerMission()` can call `generateMission()` if no mission exists for the requested date. Wire this so the data layer creates missions on-demand.

### 19. WebSocket / real-time sync
There's no real-time communication. If the user has Atlas open in two tabs, a Pomodoro completion in one tab isn't reflected in the other. The calendar days, mission state, and confidence values are stale until the page refreshes.

**What it needs:** Appwrite supports real-time subscriptions via WebSocket (`client.subscribe()`). The DataProvider could subscribe to changes on the student's documents and update state automatically when a change is detected in another tab or device.

### 20. Mobile responsive not verified
No screen has been tested at phone widths (< 640px). The sidebar rail switches from vertical to horizontal dock at `md:` breakpoints, but the main content layouts (especially the Dashboard's 2-column grid, the Calendar's month grid, the Graph's SVG, and the Progress charts) haven't been checked on small screens. They may overflow, overlap, or become unusable.

**What it needs:** Manual testing at 375px width (iPhone SE). Every grid that uses `lg:grid-cols-2` or similar needs a single-column fallback. The Pomodoro timer readout at `clamp(4rem,14vw,7.5rem)` is probably fine. The calendar's day cells at `1fr` with `aspect-square` may be too small. The graph's SVG with fixed `width={900}` will definitely overflow.

### 21. No error tracking or monitoring
If the DeepSeek API fails, Appwrite is down, or a bug causes a crash, there's no logging infrastructure beyond `console.error`. The user sees a generic "something went wrong" state with no way to diagnose.

**What it needs:** An error boundary component wrapping the shell layout. A logging service (Sentry, LogRocket, or a simple `/api/log` endpoint that writes to Appwrite). At minimum: log API errors with timestamp, route, and error message so debugging doesn't require reproducing locally.

### 23. Graph page is not working — ✅ crash and dead loading fixed; API wiring done
The LearningGraph has a crash path when `subjects` is empty (prerender error). Fixed with a useEffect guard and skeleton states. Topic inspector shows NCERT knowledge graph concepts.

### 24. DeepSeek model is Flash — confirmed working
The coach and extraction routes both default to `deepseek-v4-flash`. Flash is the right model for this use case — faster streaming for the coach, cheaper per-token, and more than capable of the Socratic tutoring + structured JSON output we need. No `.env` variable is set explicitly, but the `??` fallback handles that. All Vercel deploys get the API key from the environment variable, not from `.env.local`.

### 25. UI/UX improvements — mostly done

| Item | Status |
|------|--------|
| 25.1 Empty states | ✅ Done — every screen has CTA |
| 25.2 Loading skeletons | ✅ Done — shimmer skeleton components |
| 25.3 Progress page — real API | ✅ Done — GET /api/progress |
| 25.4 Graph — NCERT knowledge in inspector | ✅ Done |
| 25.5 Pomodoro — sound effects | ✅ Done — Web Audio chime |
| 25.6 Mobile at 375px | ⚠️ Fixed by inspection, not visually verified |
| 25.7 Chart accessibility | Still open — MomentumTrend/WeeklyBars need aria |
| 25.8 First-run tutorial | Still open — no overlay yet |

### 26. All elements interactive — ✅ done
Every clickable surface on every screen links to a relevant destination:
- Revision queue → `/focus?topic=id`, exam horizon → `/calendar`, progress subject cards → `/graph`
- Calendar day cells → detail panel, calendar planned topics → `/focus?topic=id`
- Graph nodes → topic inspector with revise link
- Dashboard tasks → swap/select/Begin focus

### 27. Deployment readiness audit
Before going live, these demo artifacts must be removed or fixed:
- **Seed data**: The `scripts/seed-demo.mjs` should not be needed for production. Users must create their own accounts.
- **Mock imports**: Progress page was the remaining mock import — fixed. `GET /api/progress` serves real data.
- **Static student profile**: Dashboard greeting reads from the student profile (now from API), but a new user has no profile yet — the greeting shows "null".
- **Session expiry handling**: If the Appwrite session expires (1 week default), the proxy redirects to `/onboarding` but the user can't log in again because the login form is behind the proxy. Need to make `/api/auth/login` the exception.
- **Onboarding with no PDF**: "Choose your board instead" is a dead link. It should offer a board selection flow.
- **No initial data**: A brand-new user has no subjects, topics, or missions. The dashboard shows empty panels with no CTA to start extraction.

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
- **DataProvider starts null for everything.** No mock defaults. All components
  must handle `null`/empty states with loading indicators.

---

## Quick reference — file map

| Concern | File |
|---|---|
| Auth (server) | `src/lib/auth/server.ts` |
| Auth (client) | `src/lib/auth/AuthContext.tsx` |
| Session cookie | `src/lib/auth/session.ts` |
| Proxy/auth gate | `src/proxy.ts` |
| Data layer | `src/lib/data.ts` |
| NCERT knowledge | `src/lib/coach/knowledge-graph.ts` |
| Coach prompt | `src/lib/coach/prompt.ts` |
| Coach memory | `src/lib/coach/memory.ts` |
| Coach route | `src/app/api/coach/route.ts` |
| Focus screen | `src/components/focus/FocusConsole.tsx` |
| Coach screen | `src/components/focus/CoachScreen.tsx` |
| Onboarding | `src/components/onboarding/Onboarding.tsx` |
| Dashboard | `src/components/dashboard/TodayMission.tsx` |
| Calendar | `src/components/calendar/CalendarBoard.tsx` |
| Graph | `src/components/graph/LearningGraph.tsx` |
| Progress | `src/app/(shell)/progress/page.tsx` |
| Seed demo | `scripts/seed-demo.mjs` |
