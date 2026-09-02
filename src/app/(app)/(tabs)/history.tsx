import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { isSameDay, startOfDay } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, Text, TouchableOpacity, View } from "react-native";

import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import WeekStrip from "@/components/week-strip";
import { fetchRuns, fetchSessions, type RunItem, type SessionListItem } from "@/lib/api";
import { formatDuration, formatSessionDate } from "@/lib/format";
import { useToken } from "@/theme/use-token";

export default function HistoryTab() {
  const router = useRouter();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");
  const [filterDay, setFilterDay] = useState<Date | null>(null);

  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useInfiniteQuery({
      queryKey: ["sessions"],
      queryFn: ({ pageParam }) => fetchSessions({ cursor: pageParam ?? undefined }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });
  const sessions = data?.pages.flatMap((page) => page.items) ?? [];
  const { data: runData, fetchNextPage: fetchMoreRuns, hasNextPage: moreRuns } = useInfiniteQuery({
    queryKey: ["runs"],
    queryFn: ({ pageParam }) => fetchRuns({ cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  const runItems = runData?.pages.flatMap((page) => page.items) ?? [];

  type FeedRow =
    | { kind: "workout"; completedAt: string; item: SessionListItem }
    | { kind: "run"; completedAt: string; item: RunItem };
  const feed: FeedRow[] = [
    ...sessions.map((item) => ({ kind: "workout" as const, completedAt: item.completedAt, item })),
    ...runItems.map((item) => ({ kind: "run" as const, completedAt: item.completedAt, item })),
  ].sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const visible = filterDay
    ? feed.filter((row) => isSameDay(new Date(row.completedAt), filterDay))
    : feed;
  const totalSeconds = visible.reduce(
    (sum, row) => sum + row.item.durationSeconds,
    0,
  );

  return (
    <Screen>
      <FlatList
        contentContainerClassName="px-5 pb-28"
        data={isPending ? [] : visible}
        ItemSeparatorComponent={() => <View className="h-3" />}
        keyExtractor={(row) => `${row.kind}:${row.item.id}`}
        ListHeaderComponent={
          <View>
            <Text className="pt-3 font-bold text-2xl tracking-tight text-foreground">History</Text>
            <WeekStrip
              markedDates={feed.map((row) => new Date(row.completedAt))}
              onChange={setFilterDay}
              value={filterDay ?? startOfDay(new Date())}
            />
            <View className="my-4 flex-row gap-3">
              {isPending ? (
                <>
                  <Skeleton className="h-[76px] flex-1 rounded-2xl" />
                  <Skeleton className="h-[76px] flex-1 rounded-2xl" />
                </>
              ) : (
                <>
                  <Summary label="Sessions" value={String(visible.length)} />
                  <Summary label="Total time" value={formatDuration(totalSeconds)} />
                </>
              )}
            </View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-bold text-[15px] text-foreground">
                {filterDay ? "That day" : "All sessions"}
              </Text>
              {filterDay ? (
                <Pressable
                  accessibilityRole="button"
                  className="rounded-full border border-border bg-card px-3 py-1.5 active:bg-muted"
                  onPress={() => setFilterDay(null)}
                >
                  <Text className="font-medium text-[11px] text-primary">Show all</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <View className="gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton className="h-[88px] rounded-2xl" key={i} />
              ))}
            </View>
          ) : isError ? (
            <EmptyState icon="wifi-off" title="Could not load history" onRetry={refetch} />
          ) : (
            <EmptyState
              icon="calendar"
              title={filterDay ? "No sessions that day" : "No sessions yet"}
              body={filterDay ? undefined : "Finish a workout and it lands here."}
            />
          )
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          if (moreRuns) fetchMoreRuns();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? <Skeleton className="mt-3 h-[88px] rounded-2xl" /> : null
        }
        renderItem={({ item: row }) =>
          row.kind === "run" ? (
            <View className="flex-row items-center rounded-2xl border border-border bg-card p-3">
              <View className="h-16 w-20 items-center justify-center rounded-xl bg-accent dark:bg-accent/20">
                <Feather color={primary} name="wind" size={20} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-[14px] text-foreground">
                  Run · {(row.item.distanceMeters / 1000).toFixed(row.item.distanceMeters % 1000 === 0 ? 0 : 1)} km
                </Text>
                <Text className="mt-0.5 font-sans text-[11.5px] text-muted-foreground">
                  {formatSessionDate(row.item.completedAt)}
                </Text>
                <Text className="mt-0.5 font-sans text-[11.5px] text-muted-foreground">
                  {formatDuration(row.item.durationSeconds)} · {formatPace(row.item)} /km
                  {row.item.note ? ` · ${row.item.note}` : ""}
                </Text>
              </View>
            </View>
          ) : (
          <TouchableOpacity
            className="flex-row items-center rounded-2xl border border-border bg-card p-3 active:bg-muted"
            onPress={() => router.push({ pathname: "/session/[id]", params: { id: row.item.id } })}
          >
            {row.item.image ? (
              <Image className="h-16 w-20 rounded-xl bg-muted" resizeMode="cover" source={{ uri: row.item.image }} />
            ) : (
              <View className="h-16 w-20 items-center justify-center rounded-xl bg-muted">
                <Feather color={mutedFg} name="image" size={18} />
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-[14px] text-foreground">{row.item.workoutName}</Text>
              <Text className="mt-0.5 font-sans text-[11.5px] text-muted-foreground">
                {formatSessionDate(row.item.completedAt)}
              </Text>
              <Text className="mt-0.5 font-sans text-[11.5px] text-muted-foreground">
                {row.item.exerciseCount} exercises · {row.item.setCount} sets · {formatDuration(row.item.durationSeconds)}
              </Text>
            </View>
            <Feather color={mutedFg} name="chevron-right" size={19} />
          </TouchableOpacity>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function formatPace(run: RunItem) {
  const secPerKm = run.durationSeconds / (run.distanceMeters / 1000);
  return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")}`;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-card p-3.5">
      <Text className="font-sans text-[11.5px] text-muted-foreground">{label}</Text>
      <Text className="mt-1.5 font-bold text-[19px] text-foreground">{value}</Text>
    </View>
  );
}
