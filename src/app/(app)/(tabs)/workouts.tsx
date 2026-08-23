import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";

import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import { fetchWorkouts } from "@/lib/api";
import { useToken } from "@/theme/use-token";

export default function WorkoutsTab() {
  const router = useRouter();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");
  const [query, setQuery] = useState("");

  const { data: workouts = [], isError, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
  });

  const search = query.trim().toLowerCase();
  const visible = search
    ? workouts.filter(
        (w) => w.name.toLowerCase().includes(search) || w.muscles.toLowerCase().includes(search),
      )
    : workouts;

  return (
    <Screen>
      <FlatList
        contentContainerClassName="px-5 pb-28"
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="pb-4 pt-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-2xl tracking-tight text-foreground">Workouts</Text>
              <Pressable
                accessibilityLabel="Browse exercise library"
                className="h-10 flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3.5 active:bg-muted"
                onPress={() => router.push("/exercise")}
              >
                <Feather color={mutedFg} name="book-open" size={14} />
                <Text className="font-medium text-[12px] text-muted-foreground">Library</Text>
              </Pressable>
            </View>
            <View className="mt-4 h-12 flex-row items-center rounded-2xl border border-input-border bg-muted px-4">
              <Feather color={mutedFg} name="search" size={18} />
              <TextInput
                accessibilityLabel="Search workouts"
                className="ml-3 flex-1 font-sans text-[13px] text-foreground"
                onChangeText={setQuery}
                placeholder="Search workouts..."
                placeholderTextColor={mutedFg}
                returnKeyType="search"
                selectionColor={primary}
                value={query}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <View className="gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton className="h-24 rounded-2xl" key={i} />
              ))}
            </View>
          ) : isError ? (
            <EmptyState icon="wifi-off" title="Could not load workouts" onRetry={refetch} />
          ) : search ? (
            <EmptyState icon="search" title={`Nothing matches “${search}”`} />
          ) : (
            <EmptyState
              icon="clipboard"
              title="No workouts yet"
              body="Tap the + button to build your first one."
            />
          )
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center rounded-2xl border border-border bg-card p-3 active:bg-muted"
            onPress={() => router.push({ pathname: "/workout/[id]", params: { id: item.id } })}
          >
            {item.image ? (
              <Image className="h-[72px] w-[84px] rounded-xl bg-muted" resizeMode="cover" source={{ uri: item.image }} />
            ) : (
              <View className="h-[72px] w-[84px] items-center justify-center rounded-xl bg-muted">
                <Feather color={mutedFg} name="image" size={20} />
              </View>
            )}
            <View className="ml-3 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold text-[15px] text-foreground" numberOfLines={1}>
                  {item.name}
                </Text>
                {item.source === "ai_plan" ? (
                  <View className="rounded-full bg-accent px-2 py-0.5 dark:bg-accent/20">
                    <Text className="font-semibold text-[9px] text-primary">AI</Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-1 font-sans capitalize text-[11.5px] text-muted-foreground" numberOfLines={1}>
                {item.muscles || "No exercises yet"}
              </Text>
              <Text className="mt-1.5 font-sans text-[11.5px] text-muted-foreground">
                {item.exerciseCount} exercises · {item.totalSets} sets
              </Text>
            </View>
            <Feather color={mutedFg} name="chevron-right" size={19} />
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl colors={[primary]} onRefresh={() => refetch()} refreshing={isRefetching} tintColor={primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
