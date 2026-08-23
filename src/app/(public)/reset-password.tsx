import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import { z } from "zod";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Field from "@/components/ui/field";
import Screen from "@/components/ui/screen";
import { authClient } from "@/lib/auth-client";

const schema = z.object({ password: z.string().min(8, "At least 8 characters") });

/** Deep-link target: repcard://reset-password?token=... */
export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [pending, setPending] = useState(false);

  const { control, handleSubmit } = useForm<z.infer<typeof schema>>({
    defaultValues: { password: "" },
    mode: "onTouched",
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <Screen className="px-5">
        <EmptyState
          icon="link"
          title="This reset link is invalid"
          body="Open the link from your email again, or request a new one."
        />
        <Button className="mx-6" onPress={() => router.replace("/forgot-password")} variant="outline">
          Request a new link
        </Button>
      </Screen>
    );
  }

  const submit = handleSubmit(async ({ password }) => {
    setPending(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) {
        Alert.alert("Could not reset your password", error.message);
        return;
      }
      Alert.alert("Password updated", "Sign in with your new password.", [
        { text: "Sign in", onPress: () => router.replace("/sign-in") },
      ]);
    } finally {
      setPending(false);
    }
  });

  return (
    <Screen>
      <View className="flex-1 px-6 pb-6 pt-10">
        <Text className="font-bold text-[28px] tracking-tight text-foreground">
          Set a new password
        </Text>
        <Text className="mt-1.5 font-sans text-[14px] text-muted-foreground">
          Make it one you'll remember mid-set.
        </Text>
        <View className="mt-8">
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value }, fieldState }) => (
              <Field
                autoCapitalize="none"
                autoComplete="new-password"
                error={fieldState.error?.message}
                label="New password"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={submit}
                placeholder="8+ characters"
                returnKeyType="done"
                secure
                textContentType="newPassword"
                value={value}
              />
            )}
          />
        </View>
        <Button busy={pending} className="mt-8" onPress={submit}>
          Update password
        </Button>
      </View>
    </Screen>
  );
}
