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
| **Coach memory** | Threads persisted to Appwrite per-user per-topic. `loadThread()` / `saveThread()`. |
| **Pomodoro customization** | 4 duration presets (15/25/45/60 min). Break timer auto-engages. 1–4 repetitions. Play/pause/skip-to-break. Session + "All done" states. |
| **Coach in sidebar** | Coach icon in the rail between Pomodoro and Graph. Accessible from any screen. |
| **Student profile API** | `GET /api/student` — serves name, grade, momentum, XP, level. DataProvider fetches this. |
| **Demo seed script** | `node scripts/seed-demo.mjs` — creates `aarush@gmail.com / password` with 4 subjects, 12 topics, 4-task mission, 21 calendar days. |
| **Confidence system** | Coach sends `confidenceDelta` per exchange. `liveConfidence.ts` applies it client-side (sessionStorage). `sessionStorage` means it resets on reload — intentional for demos. |

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
| 10 lint errors | 0 (two effects carry a justified `eslint-disable` — a clock's phase boundary really is an effect) |

**Not verified:** mobile. The browser tooling here refused to resize, so the
375px fixes (dock labels truncating, calendar gap) were made by inspection
only. Check in DevTools device mode before the demo.

---

## Known gaps and planned features

### 1. Coach memory persists only per-topic, not per-user across topics
`memory.ts` saves threads keyed by `(studentId, topicId)`. If a student talks about "Electricity" then "Trigonometry", the coach forgets the first thread. The coach should have a unified thread per user so it can connect concepts across subjects ("That displacement reaction is like how we solved the pair of linear equations — both are about moving terms around").

**What it needs:** The coach thread storage should accept a `threadId` (a single ongoing conversation ID) instead of `topicId`. When the student switches topics, new turns append to the same thread. The system prompt should include relevant context from recent turns, not just the current topic. Alternatively: a separate "session" ID that spans multiple topic chats within a single sitting, flushed when the user explicitly closes the coach.

### 2. Web search for coach is not wired
`TOOLS` in `prompt.ts` and the `tools.ts` module were built but then removed when the coach route was simplified. The coach currently has no way to search the web for current facts. DeepSeek returns anything it doesn't know as "I'm not sure."

**What it needs:** A web search API key (Tavily, SerpAPI, or Brave Search) added to `.env.local`. A tool definition in the system prompt so DeepSeek knows it can call `web_search`. A handler in the coach route that executes search, injects results as context, and lets the model answer from them. The tool loop from the earlier build (`runToolLoop()` in `route.ts`) can be restored — it calls DeepSeek non-streaming, checks for tool calls, executes them, appends results, and calls DeepSeek again with the enriched context.

### 3. Coach cannot query Appwrite
The `query_appwrite` tool was removed alongside the tool loop. The coach can't look up a student's confidence in a topic, see their mission status, check exam dates, or browse what subjects they have. It guesses everything from the `CoachContext` passed at the start of the thread.

**What it needs:** Restore the `query_appwrite` function in `tools.ts`. Available entities: `topics` (get confidence/review dates), `subjects` (list with exam dates), `missions` (today's tasks), `calendar` (recent study days). The tool loop needs to come back. The DeepSeek call must include `tools` in the request body so the model knows it can call them. When it does, the server executes the tool, appends the result as a `role: "tool"` message, and calls DeepSeek again with the enriched context.

### 4. Pipeline 1 (PDF extraction) never tested with a real CBSE PDF
The extraction endpoint (`/api/extract`) is fully built — accepts a PDF, extracts text via `pdf-parse`, sends it to DeepSeek with a structured prompt that asks for subjects, exam dates, and topics. But it has never been run against an actual CBSE Class 10 syllabus PDF. The parsing logic (`parseResponse` in `route.ts`) may not match DeepSeek's output format.

**What it needs:** Download a CBSE Class 10 syllabus PDF for any subject. Upload it through the onboarding screen. Watch the streamed stages in the dev tools. If the result looks wrong (wrong subjects, missing topics, wrong dates), tune the `extractionPrompt` in `src/lib/extract/prompt.ts` and the parsing logic. The prompt currently asks for JSON with `{subjects: [{name, discipline, examDate, topics: [{name}]}]}`. DeepSeek may wrap this in markdown code blocks or add commentary — the parser needs to handle that.

### 5. Auth is not enforced on API routes
The proxy middleware checks the session cookie for page navigations, but `GET /api/mission`, `POST /api/coach`, `PATCH /api/topics` etc. are not individually protected. If a request reaches an API route without a valid session, the data layer falls back to `student-1` (the hardcoded fallback) rather than returning a 401.

**What it needs:** Each API route should call `verifySession()` from `src/lib/auth/server.ts` at the top, using either the `atlas-session` cookie or the `Authorization: Bearer <token>` header. If the session is invalid, return `401 { error: "Unauthorized" }`. The data layer's `resolveStudentId()` should return `null` instead of `"student-1"` when no session is found, and callers should handle `null` by returning 401 or empty data.

### 6. Onboarding does not persist exam date edits or study time — ✅ dates done, study time still open
When the user taps a subject's exam date and changes it, then clicks "Dates look right", the modified dates are held in `subjectDates` state on the client but never sent to the server. Same for the study time in step 2. The "Build my first mission" button sends `{ date, studyTime }` to `POST /api/mission`, which generates a mission for that day. But the updated subject exam dates are never saved to Appwrite, so the next mission generation will use the original dates from the seed or extraction.

**What it needs:** In `handleBuildMission()`, after `setSubjectDates()`, send a `PATCH /api/subjects` request with the updated exam dates. Create a `src/app/api/subjects/route.ts` endpoint that updates each subject document in Appwrite. The study time value should also be saved to the student's profile in the `students` collection so the mission planner can read it on subsequent days.

### 7. Day streak is always "0" — ✅ done
The `TodayMission` component shows a "Day streak" readout that's hardcoded to `"0"`. It should calculate the streak from the `calendarDays` data: count consecutive days (going backward from today) where the student had a `"complete"` or `"partial"` state. If yesterday was missed, the streak is 0.

**What it needs:** A function `calcStreak(calendarDays: Record<string, {state}>)` in the data layer that walks days backward from today and counts until it finds a `"missed"` or missing day. Wire it into the DataProvider and the dashboard.

### 8. Momentum is hardcoded seed data, never calculated from real activity
`student.momentum` and `student.momentumDelta` are static values from the seed. They should be calculated from the student's actual study history — e.g., a rolling 14-day window where each day's impact on momentum depends on whether the student hit their study time target. Missed days decay momentum; good days build it.

**What it needs:** A `calcMomentum(calendarDays, studyTime)` function that takes the last 14 days of calendar data and computes a score 0–100. Momentum delta is the change from the previous 7-day window to the current one. This function should run on the server when the student profile is fetched, not hardcoded in the seed.

### 9. Dashboard greeting and grade are seeded, not editable
The greeting says "Morning, {name}" using the student profile's `name` field. The grade line shows `grade` from the same profile. These are set once during onboarding and cannot be changed. There's no settings page or profile editor.

**What it needs:** A settings/profile modal accessible from the avatar button in the sidebar rail. The student can change their name, grade, and daily study time target. These should save to the `students` collection in Appwrite.

### 10. No spaced repetition algorithm on the revision queue
The dashboard's `RevisionQueue` shows topics in a fixed order. It doesn't apply a spaced repetition algorithm (SM-2 or similar). Topics that are due for review should appear at the top, sorted by `nextReview` date. The `nextReview` field on each topic is set during extraction and never recalculated.

**What it needs:** After a coach session on a topic, update that topic's `nextReview` based on the student's performance. If they got it right (high confidence, no misconception), schedule the next review further out (e.g., 3 days, then 7, then 14). If they got it wrong (low confidence delta), bring it back sooner (next day). This is the SM-2 algorithm. The `nextReview` date should be saved to the topic document.

### 11. Mission generation uses study time but persists stale profiles
`generateMission()` reads the student's `studyTime` from the `students` collection. If the student changed their study time in onboarding or settings, that value needs to be saved to Appwrite first. Currently it's sent to `POST /api/mission` as a body param but the student profile on the server still has the old value.

**What it needs:** When study time changes in onboarding step 2, save it to the student's document before generating the mission. Same for any settings changes — the mission planner should always read the authoritative value from the database.

### 12. Calendar doesn't save study data from Pomodoro sessions
When a Pomodoro session completes (all repetitions done or the student marks time), there's no record saved. The calendar stays on seed data. The `calendar_days` collection should get a daily document created or updated with minutes studied, and the day's state (complete if target met, partial if not).

**What it needs:** After a focus session ends, send `PATCH /api/calendar` with the date and minutes studied. Create `src/app/api/calendar/route.ts`. The endpoint upserts a document in `calendar_days` for that user+date, summing minutes and setting state based on whether the total meets the student's daily study target.

### 13. No push notifications or reminders
The app doesn't prompt the student to start their mission, return from break, or review a topic that's due. There's no service worker, no push subscription, no time-based alerts.

**What it needs:** A `NotificationProvider` that checks if the browser supports notifications and asks for permission. When the daily mission is generated (after onboarding or each morning), show a notification: "Your mission is ready — 4 tasks, 118 minutes." When a Pomodoro break ends: "Break's over. Ready for the next session?" When a topic's `nextReview` is today: "Due for review: Magnetic Effects (confidence 30%)."

### 14. Coach screen doesn't show conversation history across page loads
Coach threads are persisted to Appwrite (`memory.ts`), but the CoachScreen component doesn't load them on mount. Each time the user visits `/coach?topic=t3`, they get the opening turns and a fresh conversation. The old turns are saved but never displayed.

**What it needs:** `CoachPanel` / `useCoach` should load the existing thread from Appwrite on mount (via a `GET /api/coach?topicId=X` endpoint or by having `useCoach` call the API with a `load: true` parameter). The retrieved turns should populate the thread so the conversation continues where it left off. The `CoachContext` should include a `threadId` so both load and save use the same key.

### 15. No progress page API — uses mock data entirely
The `/progress` page imports directly from `src/lib/mock.ts` — `momentumHistory`, `subjectConfidence`, `weeklyMinutes`, `student`, `subjects`. None of these come from the server. The momentum trend chart shows hardcoded data. The weekly bars show hardcoded data. The confidence-by-subject section shows hardcoded averages.

**What it needs:** A `GET /api/progress` endpoint that returns:
- `momentumHistory`: 14-day array of momentum values (computed from calendar data)
- `weeklyMinutes`: 7-day array of minutes studied (from calendar data for the current week)
- `subjectConfidence`: average confidence per subject (computed from topics)
- `student`: the student profile
The Progress page should call this endpoint through the DataProvider or directly and pass the results to the chart components.

### 16. Graph doesn't use the NCERT knowledge graph
The LearningGraph shows topics arranged in a 3-level tree (subject → topic → subtopic?) but the layout is purely visual. It doesn't pull from the `knowledge-graph.ts` data. The NCERT concepts, misconceptions, and questions per topic are only used in the coach prompt, not surfaced in the graph UI. Clicking a node doesn't show what concepts are under it.

**What it needs:** The graph should render each topic's concepts as child nodes when expanded. Clicking a concept could show its blurb in the inspector panel. The common misconceptions could appear as warning badges. The scaffolded questions could appear as "Test yourself" links that open the coach pre-seeded with that question.

### 17. No onboarding for returning users
After logging in, a returning user is always sent to `/onboarding` (the proxy redirects there if no session). But once they've completed onboarding, they should go to `/` directly. There's no `isOnboarded` flag on the student profile that the proxy could check.

**What it needs:** Add an `onboarded: boolean` field to the `students` collection (default false). Set it to `true` when the user completes the Time step. The proxy should check this field (via `GET /api/auth/me` or by reading the student profile) and redirect onboarded users to `/` instead of `/onboarding`.

### 18. No daily mission auto-regeneration
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

### 23. Graph page is not working — ✅ crash and dead loading fixed; API wiring still open
The LearningGraph has a crash path when `subjects` is empty (prerender error). Fixed temporarily with a useEffect guard, but the graph has no real API integration — it uses `useLiveTopics()` from `liveConfidence.ts` (client-side sessionStorage) and the subject list.

**What it needs:** The graph should fetch topics from `GET /api/topics` and subjects from `GET /api/topics?type=subjects` instead of relying on mock data. The SVG layout should handle dynamic subject counts. Topic inspector panel should load from the NCERT knowledge graph instead of showing hardcoded placeholder text.

### 24. DeepSeek model is Flash — confirmed working
The coach and extraction routes both default to `deepseek-v4-flash` (line 10 of `extract/route.ts`, line 19 of `coach/route.ts`). Flash is the right model for this use case — faster streaming for the coach, cheaper per-token, and more than capable of the Socratic tutoring + structured JSON output we need. No `.env` variable is set explicitly, but the `??` fallback handles that. All Vercel deploys get the API key from the environment variable, not from `.env.local`.

### 25. Critical UI/UX improvements needed

The app is functional but has major UX gaps that hurt the demo. These are ordered by impact:

#### 25.1 Empty states — every screen needs one — ✅ done
Right now when a new user signs up and goes through onboarding, the dashboard shows blank panels with "No mission yet." text. There's no CTA to start extraction, no guidance, no visual indication of what to do next.

**What to do:** Every section needs a designed empty state:
- **Dashboard** when no mission: show a prompt Card with "Upload your syllabus to get started" and a big upload button that links to `/onboarding`
- **Calendar** when no data: show a pulsing calendar grid with "Your study days appear here" overlay
- **Graph** when no topics: show the tree skeleton with "Add subjects to see your learning graph"
- **Progress** when no student profile: show "Complete onboarding to see your stats"

#### 25.2 Loading skeletons everywhere — ✅ done
Every component currently shows `<Micro>Loading…</Micro>` text. This feels dead. Users can't tell if something is genuinely loading or stuck.

**What to do:** Replace text loaders with shimmer skeleton variants of each component:
- `SkeletonPanel` — pulsing `<Panel>` with same dimensions (rounded-bay, inset shadow, animated gradient)
- `SkeletonMeter` — pulsing bar matching ConfidenceMeter dimensions
- `SkeletonGraph` — 3 pulsing circles in a column for the tree columns
- `SkeletonCalendar` — grid of pulsing day cells (same aspect-square, greyed)
Framer Motion's `animate={{ opacity: [0.3, 0.6, 0.3] }}` with `transition={{ repeat: Infinity, duration: 1.5 }}` is all it takes. The `loading` flag from DataProvider controls visibility.

#### 25.3 Progress page — real data, not mock
The `/progress` page is the most critical thing to fix. It imports `momentumHistory`, `subjectConfidence`, `weeklyMinutes`, `student`, and `subjects` directly from `src/lib/mock.ts`. Every number on the page is fake. The chart components (`MomentumTrend`, `WeeklyBars`) show hardcoded arrays.

**What to do:** Create `GET /api/progress` that computes from real Appwrite data:
- `momentumHistory` (14 days): from `calendar_days` — each day's record maps to a momentum value
- `weeklyMinutes` (7 days): study minutes per day for the current week
- `subjectConfidence`: average of topic confidences per subject
- `student`: from `getServerStudent()`
Wire the Progress page to fetch from this endpoint instead of importing mock.

#### 25.4 Graph page — fix layout and confidence visualization
The graph currently crashes on prerender when subjects is empty (guard added but the root issue — no real data — remains). The 3-level tree has fixed SVG `width={900}`, hardcoded node positions, and topic names overflow.

**What to do:** Three things:
- Fix the SVG to be responsive: `viewBox` instead of fixed width, calculate column width dynamically from `subjects.length`
- Show topic confidence visually: colour-coded node borders (red < 40, amber 40-70, green > 70)
- Topic inspector panel on click: show knowledge graph concepts for that topic (`getKnowledge()` from the NCERT knowledge base)

#### 25.5 Pomodoro — sound effects and completion animation — ✅ done
The timer ticks down in silence. "Session done" or "Break time" just appears as text. Users don't feel a transition.

**What to do:** Add two things:
- `useSound()` hook that plays a short chime on session/break/done state change (Web Audio API oscillator, no audio files needed — a simple 440Hz beep for 200ms costs nothing)
- Completion animation: when `done` or `finished` becomes true, trigger a brief scale + fade pulse on the timer readout (`motion.div` with `scale: [1, 1.05, 1]` over 300ms)

#### 25.6 Mobile — test at 375px — ⚠️ fixed by inspection, NOT visually verified
No screen has been tested below 640px. The sidebar rail switches to a bottom dock at `md:` breakpoints, but the grid layouts overflow:
- Dashboard 2-column grid: use `grid-cols-1` below `lg:`, then `lg:grid-cols-2`
- Calendar month grid: day cells at `aspect-square` with 7 columns — at 375px each cell is ~40px, the dots won't show. Add `min-w-0` and reduce `gap-2` to `gap-1`
- Graph SVG: `width={900}` is 2.4× the viewport at 375px. Use `max-w-full overflow-x-auto` or recalculate as a responsive `viewBox`

#### 25.7 Progress chart accessibility
The `MomentumTrend` and `WeeklyBars` components are SVG `<path>` elements with no labels, no aria attributes, no keyboard interaction.

**What to do:** Add `role="img"`, `aria-label` with a text summary of the chart data, and fallback text inside the SVG. This matters for the demo judges who may use screen readers.

#### 25.8 First-run tutorial overlay
A brand-new user sees empty screens everywhere. They need guidance.

**What to do:** After onboarding completes, show a one-time overlay (check localStorage flag `atlas-tutorial-done`). The overlay highlights the sidebar rail items one by one with a tooltip explaining what each screen does. Skips after 4 taps or "Got it" button. Users who know the app see it once and never again.

### 26. No AI usage in graph, mission planner, or progress page
Currently AI (DeepSeek) is only used in:
- **Coach**: Socratic tutoring via live streaming chat
- **PDF extraction**: Structuring syllabus PDFs into subjects/topics

These have NO AI and are purely rule-based:
- **Learning Graph**: Static tree layout, fixed coordinates, no intelligent layout or clustering
- **Mission Planner**: Priority scoring formula (confidence + time decay + exam distance). Not adaptive to the student's actual performance.
- **Revision Queue**: Sorted by `nextReview`, no spaced repetition algorithm (SM-2 or similar)
- **Momentum**: Hardcoded in seed data, never calculated from real study history
- **Confidence**: Coach sends a delta number (-15 to +15), client blindly applies it. No AI-driven confidence estimation.
- **Day Streak**: Hardcoded "0", never calculated from calendar data
- **Progress Page**: Imports mock data directly — no API, no real data, no AI-driven insights

**What it needs:** AI should power everything it can: the graph should use AI to cluster weak topics and surface misconceptions visually; the mission planner should learn which study patterns work for each student; the revision queue should use SM-2 with AI-decayed intervals; the progress page should compute momentum, streak, and confidence trends from real data with AI-generated insights.

### 27. Deployment readiness audit
Before going live, these demo artifacts must be removed or fixed:
- **Seed data**: The `scripts/seed-demo.mjs` should not be needed for production. Users must create their own accounts.
- **Mock imports**: Progress page still imports `momentumHistory`, `subjectConfidence`, `weeklyMinutes` directly from `src/lib/mock.ts`. These must be served through a `GET /api/progress` endpoint.
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
