import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import { generatePlan, type GeneratedPlan } from "@/lib/api";
import { useToken } from "@/theme/use-token";

/** One-tap program generation from the athlete's profile. */
export default function GeneratePlanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");

  const generate = useMutation({
    mutationFn: generatePlan,
    onError: (error) => Alert.alert("Could not build your plan", error.message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });

  const result: GeneratedPlan | undefined = generate.data;

  return (
    <Screen>
      <View className="flex-1 px-6 pb-6">
        <View className="h-14 flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Close"
            className="-ml-2 h-11 w-11 items-center justify-center"
            onPress={router.back}
          >
            <Feather color={mutedFg} name="x" size={22} />
          </Pressable>
        </View>

        {!result ? (
          <>
            <View className="flex-1 items-center justify-center">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent dark:bg-accent/20">
                <Feather color={primary} name="cpu" size={28} />
              </View>
              <Text className="mt-6 text-center font-bold text-[26px] tracking-tight text-foreground">
                Build my program
              </Text>
              <Text className="mt-3 max-w-72 text-center font-sans text-[14px] leading-6 text-muted-foreground">
                Three workouts tailored to your goal and experience, assembled from the exercise
                catalog. AI-designed when a key is configured; coach-templated otherwise.
              </Text>
            </View>
            <Button busy={generate.isPending} onPress={() => generate.mutate()}>
              Generate my plan
            </Button>
          </>
        ) : (
          <>
            <Text className="font-bold text-[24px] tracking-tight text-foreground">
              Your program is ready
            </Text>
            <Text className="mt-1.5 font-sans text-[13px] text-muted-foreground">
              {result.source === "ai" ? "Designed by AI" : "Built from coach templates"} · saved to
              your workouts
            </Text>
            <View className="mt-6 gap-3">
              {result.workouts.map((workout, index) => (
                <Pressable
                  className="flex-row items-center rounded-2xl border border-border bg-card p-4 active:bg-muted"
                  key={workout.id}
                  onPress={() => router.replace({ pathname: "/workout/[id]", params: { id: workout.id } })}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent dark:bg-accent/20">
                    <Text className="font-bold text-[14px] text-primary">{index + 1}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-[14px] text-foreground">{workout.name}</Text>
                    <Text className="mt-0.5 font-sans text-[12px] text-muted-foreground">
                      {workout.exerciseCount} exercises
                    </Text>
                  </View>
                  <Feather color={mutedFg} name="chevron-right" size={18} />
                </Pressable>
              ))}
            </View>
            <View className="mt-auto">
              <Button onPress={() => router.replace("/workouts")}>See all workouts</Button>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
