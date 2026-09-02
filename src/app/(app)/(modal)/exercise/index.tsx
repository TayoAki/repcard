import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";

import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { fetchExercises } from "@/lib/api";
import { useToken } from "@/theme/use-token";

/** Browse the global catalog. Server-side search, debounced per settled term. */
export default function ExerciseLibrary() {
  const router = useRouter();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");
  const [query, setQuery] = useState("");
  const search = useDebounce(query.trim());

  const { data: items = [], isError, isPending, refetch } = useQuery({
    queryKey: ["exercises", search],
    queryFn: () => fetchExercises({ search: search || undefined }),
  });

  return (
    <Screen>
      <FlatList
        contentContainerClassName="px-5 pb-8"
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View className="h-14 flex-row items-center justify-between">
              <Pressable
                accessibilityLabel="Close library"
                accessibilityRole="button"
                className="-ml-2 h-11 w-11 items-center justify-center"
                onPress={router.back}
              >
                <Feather color={mutedFg} name="x" size={22} />
              </Pressable>
              <Text className="font-bold text-[17px] text-foreground">Exercise Library</Text>
              <View className="w-9" />
            </View>
            <View className="mb-4 mt-1 h-12 flex-row items-center rounded-2xl bg-muted px-4">
              <Feather color={mutedFg} name="search" size={18} />
              <TextInput
                accessibilityLabel="Search exercises"
                className="ml-3 flex-1 font-sans text-[13px] text-foreground"
                onChangeText={setQuery}
                placeholder="Search by name or muscle..."
                placeholderTextColor={mutedFg}
                returnKeyType="search"
                selectionColor={primary}
                value={query}
              />
              {query ? (
                <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")}>
                  <Feather color={mutedFg} name="x-circle" size={16} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <View className="gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton className="h-[68px] rounded-2xl" key={i} />
              ))}
            </View>
          ) : isError ? (
            <EmptyState icon="wifi-off" title="Could not load exercises" onRetry={refetch} />
          ) : (
            <EmptyState
              icon="search"
              title={search ? `Nothing matches “${search}”` : "No exercises found"}
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mb-2.5 flex-row items-center rounded-2xl border border-border bg-card p-3 active:bg-muted"
            onPress={() =>
              router.push({ pathname: "/exercise/[id]", params: { id: item.id } })
            }
          >
            {item.image ? (
              <Image className="h-14 w-16 rounded-xl bg-muted" resizeMode="cover" source={{ uri: item.image }} />
            ) : (
              <View className="h-14 w-16 items-center justify-center rounded-xl bg-muted">
                <Feather color={mutedFg} name="image" size={18} />
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-[14px] text-foreground" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="mt-1 font-sans capitalize text-[12px] text-muted-foreground" numberOfLines={1}>
                {item.muscles} · {item.difficulty}
              </Text>
            </View>
            <Feather color={mutedFg} name="chevron-right" size={19} />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
