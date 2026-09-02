import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import ExerciseReferenceSheet from "@/features/exercise/exercise-reference-sheet";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { fetchWorkout, saveSession, type WorkoutExerciseItem } from "@/lib/api";
import { cx } from "@/lib/cx";
import { haptic } from "@/lib/haptics";
import { useToken } from "@/theme/use-token";

const clock = (seconds: number) => new Date(seconds * 1000).toISOString().slice(11, 19);

/**
 * Live session. Set inputs live in a ref (typing never re-renders the list);
 * only completion toggles touch React state. A beforeRemove guard offers
 * save/discard when there's progress, and the timer pauses during prompts.
 */
export default function LiveSession() {
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");

  const timer = useSessionTimer();
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reference, setReference] = useState<{ id: string; name: string } | null>(null);

  const inputsRef = useRef<Record<string, { reps?: string; weight?: string }>>({});
  const exitApprovedRef = useRef(false);

  const { data: workout, isError, isPending, refetch } = useQuery({
    enabled: Boolean(id),
    queryKey: ["workout", id],
    queryFn: () => fetchWorkout(id),
  });

  useEffect(() => {
    if (workout && expanded === null) setExpanded(workout.exercises[0]?.id ?? null);
  }, [workout, expanded]);

  const totalSets = (workout?.exercises ?? []).reduce((sum, e) => sum + e.sets, 0);

  const persist = useCallback(async () => {
    if (!workout) return false;
    setSaving(true);
    try {
      const sets = workout.exercises.flatMap((exercise) =>
        Array.from({ length: exercise.sets }, (_, i) => i + 1)
          .filter((n) => done.has(`${exercise.id}:${n}`))
          .map((n) => {
            const typed = inputsRef.current[`${exercise.id}:${n}`];
            const weight = Number(typed?.weight ?? "") || exercise.targetWeight || 0;
            // A typed 0 is a real value (failed set) - only blank falls back to plan.
            const typedReps = Number.parseInt(typed?.reps ?? "", 10);
            return {
              exerciseId: exercise.id,
              setNumber: n,
              reps: Number.isNaN(typedReps) ? exercise.reps : typedReps,
              ...(weight > 0 && { weight }),
            };
          }),
      );
      await saveSession({
        workoutId: workout.id,
        startedAt: new Date(timer.startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: Math.round(timer.elapsed),
        sets,
      });
      await Promise.all(
        ["sessions", "day-stats", "calendar", "streak", "card"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      return true;
    } catch (error) {
      Alert.alert("Could not save session", error instanceof Error ? error.message : "Try again");
      return false;
    } finally {
      setSaving(false);
    }
  }, [done, queryClient, timer, workout]);

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (exitApprovedRef.current) return;
      event.preventDefault();

      const wasPaused = timer.paused;
      timer.pause();
      const stay = () => {
        if (!wasPaused) timer.resume();
      };
      const leave = () => {
        exitApprovedRef.current = true;
        navigation.dispatch(event.data.action);
      };

      if (done.size === 0) {
        Alert.alert("Leave workout?", "Nothing has been logged yet.", [
          { text: "Stay", style: "cancel", onPress: stay },
          { text: "Leave", style: "destructive", onPress: leave },
        ]);
        return;
      }
      Alert.alert("Save your progress?", `${done.size} of ${totalSets} sets logged.`, [
        { text: "Stay", style: "cancel", onPress: stay },
        { text: "Discard", style: "destructive", onPress: leave },
        {
          text: "Save & leave",
          onPress: async () => {
            if (await persistRef.current()) leave();
          },
        },
      ]);
    });
    // timer identity is stable; done.size/totalSets drive the prompt copy
  }, [navigation, done.size, totalSets, timer]);

  const finish = () => {
    const wasPaused = timer.paused;
    timer.pause();
    Alert.alert("Finish workout?", `${done.size} of ${totalSets} sets logged.`, [
      {
        text: "Keep going",
        style: "cancel",
        onPress: () => {
          if (!wasPaused) timer.resume();
        },
      },
      {
        text: "Finish",
        onPress: async () => {
          if (!(await persist())) return;
          haptic.success();
          exitApprovedRef.current = true;
          router.dismissAll();
          router.replace("/history");
        },
      },
    ]);
  };

  const toggleSet = (exercise: WorkoutExerciseItem, setNumber: number) => {
    const key = `${exercise.id}:${setNumber}`;
    // Side effects stay OUT of the updater - React may replay it.
    const wasDone = done.has(key);
    if (wasDone) {
      haptic.tick();
    } else {
      haptic.setDone();
      timer.startRest(exercise.restSeconds);
    }
    setDone((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isPending) {
    return (
      <Screen className="px-5">
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-6 h-12 w-44" />
        <View className="mt-8 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-16 rounded-2xl" key={i} />
          ))}
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

  const doneExercises = workout.exercises.filter((e) =>
    Array.from({ length: e.sets }, (_, i) => i + 1).every((n) => done.has(`${e.id}:${n}`)),
  ).length;

  return (
    <Screen>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerClassName="flex-grow px-5 pb-36"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between pt-3">
          <View className="flex-1 pr-3">
            <Text className="font-bold text-[24px] tracking-tight text-foreground" numberOfLines={1}>
              {workout.name}
            </Text>
            <Text className="mt-1 font-sans text-[12px] text-muted-foreground">
              {doneExercises}/{workout.exercises.length} exercises · {done.size}/{totalSets} sets
            </Text>
          </View>
          <Pressable accessibilityRole="button" className="min-h-11 justify-center" onPress={router.back}>
            <Text className="font-semibold text-[13px] text-primary">Leave</Text>
          </Pressable>
        </View>

        <View className="my-6 flex-row items-center justify-between">
          <View>
            <Text className="font-bold text-[38px] tracking-tight text-foreground">
              {clock(timer.elapsed)}
            </Text>
            <Text className="mt-0.5 font-sans text-[12px] text-muted-foreground">Elapsed</Text>
          </View>
          <Pressable
            accessibilityLabel={timer.paused ? "Resume" : "Pause"}
            className="h-16 w-16 items-center justify-center rounded-full bg-primary active:opacity-85"
            onPress={timer.toggle}
          >
            <Feather color="#052E22" name={timer.paused ? "play" : "pause"} size={25} />
          </Pressable>
        </View>

        <View className="gap-3">
          {workout.exercises.map((exercise) => {
            const isOpen = expanded === exercise.id;
            return (
              <View className="overflow-hidden rounded-2xl border border-border bg-card" key={exercise.id}>
                <View className="flex-row items-center px-4 py-3">
                  {exercise.image ? (
                    <Image
                      className="h-11 w-11 rounded-xl bg-muted"
                      resizeMode="cover"
                      source={{ uri: exercise.image }}
                    />
                  ) : (
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted">
                      <Feather color={mutedFg} name="image" size={16} />
                    </View>
                  )}
                  <Pressable
                    className="ml-3 flex-1"
                    onPress={() => setExpanded(isOpen ? null : exercise.id)}
                  >
                    <Text className="font-bold text-[14px] text-foreground">{exercise.name}</Text>
                    <Text className="mt-0.5 font-sans text-[12px] text-muted-foreground">
                      {exercise.sets}×{exercise.reps}
                      {exercise.targetWeight ? ` @ ${exercise.targetWeight}kg` : ""} · rest{" "}
                      {exercise.restSeconds}s
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`How to do ${exercise.name}`}
                    accessibilityRole="button"
                    className="h-10 w-10 items-center justify-center"
                    hitSlop={4}
                    onPress={() => setReference({ id: exercise.id, name: exercise.name })}
                  >
                    <Feather color={primary} name="help-circle" size={19} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={isOpen ? "Collapse" : "Expand"}
                    className="h-10 w-10 items-center justify-center"
                    onPress={() => setExpanded(isOpen ? null : exercise.id)}
                  >
                    <Feather color={mutedFg} name={isOpen ? "chevron-up" : "chevron-down"} size={19} />
                  </Pressable>
                </View>

                {isOpen ? (
                  <View className="border-t border-border">
                    <View className="h-9 flex-row items-center px-4">
                      {(
                        [
                          ["SET", "w-10"],
                          ["KG", "flex-1"],
                          ["REPS", "flex-1"],
                          ["✓", "w-12"],
                        ] as const
                      ).map(([label, width]) => (
                        <Text
                          className={`${width} text-center font-semibold text-[10px] text-muted-foreground`}
                          key={label}
                        >
                          {label}
                        </Text>
                      ))}
                    </View>
                    {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNumber) => {
                      const key = `${exercise.id}:${setNumber}`;
                      const isDone = done.has(key);
                      return (
                        <View
                          className={cx(
                            "h-14 flex-row items-center border-t border-border px-4",
                            isDone && "bg-accent/60 dark:bg-accent/15",
                          )}
                          key={key}
                        >
                          <Text className="w-10 text-center font-semibold text-[13px] text-foreground">
                            {setNumber}
                          </Text>
                          <TextInput
                            accessibilityLabel={`Weight for set ${setNumber}`}
                            className="mx-1 h-10 flex-1 rounded-lg bg-muted text-center font-sans text-[13px] text-foreground"
                            keyboardType="decimal-pad"
                            onChangeText={(v) => {
                              inputsRef.current[key] = { ...inputsRef.current[key], weight: v };
                            }}
                            placeholder={exercise.targetWeight ? String(exercise.targetWeight) : "kg"}
                            placeholderTextColor={mutedFg}
                            selectionColor={primary}
                          />
                          <TextInput
                            accessibilityLabel={`Reps for set ${setNumber}`}
                            className="mx-1 h-10 flex-1 rounded-lg bg-muted text-center font-sans text-[13px] text-foreground"
                            defaultValue={String(exercise.reps)}
                            keyboardType="number-pad"
                            onChangeText={(v) => {
                              inputsRef.current[key] = { ...inputsRef.current[key], reps: v };
                            }}
                            placeholderTextColor={mutedFg}
                            selectionColor={primary}
                          />
                          <Pressable
                            accessibilityLabel={`Mark set ${setNumber} ${isDone ? "incomplete" : "complete"}`}
                            className="w-12 items-center"
                            onPress={() => toggleSet(exercise, setNumber)}
                          >
                            <Feather
                              color={isDone ? primary : mutedFg}
                              name={isDone ? "check-circle" : "circle"}
                              size={22}
                            />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Button busy={saving} className="mt-6" onPress={finish}>
          Finish Workout
        </Button>
      </KeyboardAwareScrollView>

      {timer.restLeft > 0 ? (
        <View
          className="absolute right-5 h-28 w-28 items-center justify-center rounded-full border-4 border-primary/50 bg-card shadow-lg"
          style={{ bottom: insets.bottom + 12 }}
        >
          <Text className="font-sans text-[10px] text-muted-foreground">Rest</Text>
          <Text className="mt-0.5 font-bold text-[20px] text-primary">
            {Math.floor(timer.restLeft / 60)}:{String(Math.floor(timer.restLeft % 60)).padStart(2, "0")}
          </Text>
          <Pressable accessibilityLabel="Skip rest" onPress={timer.skipRest}>
            <Text className="mt-0.5 font-semibold text-[10px] text-primary">Skip</Text>
          </Pressable>
        </View>
      ) : null}
      {reference ? (
        <ExerciseReferenceSheet
          exerciseId={reference.id}
          exerciseName={reference.name}
          onClose={() => setReference(null)}
          visible
        />
      ) : null}
      <KeyboardToolbar />
    </Screen>
  );
}
