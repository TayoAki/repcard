# E3 — Home-screen widget (iOS WidgetKit) · implementation runbook

**Status: IMPLEMENTED** (`feat/home-widget`). The widget target, App Group data bridge,
and app-side writer are built and the app **compiles and links for the iOS simulator**
(app + `widget.appex` embedded, extension point `com.apple.widgetkit-extension`). Verified
here: builds clean with `CODE_SIGNING_ALLOWED=NO`, and — good news — **App Groups build on
the simulator without an Apple Team ID**. Still pending: a live-data home-screen screenshot
(needs a full authenticated app run) and **production/device builds require `ios.appleTeamId`
+ registering the App Group `group.com.tayoaki.repcard` in the Apple portal**. The sections
below are the original plan, kept as reference for the device/App-Store path.

**Goal:** a Lock/Home-screen widget that shows the athlete's **OVR + streak** (and, on
the medium size, best streak + position), styled like the Player Card. It's a passive,
always-visible hook back into the app — the viral surface the card already earns.

---

## Why this shape

- A widget **cannot** make an authenticated API call reliably (no session cookie, tight
  time budget). So the **app writes a tiny snapshot** into shared storage, and the widget
  only *reads* it. This is the standard, robust pattern.
- Shared storage between the app and its widget extension = an **App Group** +
  `UserDefaults(suiteName:)`.
- The app already computes everything the widget needs: `fetchMyCard()` returns
  `overall`, `streak`, `bestStreak`, `handle`, `position`, `season`. We serialize a subset.

---

## 0. Prerequisites (need your accounts)

- Apple Developer account (paid) — App Groups require a registered App ID capability.
- `EXPO_APPLE_TEAM_ID` handy (config plugin needs it).
- A dev build workflow: local `expo run:ios` **or** EAS dev build. Expo Go can't host a
  widget extension.

---

## 1. Add the config plugin + App Group

```bash
npx expo install @bacons/apple-targets
```

`app.json` — add the plugin and an App Group entitlement to the **main app**:

```jsonc
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.repcard.app",
      "entitlements": {
        "com.apple.security.application-groups": ["group.com.repcard.app"]
      }
    },
    "plugins": [
      // ...existing plugins...
      ["@bacons/apple-targets", { "appleTeamId": "YOUR_TEAM_ID" }]
    ]
  }
}
```

> The App Group id `group.com.repcard.app` must be created under the App ID's
> capabilities in the Apple Developer portal, and enabled for **both** the app
> (`com.repcard.app`) and the widget target (`com.repcard.app.widget`).

---

## 2. Create the widget target

Create `targets/widget/expo-target.config.js`:

```js
/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "RepCard",
  icon: "../../assets/images/icon.png",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.repcard.app"],
  },
  colors: { $accent: "#10B981" },
};
```

Add the Swift sources under `targets/widget/` (`RepCardWidget.swift`, below). On the next
`expo prebuild` the plugin generates the Xcode extension target and links these files.

---

## 3. Widget Swift (WidgetKit + SwiftUI)

`targets/widget/RepCardWidget.swift`:

```swift
import WidgetKit
import SwiftUI

private let appGroup = "group.com.repcard.app"

struct Snapshot: Codable {
  var overall: Int
  var streak: Int
  var bestStreak: Int
  var handle: String
  var position: String
}

private func loadSnapshot() -> Snapshot {
  let fallback = Snapshot(overall: 0, streak: 0, bestStreak: 0, handle: "athlete", position: "ATH")
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: "cardSnapshot")?.data(using: .utf8),
    let snap = try? JSONDecoder().decode(Snapshot.self, from: raw)
  else { return fallback }
  return snap
}

struct Entry: TimelineEntry { let date: Date; let snap: Snapshot }

struct Provider: TimelineProvider {
  func placeholder(in _: Context) -> Entry { Entry(date: .now, snap: loadSnapshot()) }
  func getSnapshot(in _: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: .now, snap: loadSnapshot()))
  }
  func getTimeline(in _: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    // Streak is day-based; refresh just after the next local midnight.
    let midnight = Calendar.current.nextDate(
      after: .now, matching: DateComponents(hour: 0, minute: 1), matchingPolicy: .nextTime
    ) ?? Date(timeIntervalSinceNow: 3600)
    completion(Timeline(entries: [Entry(date: .now, snap: loadSnapshot())], policy: .after(midnight)))
  }
}

struct RepCardWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry

  var body: some View {
    ZStack {
      LinearGradient(colors: [Color(hex: 0x04120C), Color(hex: 0x065F46)],
                     startPoint: .topLeading, endPoint: .bottomTrailing)
      VStack(alignment: .leading, spacing: 4) {
        Text("OVR").font(.system(size: 10, weight: .bold)).foregroundColor(.white.opacity(0.5))
        Text("\(entry.snap.overall)")
          .font(.system(size: family == .systemSmall ? 44 : 54, weight: .heavy))
          .foregroundColor(Color(hex: 0x6EE7B7))
        Spacer(minLength: 0)
        HStack(spacing: 4) {
          Text("🔥 \(entry.snap.streak)d").font(.system(size: 13, weight: .semibold)).foregroundColor(.white)
          if family != .systemSmall {
            Text("· best \(entry.snap.bestStreak)").font(.system(size: 12)).foregroundColor(.white.opacity(0.6))
          }
        }
        Text("@\(entry.snap.handle)").font(.system(size: 10)).foregroundColor(.white.opacity(0.55))
      }
      .padding(14)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }
}

extension Color { init(hex: UInt) {
  self.init(.sRGB, red: Double((hex >> 16) & 0xff)/255, green: Double((hex >> 8) & 0xff)/255,
            blue: Double(hex & 0xff)/255, opacity: 1)
} }

@main
struct RepCardWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "RepCardWidget", provider: Provider()) { entry in
      if #available(iOS 17.0, *) { RepCardWidgetView(entry: entry).containerBackground(.clear, for: .widget) }
      else { RepCardWidgetView(entry: entry) }
    }
    .configurationDisplayName("RepCard")
    .description("Your OVR and streak, always in view.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
```

