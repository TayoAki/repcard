import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { palette, themeVars } from "@/theme/tokens";
import "../global.css";

SplashScreen.preventAutoHideAsync();

const navTheme = {
  light: { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: palette.light.bg } },
  dark: { ...DarkTheme, colors: { ...DarkTheme.colors, background: palette.dark.bg } },
};

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const ready = (fontsLoaded || Boolean(fontError)) && !sessionPending;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme[scheme]}>
        <View className="flex-1" style={[themeVars[scheme], { backgroundColor: palette[scheme].bg }]}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(public)" />
            </Stack.Protected>
            <Stack.Protected guard={Boolean(session)}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
        </View>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
