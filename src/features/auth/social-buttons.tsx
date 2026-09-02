import { FontAwesome } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Text, View } from "react-native";

import Button from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import AppleButton from "@/features/auth/apple-button";
import { useToken } from "@/theme/use-token";

/**
 * Social sign-in, gated per provider by EXPO_PUBLIC_AUTH_GOOGLE / _APPLE so
 * the buttons only render when the matching server credentials exist.
 * Renders nothing (not even the divider) when no provider is enabled.
 */
const GOOGLE_ENABLED = process.env.EXPO_PUBLIC_AUTH_GOOGLE === "1";
const APPLE_ENABLED = process.env.EXPO_PUBLIC_AUTH_APPLE === "1";

export default function SocialButtons() {
  const fg = useToken("fg");
  const [busyWith, setBusyWith] = useState<"google" | "apple" | null>(null);

  if (!GOOGLE_ENABLED && !APPLE_ENABLED) return null;

  const signIn = async (provider: "google" | "apple") => {
    setBusyWith(provider);
    try {
      const { error } = await authClient.signIn.social({ provider, callbackURL: "/" });
      if (error) Alert.alert("Could not sign in", error.message);
    } finally {
      setBusyWith(null);
    }
  };

  return (
    <View>
      <View className="my-7 flex-row items-center gap-4">
        <View className="h-px flex-1 bg-border" />
        <Text className="font-sans text-[12px] text-muted-foreground">or continue with</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      <View className="gap-3">
        {GOOGLE_ENABLED ? (
          <Button
            before={<FontAwesome color={fg} name="google" size={18} />}
            busy={busyWith === "google"}
            disabled={busyWith !== null}
            onPress={() => signIn("google")}
            variant="outline"
          >
            Continue with Google
          </Button>
        ) : null}
        <AppleButton />
      </View>
    </View>
  );
}
