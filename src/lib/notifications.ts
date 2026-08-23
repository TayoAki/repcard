/**
 * Best-effort push-token registration. Simulators and denied permissions
 * resolve to null; battles work without pushes, just quieter.
 */
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { updateProfile } from "@/lib/api";

export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted
      ? true
      : (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await updateProfile({ pushToken: token });
    return token;
  } catch {
    return null;
  }
}
