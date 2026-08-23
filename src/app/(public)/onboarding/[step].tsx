import { Feather } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import OptionCard from "@/features/onboarding/option-card";
import { STEPS, stepIndex } from "@/features/onboarding/steps";
import { draft, saveAnswer } from "@/lib/onboarding-store";
import { type Onboarding } from "@/lib/validation/onboarding";
import { useToken } from "@/theme/use-token";

/** One dynamic route drives all three steps; config lives in steps.ts. */
export default function OnboardingStep() {
  const router = useRouter();
  const { step: stepKey = "" } = useLocalSearchParams<{ step: string }>();
  const fg = useToken("fg");

  const [answers, setAnswers] = useState<Partial<Onboarding>>(() => ({ ...draft }));

  const index = stepIndex(stepKey);
  const step = STEPS[index];
  if (!step) return <Redirect href="/welcome" />;

  const nextStep = STEPS[index + 1];
  const chosen = answers[step.key];

  const choose = (value: Onboarding[typeof step.key]) => {
    saveAnswer(step.key, value);
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
  };

  const advance = () => {
    if (nextStep) {
      router.push({ pathname: "/onboarding/[step]", params: { step: nextStep.key } });
    } else {
      router.push("/sign-up");
    }
  };

  return (
    <Screen>
      <View className="flex-1 px-6 pb-5 pt-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            onPress={() => (index === 0 ? router.replace("/welcome") : router.back())}
          >
            <Feather color={fg} name="arrow-left" size={22} />
          </Pressable>
          <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
            />
          </View>
          <Text className="font-medium text-[12px] text-muted-foreground">
            {index + 1}/{STEPS.length}
          </Text>
        </View>

        <Animated.View entering={FadeInDown.duration(240)}>
          <Text className="mt-8 max-w-80 font-bold text-[28px] leading-9 tracking-tight text-foreground">
            {step.title}
          </Text>
          <Text className="mt-2 font-sans text-[14px] leading-5 text-muted-foreground">
            {step.subtitle}
          </Text>
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

        <Button disabled={!chosen} onPress={advance}>
          {nextStep ? "Next" : "Create my card"}
        </Button>
      </View>
    </Screen>
  );
}
