# RepCard — Launch Playbook

Everything between the current build and full parity + shipped, step by step, in
dependency order. Audience-building is explicitly out of scope.

**Legend:** 🤖 = Claude can run it end-to-end · 👤 = needs you (accounts, payments,
credentials) · 🤝 = you create a credential, Claude wires and verifies it.

Current state (2026-08-23): 17 merged PRs, CI green, 24/24 tests, all Greptile findings
closed. Everything below is additive — no known bugs are in this list.

---

## Phase 0 — See it run (local simulator)

The only phase with a hardware constraint. Xcode 26 is installed but has **no iOS
simulator runtime** (~10GB download), and the disk has ~18GB free.

### 0.1 · Free disk 🤖 (one decision 👤)
Pick one:

```bash
# Option A (+~20GB, recommended): prune unused Docker images.
# Safe for registry-pulled images; destroys local-only built images - confirm yours are standard pulls.
docker image prune -a
```

```bash
# Option B (+~8GB, slower/safer): caches only
xcrun simctl delete unavailable && rm -rf ~/Library/Caches/*
```

### 0.2 · Install the iOS platform 🤖 (~10GB, 10–25 min)
```bash
xcodebuild -downloadPlatform iOS
```
Guardrail: abort if free disk ever drops under 12GB.

### 0.3 · First native build + boot 🤖 (~10 min first time)
```bash
cd ~/ReactApps/Workout/repcard
npm run db:up && npx expo run:ios
```
Verify: new icon on the springboard, splash wordmark, welcome hero, native glass tabs,
full flow sign-up → workout → live session → card.

---

## Phase 1 — Credentials (the "works today" parity items)

Each item is a console visit for you, then wiring + live verification for Claude.
All keys go in `.env` locally now, and in EAS environment variables at Phase 2.

### 1.1 · Password-reset email — Resend 🤝 (~10 min, free tier)
1. 👤 resend.com → sign up → API Keys → create key.
2. 👤 (later, optional) verify your domain to send from `no-reply@yourdomain.com`;
   until then the `resend.dev` sender works for testing.
3. 🤖 Set `RESEND_API_KEY=` and `EMAIL_FROM=` in `.env`; rerun the live reset-flow test
   (request → real inbox → reset → sign-in). The keyless dev path stays as fallback.

### 1.2 · AI features — Gateway key 🤝 (~10 min, pay-per-token)
The coach and plan generator are compile-verified; one key upgrades both in place.
1. 👤 vercel.com → AI Gateway → create key (or any gateway serving `google/gemini-2.5-flash`).
2. 🤖 Set `AI_GATEWAY_API_KEY=`; verify live: coach returns `source: "ai"` with a
   "watch out" mistake; plan generator returns `source: "ai"` with slug-validated workouts.
   Rate limits (10/min coach, 5/min plans) and the response cache are already in place.

### 1.3 · Google sign-in 🤝 (~30 min, free)
1. 👤 console.cloud.google.com → new project `repcard` → **OAuth consent screen**
   (External, app name RepCard, your email) → **Credentials → Create OAuth client ID →
   Web application**.
2. 👤 Authorized redirect URI — one per environment:
   `http://localhost:8081/api/auth/callback/google` (dev) and
   `https://<your-api-domain>/api/auth/callback/google` (after Phase 2).
3. 🤖 Set `GOOGLE_CLIENT_ID=`, `GOOGLE_CLIENT_SECRET=`, `EXPO_PUBLIC_AUTH_GOOGLE=1`;
   rebuild; verify the button appears and the browser round-trip lands a session +
   auto-created profile (the signup hook path needs a live check with a real Google
   account — a code tweak may be needed for social signups that skip onboarding:
   default the profile or route new social users through onboarding. Claude handles it.)

### 1.4 · Apple sign-in 👤💰 then 🤝 (~45 min + $99/yr)
Required by App Store rule 4.8 the moment Google ships — not optional.
1. 👤 developer.apple.com → enroll ($99/yr — also needed for Phase 3 regardless).
2. 👤 Identifiers → App ID `com.tayoaki.repcard` (enable Sign in with Apple) →
   Services ID (this is `APPLE_CLIENT_ID`) → Key with Sign in with Apple enabled.
3. 🤖 Generate the client secret JWT from the key, set env + `EXPO_PUBLIC_AUTH_APPLE=1`,
   verify the round-trip.

---

## Phase 2 — Production infrastructure

### 2.1 · Production database — Neon 🤝 (~15 min, free tier)
1. 👤 neon.tech → create project `repcard` → copy the **pooled** connection string.
2. 🤖 `DATABASE_URL=<neon-url> npx drizzle-kit migrate && npm run db:seed` against prod;
   verify 136 exercises and 11 tables. (The WebSocket driver + transactions are already
   the prod code path — proven locally, exercised here for real.)

