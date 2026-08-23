import { Stack } from "expo-router";

import { StreakProvider } from "@/features/streak/streak-context";

export default function AppLayout() {
  return (
    <StreakProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="(modal)/exercise"
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="(modal)/workout"
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
      <Stack.Screen name="(modal)/session/[id]" />
      <Stack.Screen name="(modal)/import/[slug]" />
      <Stack.Screen name="(modal)/battle/[id]" />
      <Stack.Screen
        name="(modal)/plan/generate"
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
    </Stack>
    </StreakProvider>
  );
}
