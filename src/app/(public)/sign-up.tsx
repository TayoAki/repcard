import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";

import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import Screen from "@/components/ui/screen";
import { authClient } from "@/lib/auth-client";
import { clearDraft, completedDraft } from "@/lib/onboarding-store";
import { signUpSchema, type SignUpValues } from "@/lib/validation/auth";

export default function SignUp() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
    resolver: zodResolver(signUpSchema),
  });

  const submit = handleSubmit(async ({ name, email, password }) => {
    const onboarding = completedDraft();
    if (!onboarding.success) {
      // Answers missing (cleared storage, deep link) - restart the flow.
      router.replace({ pathname: "/onboarding/[step]", params: { step: "gender" } });
      return;
    }
    setPending(true);
    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        ...onboarding.data,
      });
      if (error) {
        Alert.alert("Could not create your account", error.message);
        return;
      }
      clearDraft();
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
          <Text className="font-bold text-[28px] tracking-tight text-foreground">
            Claim your card
          </Text>
          <Text className="mt-1.5 font-sans text-[14px] text-muted-foreground">
            One account. One card. Your numbers do the talking.
          </Text>

          <View className="mt-9 gap-5">
            <Controller
              control={control}
              name="name"
              render={({ field: { onBlur, onChange, value }, fieldState }) => (
                <Field
                  autoCapitalize="words"
                  autoComplete="name"
                  error={fieldState.error?.message}
                  label="Name on card"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  placeholder="Alex Rivera"
                  returnKeyType="next"
                  textContentType="name"
                  value={value}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value }, fieldState }) => (
                <Field
                  ref={emailRef}
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
                  autoComplete="new-password"
                  error={fieldState.error?.message}
                  label="Password"
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

          <Button busy={pending} className="mt-9" disabled={pending || formState.isSubmitting} onPress={submit}>
            Create account
          </Button>

          <View className="mt-auto flex-row items-center justify-center pt-9">
            <Text className="font-sans text-[13px] text-muted-foreground">Already have a card? </Text>
            <Link href="/sign-in" replace asChild>
              <Pressable className="min-h-11 justify-center px-1">
                <Text className="font-semibold text-[13px] text-primary">Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </Screen>
  );
}
