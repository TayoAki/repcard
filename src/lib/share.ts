import { Alert, Share } from "react-native";

import { API_URL } from "@/lib/auth-client";
import { mintShareSlug } from "@/lib/api";

/**
 * Mint (or reuse) a workout's public slug and open the native share sheet
 * with its /w/ URL. Centralizes the flow so every entry point shares
 * identically. Returns true if the sheet opened.
 */
export async function shareWorkout(workoutId: string, workoutName: string): Promise<boolean> {
  try {
    const { slug } = await mintShareSlug(workoutId);
    const url = `${API_URL}/w/${slug}`;
    await Share.share({ message: `${workoutName} — my RepCard workout: ${url}` });
    return true;
  } catch (error) {
    Alert.alert("Could not share", error instanceof Error ? error.message : "Try again");
    return false;
  }
}
