import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";

import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import Screen from "@/components/ui/screen";
import { authClient } from "@/lib/auth-client";
import { completedDraft } from "@/lib/onboarding-store";
import { signInSchema, type SignInValues } from "@/lib/validation/auth";

export default function SignIn() {
  const [pending, setPending] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // If onboarding was never finished, "Sign up" restarts it instead of
  // landing on a signup form that would bounce back anyway.
  const signUpHref = completedDraft().success
    ? ("/sign-up" as const)
    : ({ pathname: "/onboarding/[step]", params: { step: "gender" } } as const);

  const { control, handleSubmit } = useForm<SignInValues>({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
    resolver: zodResolver(signInSchema),
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setPending(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) Alert.alert("Could not sign in", error.message);
    } finally {
      setPending(false);
    }
  });

  return (
    <Screen>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerClassName="flex-grow"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-grow px-6 pb-6 pt-10">
          <Text className="font-bold text-[28px] tracking-tight text-foreground">Welcome back</Text>
          <Text className="mt-1.5 font-sans text-[14px] text-muted-foreground">
            Your card missed you.
          </Text>

          <View className="mt-9 gap-5">
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
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholder="you@example.com"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  value={value}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value }, fieldState }) => (
                <Field
                  ref={passwordRef}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  error={fieldState.error?.message}
                  label="Password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={submit}
                  placeholder="Your password"
                  returnKeyType="done"
                  secure
                  textContentType="password"
                  value={value}
                />
              )}
            />
          </View>

          <Button busy={pending} className="mt-9" disabled={pending} onPress={submit}>
            Sign in
          </Button>

          <View className="mt-auto flex-row items-center justify-center pt-9">
            <Text className="font-sans text-[13px] text-muted-foreground">New here? </Text>
            <Link href={signUpHref} replace asChild>
              <Pressable className="min-h-11 justify-center px-1">
                <Text className="font-semibold text-[13px] text-primary">Create your card</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </Screen>
  );
}
