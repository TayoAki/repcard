import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";

import EmptyState from "@/components/ui/empty-state";
import FilterChips from "@/components/filter-chips";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import { DEFAULT_PRESCRIPTION, useWorkoutDraft } from "@/contexts/workout-draft";
import { useDebounce } from "@/hooks/use-debounce";
import { fetchExerciseFacets, fetchExercises, type ExerciseListItem } from "@/lib/api";
import { useToken } from "@/theme/use-token";

/** Exercise picker: taps toggle selection; the row body opens catalog detail. */
export default function PickExercises() {
  const router = useRouter();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");
  const [query, setQuery] = useState("");
  const search = useDebounce(query.trim());
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [selected, setSelected] = useWorkoutDraft();

  const { data: facets } = useQuery({
    queryKey: ["exercise-facets"],
    queryFn: fetchExerciseFacets,
    staleTime: Infinity,
  });
  const { data: items = [], isError, isPending, refetch } = useQuery({
    queryKey: ["exercises", search, muscle, equipment, difficulty],
    queryFn: () =>
      fetchExercises({
        search: search || undefined,
        muscle: muscle ?? undefined,
        equipment: equipment ?? undefined,
        difficulty: difficulty ?? undefined,
      }),
  });

  const toggle = (exercise: ExerciseListItem) =>
    setSelected((prev) =>
      prev.some((e) => e.id === exercise.id)
        ? prev.filter((e) => e.id !== exercise.id)
        : [...prev, { ...exercise, ...DEFAULT_PRESCRIPTION }],
    );

  return (
    <Screen>
      <FlatList
        contentContainerClassName="px-5 pb-8"
        data={items}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View className="h-14 flex-row items-center justify-between">
              <Pressable
                accessibilityLabel="Back to composer"
                className="-ml-2 h-11 w-11 items-center justify-center"
                onPress={router.back}
              >
                <Feather color={mutedFg} name="arrow-left" size={22} />
              </Pressable>
              <Text className="font-bold text-[17px] text-foreground">Add Exercises</Text>
              <Pressable
                accessibilityLabel="Done selecting"
                className="h-11 min-w-11 items-end justify-center"
                onPress={router.back}
              >
                <Text className="font-semibold text-[13px] text-primary">Done</Text>
              </Pressable>
            </View>
            <View className="mb-2 mt-1 h-12 flex-row items-center rounded-2xl bg-muted px-4">
              <Feather color={mutedFg} name="search" size={18} />
              <TextInput
                accessibilityLabel="Search exercises"
                className="ml-3 flex-1 font-sans text-[13px] text-foreground"
                onChangeText={setQuery}
                placeholder="Search exercises..."
                placeholderTextColor={mutedFg}
                selectionColor={primary}
                value={query}
              />
            </View>
            <FilterChips label="Muscle" onSelect={setMuscle} options={facets?.muscles ?? []} selected={muscle} />
            <FilterChips label="Equipment" onSelect={setEquipment} options={facets?.equipment ?? []} selected={equipment} />
            <FilterChips label="Difficulty" onSelect={setDifficulty} options={facets?.difficulties ?? []} selected={difficulty} />
            <Text className="mb-2 mt-1 font-sans text-[12px] text-muted-foreground">
              {selected.length} selected
            </Text>
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <View className="gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton className="h-16 rounded-2xl" key={i} />
              ))}
            </View>
          ) : isError ? (
            <EmptyState icon="wifi-off" title="Could not load exercises" onRetry={refetch} />
          ) : (
            <EmptyState icon="search" title="No exercises match" />
          )
        }
        renderItem={({ item }) => {
          const isSelected = selected.some((e) => e.id === item.id);
          return (
            <View className="min-h-16 flex-row items-center border-b border-border">
              <TouchableOpacity
                className="flex-1 flex-row items-center py-2"
                onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: item.id } })}
              >
                {item.image ? (
                  <Image className="h-12 w-14 rounded-xl bg-muted" resizeMode="cover" source={{ uri: item.image }} />
                ) : (
                  <View className="h-12 w-14 items-center justify-center rounded-xl bg-muted">
                    <Feather color={mutedFg} name="image" size={16} />
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-[13px] text-foreground" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 font-sans capitalize text-[11.5px] text-muted-foreground" numberOfLines={1}>
                    {item.muscles}
                  </Text>
                </View>
              </TouchableOpacity>
              <Pressable
                accessibilityLabel={isSelected ? `Remove ${item.name}` : `Add ${item.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                className="h-12 w-12 items-end justify-center"
                onPress={() => toggle(item)}
              >
                <Feather
                  color={isSelected ? primary : mutedFg}
                  name={isSelected ? "check-circle" : "circle"}
                  size={22}
                />
              </Pressable>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
