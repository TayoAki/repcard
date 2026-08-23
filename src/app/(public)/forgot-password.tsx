import { zodResolver } from "@hookform/resolvers/zod";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, View } from "react-native";
import { z } from "zod";

import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import Screen from "@/components/ui/screen";
import { authClient } from "@/lib/auth-client";
import { useToken } from "@/theme/use-token";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email")),
});

export default function ForgotPassword() {
  const router = useRouter();
  const fg = useToken("fg");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit } = useForm<z.infer<typeof schema>>({
    defaultValues: { email: "" },
    mode: "onTouched",
    resolver: zodResolver(schema),
  });

  const submit = handleSubmit(async ({ email }) => {
    setPending(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "repcard://reset-password",
      });
      if (error) {
        Alert.alert("Could not send the reset link", error.message);
        return;
      }
      // Always confirm - never reveal whether an email has an account.
      setSent(true);
    } finally {
      setPending(false);
    }
  });

  return (
    <Screen>
      <View className="flex-1 px-6 pb-6 pt-3">
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          onPress={router.back}
        >
          <Feather color={fg} name="arrow-left" size={22} />
        </Pressable>

        {sent ? (
          <View className="flex-1 items-center justify-center pb-20">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-accent dark:bg-accent/20">
              <Feather color={useTokenSafe()} name="mail" size={24} />
            </View>
            <Text className="mt-5 text-center font-bold text-[20px] text-foreground">
              Check your email
            </Text>
            <Text className="mt-2 max-w-72 text-center font-sans text-[13px] leading-5 text-muted-foreground">
              If that address has a RepCard account, a reset link is on its way. It expires in
              an hour.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mt-6 font-bold text-[28px] tracking-tight text-foreground">
              Forgot your password?
            </Text>
            <Text className="mt-1.5 font-sans text-[14px] text-muted-foreground">
              We'll email you a reset link.
            </Text>
            <View className="mt-8">
              <Controller
                control={control}
                name="email"
                render={({ field: { onBlur, onChange, value }, fieldState }) => (
                  <Field
                    autoCapitalize="none"
                    autoComplete="email"
                    error={fieldState.error?.message}
                    inputMode="email"
                    label="Email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    onSubmitEditing={submit}
                    placeholder="you@example.com"
                    returnKeyType="done"
                    textContentType="emailAddress"
                    value={value}
                  />
                )}
              />
            </View>
            <Button busy={pending} className="mt-8" onPress={submit}>
              Send reset link
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

function useTokenSafe() {
  return useToken("primary");
}
