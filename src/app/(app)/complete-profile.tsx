import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import OptionCard from "@/features/onboarding/option-card";
import { STEPS } from "@/features/onboarding/steps";
import { setupProfile } from "@/lib/api";
import { type Onboarding } from "@/lib/validation/onboarding";

/**
 * Profile completion for authenticated users who arrived without a profile -
 * i.e. social sign-ins (Apple), which skip the email-signup hook that creates
 * it. Same three questions as onboarding; on submit it POSTs the profile and
 * the app's gate lets them through.
 */
export default function CompleteProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Partial<Onboarding>>({});
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const nextStep = STEPS[index + 1];
  const chosen = answers[step.key];

  const save = useMutation({
    mutationFn: () => setupProfile(answers as Onboarding),
    onError: (error) => Alert.alert("Could not finish setup", error.message),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.replace("/(app)/(tabs)");
    },
  });

  const choose = (value: Onboarding[typeof step.key]) =>
    setAnswers((prev) => ({ ...prev, [step.key]: value }));

  const advance = () => {
    if (nextStep) setIndex((i) => i + 1);
    else save.mutate();
  };

  return (
    <Screen>
      <View className="flex-1 px-6 pb-5 pt-3">
        <View className="h-1.5 overflow-hidden rounded-full bg-border">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
          />
        </View>

        <Animated.View entering={FadeInDown.duration(240)}>
          <Text className="mt-8 font-bold text-[26px] tracking-tight text-foreground">
            Let's finish your card
          </Text>
          <Text className="mt-2 font-sans text-[14px] text-muted-foreground">{step.subtitle}</Text>
        </Animated.View>

        <View accessibilityRole="radiogroup" className="mt-8 flex-1 gap-3.5">
          {step.options.map((option, i) => (
            <OptionCard
              key={option.value}
              delay={(i + 1) * 70}
              hint={option.hint}
              icon={option.icon}
              label={option.label}
              onPress={() => choose(option.value)}
              selected={chosen === option.value}
            />
          ))}
        </View>

        <Button busy={save.isPending} disabled={!chosen} onPress={advance}>
          {nextStep ? "Next" : "Create my card"}
        </Button>
      </View>
    </Screen>
  );
}
