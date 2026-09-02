# RepCard — Expansion Plan (the working document)

This is the build-from-here spec. Everything RepCard does next lives in this file,
in dependency order, with acceptance criteria. It folds together three inputs:
[VIRAL-GAP-ANALYSIS.md](VIRAL-GAP-ANALYSIS.md) (what the viral class has that we
don't), the user-requested upgrade batch (runs, leaderboards, sharing prominence),
and [LAUNCH-PLAYBOOK.md](LAUNCH-PLAYBOOK.md) (credentials → production → store).

**How we work from this file:** each item ships as its own PR through the
Greptile + CI gate. An item is DONE when its acceptance criteria are live-verified
(API by curl, UI in the simulator). Check items off here in the same PR that
completes them. Estimates are focused build-days, not calendar days.

**Legend:** 🤖 Claude builds end-to-end · 🤝 needs a key/credential from you first ·
👤 your call or your account.

---

## Phase A — Finish the upgrade batch (in flight)

| ✔ | Item | Est | Acceptance criteria |
|---|---|---|---|
| ✅ | A1 · Composer quick-start presets + picker filters (PR #36) | done | One tap fills a dosed split; muscle/equipment/difficulty chips filter server-side |
| ☐ | A2 · Runs: log distance/duration, count toward streaks + day stats + history | 1d | `runs` table + POST/GET; run rows typed in history; streak engine counts run days; card gains 28d distance stat |
| ☐ | A3 · Leaderboards: weekly + all-time (sessions, volume, distance, OVR) | 1d | Global boards over handles, `leaderboardOptOut` respected, own row pinned; entry from Home + Card tab |
| ☐ | A4 · Sharing prominence | 0.5d | Share buttons on workout cards + session box score; battle invites as `repcard://battle/join/CODE` deep links with web fallback page |
| ⏸ | A5 · Anonymous accounts → claim on share (pending product decision) | 1.5d | Better Auth anonymous plugin: instant use with a device-backed account, no signup wall; "claim" attaches an email at first share/battle; unblocks clean install→signup attribution for D1. Cloud-first is preserved (data never local); this replaces "on-device free tier" as the low-friction path. **Not started — awaiting go-ahead** |

## Phase B — Monetization (the #1 viral gap; everything measurable depends on it)

| ✔ | Item | Est | Acceptance criteria |
|---|---|---|---|
| ☐ | B1 · Pro tier definition + subscription infra (RevenueCat or Superwall SDK) 🤝 | 1d | Products configured; entitlement check server-side; free tier untouched |
| ☐ | B2 · 3-page onboarding paywall (value → **trial reminder** → decision) | 1d | Multi-page flow after onboarding; "design your trial" variant flagged for later A/B; skippable — free tier remains full tracker |
| ☐ | B3 · Pro features: AI plans as Pro, card seasons archive, custom card styles, advanced stat windows | 1.5d | Entitlement-gated server-side; graceful free-tier messaging |
| ☐ | B4 · Pre-cancel retention hook + packaging polish | 0.5d | Clean plan names, single clear offer; Apple retention messaging configured at store time |

Pro anchor rationale: the Player Card is the status asset — Pro makes the card
*more yours* (styles, seasons, deeper stats) without ever paywalling the tracking.

## Phase C — Onboarding as revenue engine (the 37% lever)

| ✔ | Item | Est | Acceptance criteria |
|---|---|---|---|
| ☐ | C1 · Extend onboarding: training days/week, muscle focus, unit — each step visibly personalizes | 0.5d | Answers persist to profile; feeds plan generator dosing |
| ☐ | C2 · "Building your card…" investment moment → paywall landing | 0.5d | Lands on B2 flow at peak investment; measurable step-through funnel events |

## Phase D — Distribution infrastructure (mechanics, not audience)

| ✔ | Item | Est | Acceptance criteria |
|---|---|---|---|
| ☐ | D1 · Referral codes + attribution (two-tier) | 2d | **Web tier (v1, 1d):** `?ref=` on share slugs attributes *import* and *signup-from-web* events; codes mintable per user; idempotent event writes keyed on (code, event, subject). **App-install tier (heavy, deferred):** attributing a *store install* to a code needs deferred deep linking (Branch/Adjust-class) + first-launch capture + an attribution window + anonymous→account linking (see A5). Spec'd here, built only after A5 lands — v1 does NOT promise install attribution |
| ☐ | D2 · Creator dashboard page (public `/creator/[code]`: imports, signups, installs-when-available) | 0.5d | Live counts, no auth for the creator's own code page; installs column shows only once D1's app-install tier ships |
| ☐ | D3 · Share-asset polish for creator content (watermarked card exports) | 0.5d | Card share PNG carries subtle @handle + repcard watermark |

## Phase E — Retention mechanics

| ✔ | Item | Est | Acceptance criteria |
|---|---|---|---|
| ☐ | E1 · Streak insurance: rest-day credits (1 per 6 trained days) + repair window | 1d | Engine unit tests extended; credits visible in streak sheet |
| ☐ | E2 · Pre-break streak warning push ("12-day streak ends in 3h") | 0.5d | Scheduled locally; respects quiet hours |
| ☐ | E3 · Home-screen widget: streak + OVR | 1d | iOS WidgetKit target; updates on app background |

## Phase F — Ship it (from LAUNCH-PLAYBOOK.md, unchanged)

| ✔ | Item | Owner |
|---|---|---|
| ☐ | F1 · Credentials hour: Resend, AI Gateway, Google OAuth (+Apple enrollment starts) | 👤 then 🤖 |
| ☐ | F2 · Neon prod DB + EAS Hosting deploy + origin tightening | 🤝 |
| ☐ | F3 · Push delivery test on physical iPhone | 🤝 |
| ☐ | F4 · Store screenshot suite (frames exist; needs simulator captures) | 🤖 |
| ☐ | F5 · Legal pages, production builds, TestFlight, submission | 🤝 |
| ☐ | F6 · Xcode update → delete `patches/` toolchain compat | 👤 then 🤖 |

## Standing constraints

- Every schema decision follows APP_SPEC.md conventions (canonical kg, global
  catalog, SET NULL history, transactions for multi-writes).
- AI features always keep a keyless fallback. Paywall never gates core tracking.
- New pure logic (streak credits, attribution, entitlements) gets unit tests in CI.
- PR-per-item through the review gate; findings triaged, never ignored.

## Sequencing logic

A finishes what's promised. B before C (the paywall must exist before onboarding
can land on it). D is independent and can interleave. E is independent. F gates on
your credentials hour and can start anytime — F1/F2 unlock live testing of B
(purchases need real builds eventually, but RevenueCat sandbox works in dev).

**Total focused build effort: ~12 days across A–E, plus the launch-playbook
wall-clock.**
