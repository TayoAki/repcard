import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import { useWorkoutDraft, type DraftExercise } from "@/contexts/workout-draft";
import {
  createWorkout,
  fetchWorkout,
  updateWorkout,
  type WorkoutPayload,
} from "@/lib/api";
import { useToken } from "@/theme/use-token";

/**
 * Composer for creating AND editing (pass ?id=). Prescription steppers per
 * exercise include target weight - plan it now, see it during the session.
 */
export default function ComposeWorkout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<{ base64: string; uri: string } | null>(null);
  const [items, setItems] = useWorkoutDraft();
  const [hydrated, setHydrated] = useState(false);

  const { data: existing } = useQuery({
    enabled: Boolean(editId),
    queryKey: ["workout", editId],
    queryFn: () => fetchWorkout(editId!),
  });

  // Edit mode: hydrate the form once from the fetched workout.
  useEffect(() => {
    if (!existing || hydrated) return;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setItems(
      existing.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        image: e.image,
        muscles: e.muscles,
        sets: e.sets,
        reps: e.reps,
        targetWeight: e.targetWeight,
        restSeconds: e.restSeconds,
      })),
    );
    setHydrated(true);
  }, [existing, hydrated, setItems]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: WorkoutPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        image: cover?.base64,
        exercises: items.map((e) => ({
          id: e.id,
          sets: e.sets,
          reps: e.reps,
          targetWeight: e.targetWeight,
          restSeconds: e.restSeconds,
        })),
      };
      if (editId) await updateWorkout(editId, payload);
      else await createWorkout(payload);
    },
    onError: (error) => Alert.alert("Could not save workout", error.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      if (editId) queryClient.invalidateQueries({ queryKey: ["workout", editId] });
      setItems([]);
      router.back();
    },
  });

  const submit = () => {
    if (!name.trim()) return Alert.alert("Name it", "Give your workout a name first.");
    if (items.length === 0) return Alert.alert("Empty workout", "Add at least one exercise.");
    save.mutate();
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos permission needed", "Enable photo access in Settings to add a cover.", [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: Linking.openSettings },
      ]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      base64: true,
      mediaTypes: ["images"],
      quality: 0.4,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) setCover({ base64: asset.base64, uri: asset.uri });
  };

  const adjust = (
    id: string,
    field: "sets" | "reps" | "restSeconds" | "targetWeight",
    delta: number,
  ) =>
    setItems((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === "targetWeight") {
          const next = Math.max(0, (e.targetWeight ?? 0) + delta);
          return { ...e, targetWeight: next === 0 ? null : next };
        }
        const min = field === "restSeconds" ? 0 : 1;
        return { ...e, [field]: Math.max(min, e[field] + delta) };
      }),
    );

  const remove = (id: string) => setItems((prev) => prev.filter((e) => e.id !== id));

  return (
    <Screen>
      <KeyboardAwareScrollView
        bottomOffset={27}
        contentContainerClassName="flex-grow"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-grow px-5 pb-8 pt-3">
          <View className="flex-row items-center justify-between">
            <Pressable className="min-h-11 justify-center pr-3" onPress={() => { setItems([]); router.back(); }}>
              <Text className="font-medium text-[13px] text-destructive">Cancel</Text>
            </Pressable>
            <Text className="font-bold text-[16px] text-foreground">
              {editId ? "Edit Workout" : "New Workout"}
            </Text>
            <Pressable className="min-h-11 justify-center pl-3" onPress={submit}>
              <Text className="font-semibold text-[13px] text-primary">Save</Text>
            </Pressable>
          </View>

          <Pressable
            className="mt-4 h-40 items-center justify-center overflow-hidden rounded-2xl border border-input-border bg-muted"
            onPress={pickCover}
          >
            {cover || existing?.image ? (
              <>
                <Image className="h-full w-full" source={{ uri: cover?.uri ?? existing?.image ?? "" }} />
                <View className="absolute bottom-2.5 rounded-full bg-black/60 px-3.5 py-1.5">
                  <Text className="font-semibold text-[11px] text-white">Change cover</Text>
                </View>
              </>
            ) : (
              <>
                <Feather color={mutedFg} name="image" size={26} />
                <Text className="mt-2 font-medium text-[13px] text-muted-foreground">
                  Add cover (optional)
                </Text>
              </>
            )}
          </Pressable>

          <View className="mt-5 gap-2">
            <Text className="font-medium text-[14px] text-foreground">Name</Text>
            <TextInput
              className="h-14 rounded-2xl border border-input-border bg-input px-4 font-sans text-[14px] text-foreground"
              maxLength={80}
              onChangeText={setName}
              placeholder="e.g. Push Day"
              placeholderTextColor={mutedFg}
              selectionColor={primary}
              value={name}
            />
          </View>
          <View className="mt-4 gap-2">
            <Text className="font-medium text-[14px] text-foreground">Notes (optional)</Text>
            <TextInput
              className="h-20 rounded-2xl border border-input-border bg-input px-4 py-3 font-sans text-[14px] text-foreground"
              maxLength={500}
              multiline
              onChangeText={setDescription}
              placeholder="Focus, tempo, anything future-you should know..."
              placeholderTextColor={mutedFg}
              selectionColor={primary}
              textAlignVertical="top"
              value={description}
            />
          </View>

          <View className="mt-6">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-bold text-[16px] text-foreground">Exercises</Text>
              <Text className="font-sans text-[12px] text-muted-foreground">{items.length} added</Text>
            </View>

            <View className="mt-3 gap-3">
              {items.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} onAdjust={adjust} onRemove={remove} />
              ))}
            </View>

            <Button
              before={<Feather color={primary} name="plus" size={17} />}
              className="mt-3"
              onPress={() => router.push("/workout/pick")}
              size="sm"
              variant="outline"
            >
              Add exercises
            </Button>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </Screen>
  );
}

