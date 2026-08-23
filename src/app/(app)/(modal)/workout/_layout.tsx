import { Stack } from "expo-router";

import { WorkoutDraftProvider } from "@/contexts/workout-draft";

export default function WorkoutFlowLayout() {
  return (
    <WorkoutDraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="compose" />
        <Stack.Screen name="pick" />
        <Stack.Screen name="[id]" />
      </Stack>
    </WorkoutDraftProvider>
  );
}
