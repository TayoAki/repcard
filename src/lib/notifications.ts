/**
 * Best-effort push-token registration. Simulators and denied permissions
 * resolve to null; battles work without pushes, just quieter.
 */
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { updateProfile } from "@/lib/api";

// Show reminders even when the app is foregrounded (local streak nudge, etc.).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Returns whether notification permission is granted, requesting it once if the
 * user hasn't decided yet. Safe to call from a user gesture (it may prompt).
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false; // don't nag once denied
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    if (!(await ensureNotificationPermission())) return null;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await updateProfile({ pushToken: token });
    return token;
  } catch {
    return null;
  }
}
