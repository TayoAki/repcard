import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Stack, usePathname } from "expo-router";
import { useEffect } from "react";

import { StreakProvider } from "@/features/streak/streak-context";
import { hasProfile, redeemReferral } from "@/lib/api";
import { takePendingReferral } from "@/lib/referral-store";

export default function AppLayout() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: profileExists, isPending } = useQuery({
    queryKey: ["has-profile"],
    queryFn: hasProfile,
  });

  // Redeem an invite tapped before sign-in, once the user has a profile.
  // Best-effort: an invalid/already-used code just clears silently.
  useEffect(() => {
    if (profileExists !== true) return;
    takePendingReferral().then((code) => {
      if (!code) return;
      redeemReferral(code)
        .then(() => queryClient.invalidateQueries({ queryKey: ["referral"] }))
        .catch(() => {});
    });
  }, [profileExists, queryClient]);

  // Social sign-ins (Apple) arrive without a profile; make them finish setup
  // before anything else. Email signups always have one (created by the hook).
  if (!isPending && profileExists === false && pathname !== "/complete-profile") {
    return <Redirect href="/complete-profile" />;
  }

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
        name="(modal)/invite/index"
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
      <Stack.Screen name="(modal)/invite/[code]" />
      <Stack.Screen
        name="(modal)/leaderboard"
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="(modal)/run/log"
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="(modal)/plan/generate"
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
    </Stack>
    </StreakProvider>
  );
}