function ExerciseRow({
  exercise,
  onAdjust,
  onRemove,
}: {
  exercise: DraftExercise;
  onAdjust: (id: string, field: "sets" | "reps" | "restSeconds" | "targetWeight", delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const mutedFg = useToken("mutedFg");

  const rows = [
    { label: "Sets", value: String(exercise.sets), field: "sets", step: 1 },
    { label: "Reps", value: String(exercise.reps), field: "reps", step: 1 },
    { label: "Rest", value: `${exercise.restSeconds}s`, field: "restSeconds", step: 15 },
    {
      label: "Target",
      value: exercise.targetWeight ? `${exercise.targetWeight} kg` : "—",
      field: "targetWeight",
      step: 2.5,
    },
  ] as const;

  return (
    <View className="rounded-2xl border border-border bg-card p-3.5">
      <View className="flex-row items-center">
        {exercise.image ? (
          <Image className="h-11 w-12 rounded-xl bg-muted" source={{ uri: exercise.image }} />
        ) : (
          <View className="h-11 w-12 items-center justify-center rounded-xl bg-muted">
            <Feather color={mutedFg} name="image" size={16} />
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-[13px] text-foreground">{exercise.name}</Text>
          <Text className="mt-0.5 font-sans capitalize text-[11.5px] text-muted-foreground">
            {exercise.muscles}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Remove ${exercise.name}`}
          className="h-9 w-9 items-center justify-center"
          onPress={() => onRemove(exercise.id)}
        >
          <Feather color={mutedFg} name="x" size={18} />
        </Pressable>
      </View>

      {rows.map(({ label, value, field, step }) => (
        <View className="mt-3 flex-row items-center justify-between" key={field}>
          <Text className="font-sans text-[12px] text-muted-foreground">{label}</Text>
          <View className="flex-row items-center gap-3">
            <Stepper label={`Decrease ${label}`} icon="minus" onPress={() => onAdjust(exercise.id, field, -step)} />
            <Text className="w-16 text-center font-semibold text-[12.5px] text-foreground">{value}</Text>
            <Stepper label={`Increase ${label}`} icon="plus" onPress={() => onAdjust(exercise.id, field, step)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Stepper({ icon, label, onPress }: { icon: "plus" | "minus"; label: string; onPress: () => void }) {
  const mutedFg = useToken("mutedFg");
  return (
    <Pressable
      accessibilityLabel={label}
      className="h-8 w-8 items-center justify-center rounded-lg bg-muted active:opacity-70"
      onPress={onPress}
    >
      <Feather color={mutedFg} name={icon} size={14} />
    </Pressable>
  );
}
