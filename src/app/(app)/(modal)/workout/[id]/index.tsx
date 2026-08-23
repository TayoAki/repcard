import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import { deleteWorkout, fetchWorkout, mintShareSlug } from "@/lib/api";
import { useToken } from "@/theme/use-token";

/** Workout detail: hero, plan list, start CTA, edit/delete actions. */
export default function WorkoutDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mutedFg = useToken("mutedFg");

  const { data: workout, isError, isPending, refetch } = useQuery({
    enabled: Boolean(id),
    queryKey: ["workout", id],
    queryFn: () => fetchWorkout(id),
  });

  const destroy = useMutation({
    mutationFn: () => deleteWorkout(id),
    onError: (error) => Alert.alert("Could not delete", error.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.back();
    },
  });

  const confirmDelete = () =>
    Alert.alert("Delete this workout?", "Past sessions of it are kept in your history.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => destroy.mutate() },
    ]);

  const shareLink = async () => {
    try {
      const { slug } = await mintShareSlug(id);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/w/${slug}`;
      await Share.share({ message: `${workout?.name} — my RepCard workout: ${url}` });
    } catch (error) {
      Alert.alert("Could not share", error instanceof Error ? error.message : "Try again");
    }
  };

  const actions = () =>
    Alert.alert(workout?.name ?? "Workout", undefined, [
      { text: "Share link", onPress: shareLink },
      { text: "Edit", onPress: () => router.push({ pathname: "/workout/compose", params: { id } }) },
      { text: "Delete", style: "destructive", onPress: confirmDelete },
      { text: "Cancel", style: "cancel" },
    ]);

  if (isPending) {
    return (
      <Screen edges={["bottom"]}>
        <Skeleton className="h-72 rounded-none" />
        <View className="gap-3 px-5 pt-5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </View>
      </Screen>
    );
  }

  if (isError || !workout) {
    return (
      <Screen className="px-5">
        <EmptyState icon="wifi-off" title="Could not load this workout" onRetry={refetch} />
      </Screen>
    );
  }

  const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets, 0);

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <View className="h-72 bg-muted">
          {workout.image ? (
            <>
              <Image className="h-full w-full" resizeMode="cover" source={{ uri: workout.image }} />
              <View className="absolute inset-0 bg-black/15" />
            </>
          ) : (
            <View className="h-full items-center justify-center">
              <Feather color={mutedFg} name="image" size={36} />
            </View>
          )}
          <SafeAreaView className="absolute inset-x-0 top-0" edges={["top"]}>
            <View className="flex-row items-center justify-between px-4 pt-2">
              <Pressable
                accessibilityLabel="Go back"
                className="h-10 w-10 items-center justify-center rounded-full bg-black/45 active:opacity-70"
                onPress={router.back}
              >
                <Feather color="#fff" name="arrow-left" size={21} />
              </Pressable>
              <Pressable
                accessibilityLabel="Workout actions"
                className="h-10 w-10 items-center justify-center rounded-full bg-black/45 active:opacity-70"
                onPress={actions}
              >
                <Feather color="#fff" name="more-horizontal" size={21} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        <View className="px-5">
          <Text className="mt-4 font-bold text-[24px] tracking-tight text-foreground">
            {workout.name}
          </Text>
          {workout.muscles ? (
            <Text className="mt-1 font-sans capitalize text-[13px] text-muted-foreground">
              {workout.muscles}
            </Text>
          ) : null}
          <View className="mt-3 flex-row gap-5">
            <Meta icon="list" text={`${workout.exercises.length} exercises`} />
            <Meta icon="layers" text={`${totalSets} sets`} />
          </View>

          <Button
            before={<Feather color="#052E22" name="play" size={16} />}
            className="mt-5"
            onPress={() => router.push({ pathname: "/workout/[id]/live", params: { id } })}
          >
            Start Workout
          </Button>

          {workout.description ? (
            <Text className="mt-5 font-sans text-[13.5px] leading-5 text-muted-foreground">
              {workout.description}
            </Text>
          ) : null}

          <Text className="mb-3 mt-6 font-bold text-[16px] text-foreground">Plan</Text>
          <View className="overflow-hidden rounded-2xl border border-border bg-card">
            {workout.exercises.map((exercise, index) => (
              <View
                className="min-h-16 flex-row items-center border-b border-border px-4 py-2 last:border-b-0"
                key={exercise.id}
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                  <Text className="font-semibold text-[12px] text-muted-foreground">{index + 1}</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-[13px] text-foreground">{exercise.name}</Text>
                  <Text className="mt-0.5 font-sans text-[12px] text-muted-foreground">
                    {exercise.sets}×{exercise.reps}
                    {exercise.targetWeight ? ` @ ${exercise.targetWeight}kg` : ""} · rest{" "}
                    {exercise.restSeconds}s
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const mutedFg = useToken("mutedFg");
  return (
    <View className="flex-row items-center gap-1.5">
      <Feather color={mutedFg} name={icon} size={13} />
      <Text className="font-sans text-[12px] text-muted-foreground">{text}</Text>
    </View>
  );
}
