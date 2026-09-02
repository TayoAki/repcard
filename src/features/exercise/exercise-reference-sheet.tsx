import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Skeleton from "@/components/ui/skeleton";
import { fetchCoachCues, fetchExercise } from "@/lib/api";
import { useToken } from "@/theme/use-token";

type Props = { exerciseId: string; exerciseName: string; visible: boolean; onClose: () => void };

/**
 * Mid-session exercise reference: image + how-to, without leaving the workout.
 * Both queries are lazy (enabled only while open) and cached per exercise, so
 * opening it repeatedly during a session is instant and costs nothing extra.
 */
export default function ExerciseReferenceSheet({ exerciseId, exerciseName, visible, onClose }: Props) {
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");

  const { data: exercise, isPending } = useQuery({
    enabled: visible && Boolean(exerciseId),
    queryKey: ["exercise", exerciseId],
    queryFn: () => fetchExercise(exerciseId),
    staleTime: Infinity,
  });
  const { data: coach, isPending: coachPending } = useQuery({
    enabled: visible && Boolean(exerciseId),
    queryKey: ["coach", exerciseId],
    queryFn: () => fetchCoachCues(exerciseId),
    staleTime: Infinity,
  });

  // Prefer AI coach cues when present; fall back to dataset instructions.
  const steps = coach?.cues?.length ? coach.cues : (exercise?.instructions ?? []);

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="h-14 flex-row items-center justify-between px-5">
          <Text className="flex-1 font-bold text-[17px] text-foreground" numberOfLines={1}>
            {exerciseName}
          </Text>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            className="-mr-2 h-11 w-11 items-center justify-center"
            onPress={onClose}
          >
            <Feather color={mutedFg} name="x" size={22} />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
          {isPending ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : exercise?.image ? (
            <Image
              accessibilityLabel={`${exerciseName} demonstration`}
              className="h-64 w-full rounded-2xl bg-muted"
              resizeMode="cover"
              source={{ uri: exercise.image }}
            />
          ) : (
            <View className="h-64 items-center justify-center rounded-2xl bg-muted">
              <Feather color={mutedFg} name="image" size={34} />
            </View>
          )}

          {exercise?.muscles ? (
            <Text className="mt-3 font-medium capitalize text-[13px] text-primary">
              {exercise.muscles}
            </Text>
          ) : null}

          <Text className="mt-5 font-bold text-[15px] text-foreground">How to perform</Text>
          <View className="mt-3 gap-3">
            {steps.length > 0 ? (
              steps.map((step, index) => (
                <View className="flex-row gap-3" key={index}>
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-accent dark:bg-accent/20">
                    <Text className="font-semibold text-[11px] text-primary">{index + 1}</Text>
                  </View>
                  <Text className="flex-1 font-sans text-[13.5px] leading-5 text-foreground">{step}</Text>
                </View>
              ))
            ) : isPending || coachPending ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <Text className="font-sans text-[13px] text-muted-foreground">
                No written steps for this exercise - the image above shows the movement.
              </Text>
            )}
          </View>

          {coach?.mistake ? (
            <View className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5">
              <View className="flex-row items-center gap-2">
                <Feather color={primary} name="alert-triangle" size={13} />
                <Text className="font-semibold text-[11px] uppercase tracking-wide text-destructive">
                  Watch out
                </Text>
              </View>
              <Text className="mt-1.5 font-sans text-[13px] leading-5 text-foreground">{coach.mistake}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
