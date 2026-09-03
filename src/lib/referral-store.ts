/**
 * Holds an invite code tapped before the user was signed in, so it can be
 * redeemed the moment they land in the app with a profile. Best-effort and
 * self-clearing - a failed read/write just means no deferred attribution.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "repcard.pendingReferral";

export function stashPendingReferral(code: string): void {
  AsyncStorage.setItem(KEY, code).catch(() => {});
}

/** Reads and clears the pending code (one-shot). */
export async function takePendingReferral(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(KEY);
    if (code) await AsyncStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}
