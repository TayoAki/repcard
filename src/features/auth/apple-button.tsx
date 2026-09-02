import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Alert, useColorScheme } from "react-native";

import { authClient } from "@/lib/auth-client";

/**
 * Native Sign in with Apple. Renders only on iOS where it's available and
 * only when EXPO_PUBLIC_AUTH_APPLE=1. The native flow returns an identity
 * token verified server-side against the app bundle id - no client secret.
 * First-time social users land without a profile; the app's profile gate
 * routes them through onboarding-completion after this resolves.
 */
const APPLE_ENABLED = process.env.EXPO_PUBLIC_AUTH_APPLE === "1";

export default function AppleButton() {
  const scheme = useColorScheme();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (APPLE_ENABLED) AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => {});
  }, []);

  if (!APPLE_ENABLED || !available) return null;

  const signIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert("Sign in failed", "Apple did not return an identity token.");
        return;
      }
      // Apple returns fullName ONLY on the first authorization; forward it so
      // Better Auth stores a real name instead of "" for brand-new users.
      const fullName = credential.fullName;
      const { error } = await authClient.signIn.social({
        provider: "apple",
        idToken: {
          token: credential.identityToken,
          ...(fullName?.givenName || fullName?.familyName
            ? {
                user: {
                  name: {
                    firstName: fullName.givenName ?? "",
                    lastName: fullName.familyName ?? "",
                  },
                },
              }
            : {}),
        },
      });
      if (error) Alert.alert("Could not sign in", error.message);
    } catch (e) {
      // User canceling the native sheet throws ERR_REQUEST_CANCELED - ignore it.
      if ((e as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Sign in failed", "Please try again.");
      }
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonStyle={
        scheme === "dark"
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      cornerRadius={16}
      onPress={signIn}
      style={{ height: 56, width: "100%" }}
    />
  );
}
