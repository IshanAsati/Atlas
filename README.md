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
src/lib/
  mock.ts             placeholder data, shaped like the PRD schema
  status.ts           topic status → colour/label (shared by server + client)
```

`Panel` and `Key` are the only two surface primitives. A `Panel` has a `depth`
(`raised`, `raised-lg`, `inset`, `inset-deep`, `flush`) and a `radius`. A `Key`
is anything you can physically push — its pressed state is genuinely inset, not
tinted.

## Notes for the next pass

- `src/lib/mock.ts` is the single seam. Replacing it with API calls should not
  require touching any component.
- Anything importing plain values (not components) out of a `"use client"` module
  from a server component gets a client reference, not the value — that's why
  `status.ts` sits in `lib/`.
- Framer Motion resolves percentage widths to pixels at animation start, which is
  wrong for a flex child that hasn't been laid out. `ConfidenceMeter` drives width
  with CSS instead.
"# Atlas" 