### 2.2 · Deploy the API — EAS Hosting 🤝 (~30 min)
1. 👤 expo.dev → account; `npx eas-cli login` in a terminal you control.
2. 🤖 `eas init` (writes projectId into app.json), then:
   ```bash
   npx expo export --platform web   # server output incl. API routes
   npx eas-cli deploy               # first deploy → assigns https://repcard....expo.app
   ```
3. 🤖 Set production env in EAS (dashboard or `eas env:create`): `DATABASE_URL`,
   `BETTER_AUTH_SECRET` (fresh: `openssl rand -base64 32` — never reuse the dev one),
   `BETTER_AUTH_URL=https://<deployed>`, plus the Phase 1 keys.
4. 🤖 Point the app at prod: `EXPO_PUBLIC_API_URL=https://<deployed>`; tighten
   `trustedOrigins` in src/lib/auth.ts to the real scheme + domain (drop dev wildcards);
   update Google/Apple redirect URIs (1.3/1.4) with the real domain.
5. 🤖 Verify: signup, session save, public `/w/` + `/c/` pages, share links resolve on
   the public internet.

### 2.3 · Push notifications on real hardware 🤝 (~30 min)
Simulators can't receive push; this is the one untested feature path.
1. 🤖 Add the `projectId` argument to `getExpoPushTokenAsync` (needs 2.2's projectId).
2. 👤 Plug in an iPhone, trust the computer.
3. 🤖 `npx expo run:ios --device` → sign in as two users on two devices (or device +
   simulator) → battle → train → verify the rival's 🔔 arrives.

---

## Phase 3 — Store readiness (the last Emma-parity item: the asset suite)

### 3.1 · Screenshot suite 🤖 (~1–2 hrs, needs Phase 0)
1. Boot `iPhone 16 Pro Max` sim (6.9" → 1320×2868, the required size) and seed a
   demo account with rich data (sessions, streak, an 80+ card).
2. `xcrun simctl io booted screenshot` through the money screens: card, live session,
   home, battle VS, public page.
3. Frame with generated backgrounds (prompts already in ASSET-PROMPTS.md §7 pattern);
   compose with PIL. Store copy overlay: "Every athlete gets a card." etc.

### 3.2 · Legal pages 🤖 (~30 min)
Privacy policy + terms as public server routes (`/privacy`, `/terms`) in the same
HTML style as `/w/` pages — App Store requires a working privacy URL. Claude drafts;
👤 you (or a lawyer) sanity-read before submission.

### 3.3 · Production builds 🤝 (~1 hr + store review days)
```bash
npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android
```
1. 👤 App Store Connect: create the app record, fill the privacy questionnaire
   (data collected: email, name, fitness data — linked to identity, no tracking).
2. 👤 Play Console ($25 one-time): create app, content rating, data safety.
3. 🤖 `npx eas-cli submit` for both stores; TestFlight first, then review.
   iOS review typically 1–2 days; expect one rejection round as a first-time app.

---

## Phase 4 — Operability before real users (recommended, not blocking)

| Step | What | Who |
|---|---|---|
| 4.1 | Log drain: point EAS/host logs somewhere durable; wire `reportError` to a provider once the runtime is confirmed (Sentry for Node, `@sentry/cloudflare` if edge) | 🤝 |
| 4.2 | Neon: confirm point-in-time restore is on; note the restore window | 🤖 |
| 4.3 | Rate limiter: move buckets to Upstash Redis **only if** hosting scales past one instance | 🤖 later |
| 4.4 | Uptime check on `/api/auth/get-session` + a public page (any free pinger) | 🤝 |
| 4.5 | Rotate `BETTER_AUTH_SECRET` ritual + delete the two dev test accounts from prod seed path | 🤖 |

---

## Critical path summary

Fastest line to "everything works, live, in prod":

1. **You** (~1 hr of console visits): Resend key → AI key → Google OAuth client →
   Neon project → Expo account login. Apple enrollment in parallel (it can take a day
   to activate).
2. **Claude** (~half a day): wire each key as it lands → live-verify each →
   deploy → tighten origins → prod smoke test. Each change ships through the
   existing PR → Greptile → CI → merge loop.
3. **Hardware day**: simulator runtime + first build (Phase 0), push test on your
   iPhone (2.3), screenshot suite (3.1).
4. **Store week**: legal pages, builds, submissions, review round-trips (Phase 3).

Total actual work: roughly two focused days plus store-review wall-clock time.
Nothing on this list requires new architecture — the codebase is already shaped for
every step.
