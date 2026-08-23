import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import { fetchExercise } from "@/lib/api";
import { useToken } from "@/theme/use-token";

/** Catalog detail: hero image, meta grid, dataset instructions. */
export default function ExerciseDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? "";
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");

  const { data: exercise, isError, isPending, refetch } = useQuery({
    enabled: Boolean(id),
    queryKey: ["exercise", id],
    queryFn: () => fetchExercise(id),
  });

  if (!id || isError) {
    return (
      <Screen className="px-5">
        <BackButton onPress={router.back} />
        <EmptyState icon="alert-circle" title="Exercise not found" onRetry={id ? refetch : undefined} />
      </Screen>
    );
  }

  if (isPending || !exercise) {
    return (
      <Screen edges={["bottom"]}>
        <Skeleton className="h-72 rounded-none" />
        <View className="gap-3 px-5 pt-5">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </View>
      </Screen>
    );
  }

  const meta = [
    { icon: "tool", label: "Equipment", value: exercise.equipment },
    { icon: "bar-chart-2", label: "Difficulty", value: exercise.difficulty },
    { icon: "move", label: "Force", value: exercise.force },
    { icon: "layers", label: "Mechanics", value: exercise.mechanics },
  ] as const;

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
        <View className="h-72 bg-muted">
          {exercise.image ? (
            <Image
              accessibilityLabel={`${exercise.name} demonstration`}
              className="h-full w-full"
              resizeMode="cover"
              source={{ uri: exercise.image }}
            />
          ) : (
            <View className="h-full items-center justify-center">
              <Feather color={mutedFg} name="image" size={34} />
            </View>
          )}
          <View className="absolute inset-0 bg-black/10" />
          <SafeAreaView className="absolute inset-x-0 top-0" edges={["top"]}>
            <View className="px-4 pt-2">
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-full bg-black/45 active:opacity-70"
                onPress={router.back}
              >
                <Feather color="#fff" name="arrow-left" size={21} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        <View className="px-5">
          <Text className="mt-5 font-bold text-[24px] tracking-tight text-foreground">
            {exercise.name}
          </Text>
          <Text className="mt-1 font-medium capitalize text-[13px] text-primary">
            {exercise.muscles}
          </Text>

          <View className="mt-5 flex-row flex-wrap gap-2">
            {meta.map(({ icon, label, value }) => (
              <View className="min-w-[47%] flex-1 rounded-2xl border border-border bg-card p-3.5" key={label}>
                <Feather color={primary} name={icon} size={16} />
                <Text className="mt-2 font-sans text-[11px] text-muted-foreground">{label}</Text>
                <Text className="mt-0.5 font-semibold capitalize text-[13px] text-foreground">
                  {value ?? "Not specified"}
                </Text>
              </View>
            ))}
          </View>

          <Text className="mt-7 font-bold text-[17px] text-foreground">How to perform</Text>
          <View className="mt-3 gap-3">
            {exercise.instructions.map((step, index) => (
              <View className="flex-row gap-3" key={index}>
                <View className="h-6 w-6 items-center justify-center rounded-full bg-accent dark:bg-accent/20">
                  <Text className="font-semibold text-[11px] text-primary">{index + 1}</Text>
                </View>
                <Text className="flex-1 font-sans text-[13.5px] leading-5 text-muted-foreground">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const fg = useToken("fg");
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      className="-ml-2 h-11 w-11 items-center justify-center"
      onPress={onPress}
    >
      <Feather color={fg} name="arrow-left" size={22} />
    </Pressable>
  );
}
