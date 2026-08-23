# RepCard ⚾🏋️

**Every athlete gets a card.** RepCard is a full-stack native workout tracker where your
training history becomes a baseball-card-style **Player Card** — an Overall rating (40–99)
computed from real consistency, volume, variety, and PR momentum — shareable as an image
and as a public URL.

Built from scratch, spec-first ([APP_SPEC.md](APP_SPEC.md)), shipped as 13 reviewed PRs
([PLAN.md](PLAN.md)). One Expo project holds the native app *and* its API (Expo API routes).

## The loops

| Feature | Loop |
|---|---|
| 🂠 **Player Card** | Your card levels up as you train; sharing it is showing off. `view-shot` → share sheet, plus a public `/c/[handle]` page. |
| 🤖 **AI plans** | One tap → a 3-workout program from your goal/experience. AI-designed with a key, coach-templated without one. |
| 🔗 **Public workouts** | Any workout mints a `/w/[slug]` page; "Open in RepCard" imports it into the viewer's library. |
| ⚔️ **Streak battles** | 6-char invite code, 7-day head-to-head, push nudge the moment your rival trains. |

## Stack

Expo SDK 57 (Router, typed routes, React Compiler) · NativeWind 4 · Better Auth (SecureStore
sessions) · Drizzle + Postgres (local Docker in dev, Neon-ready in prod) · TanStack Query 5 ·
Zod · AI SDK 7 (Gemini via AI Gateway, graceful keyless fallbacks everywhere).

## Run it

```bash
npm install
npm run db:up        # local Postgres via Docker
cp .env.example .env # then: openssl rand -base64 32 -> BETTER_AUTH_SECRET
npm run db:migrate && npm run db:seed
npm run ios          # or: android
```

Zero third-party keys required — auth, workouts, sessions, streaks, cards, sharing,
battles, and template plans all work locally. Optional keys unlock more:

| Env var | Unlocks |
|---|---|
| `AI_GATEWAY_API_KEY` | AI-generated form cues + AI-designed plans |
| `IMAGEKIT_PRIVATE_KEY` | CDN-hosted cover images (else inline data URIs) |
| `RESEND_API_KEY` | Real password-reset emails (else logged to server console) |
| `GOOGLE_CLIENT_ID/SECRET` + `EXPO_PUBLIC_AUTH_GOOGLE=1` | Continue with Google |
| `APPLE_CLIENT_ID/SECRET` + `EXPO_PUBLIC_AUTH_APPLE=1` | Continue with Apple |

## Architecture notes

- **Global exercise catalog** (136 exercises, 17 muscle groups) seeded from the public
  free-exercise-db dataset, *including step-by-step instructions* — they double as the AI
  coach's no-key fallback, so the coach is never a dead feature.
- **Rating engine** (`src/lib/rating.ts`) and **streak engine** (`src/lib/streak.ts`) are
  pure, unit-tested functions; the card API assembles their inputs with SQL aggregates.
- Weights are stored **canonically in kg** and converted at render from the profile's unit.
- The API's dual driver (`pg` locally, Neon WebSocket in prod) supports real
  **transactions** on both paths; `db.batch` stays off-limits (`src/db/index.ts`).
- Abusable surfaces (auth, AI, public pages) are rate-limited; API errors log as
  structured JSON with a provider-neutral `reportError` seam.
- Every user-facing string on the public HTML pages is escaped (XSS-tested in PR 11).

## Roadmap

Card "seasons" archive · battle history & rematch · store screenshot suite · store
submission. (Icon/splash/hero artwork, social sign-in, password reset, native iOS
glass tabs, and EAS profiles shipped — see ASSET-PROMPTS.md for the art pipeline.)

## License

MIT for the code in this repository. Exercise data from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).
