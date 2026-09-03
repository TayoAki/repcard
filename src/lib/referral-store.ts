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

/** Reads the pending code WITHOUT clearing it - a caller must clear it only
 *  after a terminal result (redeemed, or a confirmed-invalid response), so a
 *  transient network error keeps the code for the next launch. */
export async function getPendingReferral(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferral(): void {
  AsyncStorage.removeItem(KEY).catch(() => {});
}
