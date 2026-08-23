# RepCard — App Spec

Written before implementation; the build follows this document, not memory of any other
codebase. Derived from a feature audit of a reference workout tracker plus our own additions.

## 1. Product shape

Native iOS/Android workout tracker. Users onboard with gender / goal / experience, create
workouts from a global exercise catalog, run live tracked sessions, and build a streak.
Identity centerpiece: the **Player Card** — a baseball-card-style asset with an Overall
rating (40–99) computed from training data, shareable as an image and as a public URL.

## 2. Routes (Expo Router)

```
src/app/
  (public)/            # no session
    welcome
    onboarding/[step]  # gender → goal → experience
    sign-in, sign-up
  (app)/               # session required (Stack.Protected)
    (tabs)/            # Home · Workouts · [+] · History · Card
      index            # dashboard: week calendar, day stats, my workouts, recent, battles strip
      workouts         # list + client-side search
      create           # null screen; tab intercepts → /workout/create modal
      history          # calendar-filtered sessions
      card             # YOUR player card + share + battles entry
    (modal)/
      workout/create   # draft-context form; edit mode via ?id=
      workout/exercises            # picker w/ debounced server search
      workout/exercises/[id]       # detail + AI coach sheet
      workout/[id]                 # detail; start
      workout/[id]/active          # live session
      history/[id]                 # box score + share workout card
      battle/[id]                  # head-to-head
      plan/generate                # AI plan wizard
  api/                 # Expo API routes (server)
```

Profile settings live under the Card tab (gear icon) — weight unit, dark mode, sign out,
delete account (real endpoint, not a stub).

## 3. Data model (Drizzle / Postgres)

Better Auth tables (`user`, `session`, `account`, `verification`) as generated, plus:

- **profiles** — userId FK·cascade, gender enum, goal enum, experience enum,
  weightUnit enum (kg|lb, default kg), handle (unique, for public card URL),
  cardSerial (int, sequential), pushToken (nullable)
- **exercises** — GLOBAL catalog, no user FK. slug unique, name, image, description,
  instructions jsonb (from dataset), muscles, equipment, difficulty, force, mechanics,
  category
- **workouts** — userId FK·cascade, name, description, image nullable, shareSlug unique
  nullable (set when shared), source enum (manual|ai_plan|imported), timestamps
- **workout_exercises** — workoutId FK, exerciseId FK, sets, reps, targetWeight nullable,
  restSeconds, position
- **workout_sessions** — userId, workoutId FK, startedAt, completedAt, durationSeconds
- **workout_session_sets** — sessionId FK·cascade, exerciseId, setNumber, reps,
  weight nullable (stored in kg canonically; converted at the edge by weightUnit)
- **battles** — code unique (6 chars), creatorId, opponentId nullable until joined,
  status enum (pending|active|finished), startedAt, endsAt

## 4. API surface

All routes: session check → Zod-validate params → scope by userId. Multi-statement writes use db.transaction. Errors are per-operation messages.

| Route | Methods | Notes |
|---|---|---|
| /api/auth/[...auth] | GET POST | Better Auth handler; signup hooks validate onboarding payload and insert profile + handle + serial |
| /api/exercises | GET | list, `?search=` ilike name/muscles |
| /api/exercises/[id] | GET | detail incl. instructions |
| /api/exercises/[id]/coach | GET | AI form cues; fallback = dataset instructions |
| /api/workouts | GET POST | list w/ SQL aggregates; create |
| /api/workouts/[id] | GET **PATCH DELETE** | edit + delete — new vs reference |
| /api/workouts/[id]/share | POST | mint shareSlug |
| /api/sessions | GET POST | history list; save session (ownership + exercise cross-check) |
| /api/sessions/[id] | GET | box score w/ volume |
| /api/sessions/calendar · /streak | GET | date arrays |
| /api/stats/day | GET | single-day dashboard stats |
| /api/card/[handle] | GET | public card JSON (rating, streak, aggregates) |
| /api/card/me | GET | own card |
| /api/plans/generate | POST | AI structured output OR rule-based template fallback |
| /api/battles | GET POST | mine; create w/ code |
| /api/battles/join | POST | join by code |
| /api/battles/[id] | GET | head-to-head payload |
| /w/[slug] · /card/[handle] | web | public HTML pages w/ open-in-app deep link |

## 5. The rating engine (server, pure function)

Input: last 28 days of sessions (+streak, PRs). Output 40–99:
`overall = 40 + round(59 × (0.40·consistency + 0.25·volume + 0.20·variety + 0.15·prMomentum))`
each component normalized 0–1 with explicit caps documented in code. Position from goal:
Builder / Shredder / Keeper. Recomputed on read (cheap aggregates), never stored stale.

## 6. Card design

Portrait 3:4, emerald-to-slate gradient frame, big Overall top-left (sports-game style),
name + handle, position badge, season (year), serial `#0042`, streak flames, stat grid
(workouts 28d, volume 28d, best streak, PRs). Workout box-score variant swaps the grid for
that session's numbers. Rendered as a normal RN view → `react-native-view-shot` →
`expo-sharing`.

## 7. Non-goals (v1)

Apple Sign-In, password reset email flow, template marketplace, comments/likes,
Android widget. Tracked in README as roadmap.

## 8. Theme

CSS-variable tokens → Tailwind (`rgb(var(--x) / <alpha>)`), light+dark. Primary emerald
#10B981, hover #059669. Fonts: Inter 400/500/600/700. Same token names as a shadcn-style
system: background/card/foreground/muted/border/input/accent/overlay/primary/secondary/destructive.
