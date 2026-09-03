# RepCard — production deployment runbook

Turnkey steps to ship RepCard to production. The **code is v1-complete and
integration-verified** (tsc + tests + iOS `expo export` all green on `main`); what
remains is execution that needs **your** accounts. This is the checklist.

RepCard is a full-stack Expo app: the API lives in-project as Expo Router API
routes (`src/app/api/**+api.ts`), so "the backend" and "the app" deploy from the
same repo. Prod pieces: a **Postgres DB** (Neon), the **server** (EAS Hosting),
and the **native iOS app** (EAS Build → App Store).

---

## 0. Accounts you'll need

| Service | Why | Cost |
|---|---|---|
| [Neon](https://neon.tech) (or any Postgres) | Production database | free tier ok |
| [Expo/EAS](https://expo.dev) | Server hosting + native builds/submit | free tier ok; EAS build minutes |
| [Apple Developer](https://developer.apple.com) | App Store + Sign in with Apple | **$99/yr** |
| _(optional)_ [Resend](https://resend.com) | Password-reset emails | free tier |
| _(optional)_ Vercel AI Gateway | AI coach + plan generation | usage |
| _(optional)_ [ImageKit](https://imagekit.io) | Workout cover-image CDN | free tier |

Optional services degrade gracefully when unset (AI falls back to the dataset,
email logs to the server console, images fall back to inline storage).

---

## 1. Database (Neon)

1. Create a Neon project → copy the **pooled** connection string.
2. Point migrations at it and apply the full chain (`0000` → `0006`):

   ```bash
   DATABASE_URL="postgres://…neon…/repcard?sslmode=require" npm run db:migrate
   ```

   `src/db/index.ts` auto-selects the driver: a `localhost`/`127.0.0.1` URL uses
   node-`pg`; anything else (Neon) uses the Neon **WebSocket Pool** — no code
   change needed. (Reminder: `db.batch` stays forbidden; it's Neon-HTTP-only.)
3. Seed the exercise catalog (136 exercises) into prod:

   ```bash
   DATABASE_URL="…neon…" npm run db:seed
   ```

---

## 2. Server env vars

Set these where the server runs (EAS Hosting env, step 3). See `.env.example`
for the full annotated list.

**Required**

- `DATABASE_URL` — the Neon string from step 1
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `BETTER_AUTH_URL` — the deployed server origin (fill in after step 3, then redeploy)
- `EXPO_PUBLIC_API_URL` — same deployed origin (baked into the client build; also drives share links `/(w|c|i|b)/…`)

**Optional (each degrades gracefully)**

- `AI_GATEWAY_API_KEY` — AI coach + plan generation
- `RESEND_API_KEY` + `EMAIL_FROM` — real password-reset emails
- `IMAGEKIT_PRIVATE_KEY` — cover-image CDN uploads
- `APPLE_ENABLED=1` (+ client `EXPO_PUBLIC_AUTH_APPLE=1`) — native Sign in with Apple (also enable the capability on the App ID, step 4)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (+ `EXPO_PUBLIC_AUTH_GOOGLE=1`) — Google sign-in (deferred; Apple ships first)

> `EXPO_PUBLIC_*` vars are compiled into the client bundle, so the API URL must
> be known **at build time** — build the native app (step 4) only after the
> server URL is final.

---

## 3. Deploy the server (EAS Hosting)

```bash
npx eas login
npx eas deploy            # deploys the Expo Router API routes + web target
```

Take the resulting production URL, set `BETTER_AUTH_URL` and `EXPO_PUBLIC_API_URL`
to it, and `eas deploy` once more so auth callbacks and share links use the real
origin. Smoke-test:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<your-server>/api/exercises   # expect 200
```

---

## 4. Native iOS app (EAS Build → App Store)

1. **Apple prep** (App Store Connect + Developer portal):
   - Register App ID `com.tayoaki.repcard`.
   - Enable the **Sign in with Apple** capability on it (matches `APPLE_ENABLED=1`).
   - Create the app record in App Store Connect.
2. **Build** (production profile is already in `eas.json`):

   ```bash
   npx eas build --platform ios --profile production
   ```

   If a Swift-toolchain build error resurfaces, the repo already carries the
   `patch-package` patch for the Xcode 26 / Swift 6.2 `weak let` issue — ensure
   `postinstall` ran (it applies on `npm ci`).
3. **Submit**:

   ```bash
   npx eas submit --platform ios --latest
   ```
4. App Store listing: use the assets in `assets/gen/` and `ASSET-PROMPTS.md`; the
   store-screenshot suite still needs to be captured on a booted simulator/device.

---

## 5. Post-deploy smoke test

- Sign up (email) → complete profile → confirm a Player Card renders.
- Log a session → streak increments; card OVR updates.
- Open Leaderboard, Invite friends (redeem a code), Battles, Share card.
- Confirm a public share link opens: `https://<server>/c/<handle>`.

---

## What this runbook does NOT cover (still your calls)

- **Monetization** — no paywall is wired yet. Adding RevenueCat/Superwall needs
  your account + API keys and a pricing/offering decision (see the app-side
  scaffolding note in the project plan).
- **E3 home-screen widget** — native WidgetKit target; see `E3-WIDGET-PLAN.md`.
  Needs your Apple Team ID for the App Group.
- **Push notifications in prod** — battle/streak pushes need APNs configured for
  the App ID; local reminders (E2) already work without server push.