---

## 4. Data bridge (app → shared storage)

A tiny local Expo native module writes the snapshot and pokes WidgetKit to reload.

`modules/widget-bridge/expo-module.config.json`:
```json
{ "platforms": ["ios"], "ios": { "modules": ["WidgetBridgeModule"] } }
```

`modules/widget-bridge/ios/WidgetBridgeModule.swift`:
```swift
import ExpoModulesCore
import WidgetKit

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")
    Function("setSnapshot") { (json: String) in
      UserDefaults(suiteName: "group.com.repcard.app")?.set(json, forKey: "cardSnapshot")
      if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
    }
  }
}
```

`src/lib/widget.ts` (JS side, guarded so it's a no-op on Android / when the module is
absent — keeps `expo export` and Android green):
```ts
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import type { CardData } from "@/lib/api";

const mod = requireOptionalNativeModule<{ setSnapshot(json: string): void }>("WidgetBridge");

export function updateWidget(card: CardData): void {
  if (Platform.OS !== "ios" || !mod) return;
  try {
    mod.setSnapshot(JSON.stringify({
      overall: card.overall, streak: card.streak, bestStreak: card.bestStreak,
      handle: card.handle, position: card.position,
    }));
  } catch {}
}
```

Call it wherever the card is fetched, e.g. in `card.tsx`:
```ts
const { data: card } = useQuery({ queryKey: ["card"], queryFn: fetchMyCard });
useEffect(() => { if (card) updateWidget(card); }, [card]);
```
(Optionally also after `saveSession`/`saveRun` so the streak bumps without opening the card tab.)

---

## 5. Build & verify (your machine)

```bash
npx expo prebuild -p ios --clean
npx expo run:ios         # or an EAS dev build for a physical device
```

1. Open the app once so `updateWidget` writes the snapshot.
2. Long-press the home screen → **+** → search "RepCard" → add small + medium.
3. Confirm OVR + streak render; log a session and confirm the streak updates within a day
   (or immediately if you call `updateWidget` after `saveSession`).
4. Screenshot both sizes for the store listing.

---

## 6. Gotchas (learned here)

- **Swift 6.2 / Xcode 26 build breakage** — the existing `patch-package` patch
  (`weak let`→`weak var`, `@unchecked Sendable`) applies to `expo-modules` and must stay;
  the new module's Swift follows the same rules.
- **App Group must match exactly** in: app entitlements, widget target entitlements, the
  Swift `suiteName`, and the Apple Developer portal. A mismatch = the widget silently
  reads the fallback.
- **CI won't catch widget breakage** — `expo export` bundles JS only. Keep `src/lib/widget.ts`
  guarded (optional native module) so the managed export and Android stay green; the widget
  itself is verified only by a native run.
- **Don't over-refresh** the timeline — WidgetKit budgets refreshes; once-a-day (`.after`
  midnight) plus the explicit `reloadAllTimelines()` on data change is plenty.
- **Empty state** — a brand-new user has OVR 0 / streak 0; the fallback snapshot renders
  cleanly, so the widget is never blank.

---

## PR shape

One PR, `feat/home-widget`, base `main`. Because it can't be CI-verified natively, the PR
body should carry **screenshots of both widget sizes** as the verification (the workflow's
"runtime verification" tier), plus a note that `expo export` + Android remain green thanks
to the guarded bridge.
