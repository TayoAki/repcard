/**
 * Pushes a small card snapshot into the App Group container that the iOS
 * home-screen widget reads. Best-effort: ExtensionStorage no-ops when the
 * native module isn't linked (Android, web, or a build without the widget),
 * so this is safe to call anywhere.
 */
import { ExtensionStorage } from "@bacons/apple-targets";
import { Platform } from "react-native";

import { type CardData } from "@/lib/api";

const APP_GROUP = "group.com.tayoaki.repcard";
const storage = new ExtensionStorage(APP_GROUP);

export function updateWidget(card: CardData): void {
  if (Platform.OS !== "ios") return;
  try {
    storage.set(
      "cardSnapshot",
      JSON.stringify({
        overall: card.overall,
        streak: card.streak,
        bestStreak: card.bestStreak,
        handle: card.handle,
        position: card.position,
      }),
    );
    ExtensionStorage.reloadWidget();
  } catch {
    // no native module (non-widget build) — nothing to update
  }
}
