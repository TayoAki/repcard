# RepCard — Build Plan

A ground-up rebuild of a proven workout-tracker UX, written entirely from scratch against
[APP_SPEC.md](APP_SPEC.md), plus four viral features the original doesn't have. The headline:
**every athlete gets a baseball card** — a persistent, evolving player card with their stats,
streak, and an overall rating — and that card is the shareable asset.

## Why build our own instead of forking

1. **IP freedom.** The reference app's license (even the paid tier) prohibits redistributing
   its code. A from-scratch codebase is the only version we can open-source, show in a
   portfolio, or ship without constraint. No code, assets, or design files from the original
   are included here — we build from a written spec derived from studying it.
2. **We know exactly where it's weak.** A full source audit produced a catalogued gap list
   (dead search, unreachable error states, a seed script that can't run, no workout
   edit/delete, weight-unit preference ignored, `targetWeight` in schema but unsettable).
   Rebuilding lets us fix these at the architecture level instead of patching.
3. **The 3%:** same clean UX shape, minus every bug in that list, plus polish (haptics,
   working search, editable workouts, weight units respected) — and one structural fix:
   exercises become a **global catalog** with seeded instructions instead of user-owned rows,
   which is what broke the original's seed script.

## Why these four viral features

| Feature | Loop it creates |
|---|---|
| **Player Card** (baseball card) | Identity + collection. Your card levels up as you train; sharing it is showing off. Every share is an ad with your stats on it. |
| **AI plan generator** | Acquisition hook — "my AI coach built me this program" — and solves the blank-slate problem for new users. Rule-based fallback works with zero AI keys. |
| **Public workout pages** | Every workout gets a URL anyone can open in a browser and import. Gives a native app a web-shaped growth surface. |
| **Streak battles** | Retention. Head-to-head streaks with a friend by invite code; push notification when your rival trains is the strongest "get off the couch" trigger there is. |

## The card rating (Overall, 40–99)

Sports-game style, transparent formula, recomputed from real session data:

- **Consistency 40%** — current streak + workouts/week vs a goal-derived target
- **Volume 25%** — 4-week rolling volume trend
- **Variety 20%** — distinct muscle groups hit per week
- **PR momentum 15%** — rep/weight PRs in the last 30 days

Goal maps to a card "position": Build Muscle → **Builder**, Lose Fat → **Shredder**,
Maintain → **Keeper**. Cards carry a serial number (user #), season (year), and the
current streak as a flame count.

## Stack

Expo SDK 57 + Expo Router (typed routes, React Compiler) · NativeWind 4 · Better Auth ·
Drizzle + Postgres (Neon in prod; local Postgres in dev) · TanStack Query 5 · Zod + RHF ·
AI SDK (Gemini, always with non-AI fallback) · `react-native-view-shot` + `expo-sharing`
for card capture · Expo push for battles. Full-stack in one project via Expo API routes,
deployable on EAS Hosting.

Same stack as the reference — deliberately. We audited it end to end, we know it holds up,
and we know this exact dependency set builds clean on this machine.

## PR roadmap

Each PR is one reviewable feature, branched off main, verified (tsc strict + iOS bundle,
plus simulator checks where UI-relevant), then merged before the next begins.

| # | Branch | Contents |
|---|--------|----------|
| 1 | `feat/scaffold` | Expo app, router groups, theme system (CSS-vars → Tailwind), UI primitives (Button, Skeleton, EmptyState, SafeAreaScreen), floating tab bar, welcome screen |
| 2 | `feat/database` | Drizzle schema (global exercise catalog w/ instructions, battles, push tokens, share slugs), dev DB setup, migrations, seed from free-exercise-db |
| 3 | `feat/auth-onboarding` | Better Auth (email+password, SecureStore), protected routes, 3-step onboarding → profile row via auth hooks |
| 4 | `feat/exercise-library` | Exercise API (search that actually filters), list + detail screens, seeded instructions |
| 5 | `feat/workouts` | Create (sets/reps/rest **and target weight**), list with working client search, detail, **edit + delete** (original had neither) |
| 6 | `feat/live-session` | Drift-free timer, active session screen (ref-based inputs), rest timer, session save API |
| 7 | `feat/home-history` | Home dashboard (stats, week calendar), history + session detail (volume in **your** weight unit), streak engine + sheet |
| 8 | `feat/player-card` | **The baseball card**: rating engine, card component, view-shot capture → share sheet; per-workout box-score card after each session |
| 9 | `feat/ai-coach` | Exercise form-cue endpoint: AI-enhanced when a key exists, dataset instructions as fallback — never a dead feature |
| 10 | `feat/ai-plans` | Plan generator: profile → structured program (Gemini structured output; rule-based templates as no-key fallback) → saved workouts |
| 11 | `feat/public-pages` | Public web routes: `/w/[slug]` workout page + `/card/[handle]` player card page, with import-to-app deep link |
| 12 | `feat/battles` | Invite-code streak battles, head-to-head screen, Expo push notifications (best-effort) |
| 13 | `chore/polish` | Haptics, app icon + splash, README, a11y pass, store-readiness checklist |

## Working agreements

- Nothing from the reference repo is copied — not code, not assets, not design PNGs.
  Exercise data comes from the public free-exercise-db dataset directly.
- Every schema/API decision is written down in APP_SPEC.md before implementation.
- AI features must degrade gracefully to a no-key path.
- Brand: primary color is emerald (`#10B981`) — deliberately not the reference's blue.
