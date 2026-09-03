import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import {
  fetchLeaderboard,
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type LeaderboardRow,
} from "@/lib/api";
import { cx } from "@/lib/cx";
import { useToken } from "@/theme/use-token";

const METRICS: { key: LeaderboardMetric; label: string; fmt: (v: number) => string }[] = [
  { key: "sessions", label: "Sessions", fmt: (v) => String(v) },
  { key: "volume", label: "Volume", fmt: (v) => `${(v / 1000).toFixed(1)}t` },
  { key: "distance", label: "Distance", fmt: (v) => `${(v / 1000).toFixed(1)}km` },
];

export default function Leaderboard() {
  const router = useRouter();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");
  const [metric, setMetric] = useState<LeaderboardMetric>("sessions");
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");

  const { data, isError, isPending, refetch } = useQuery({
    queryKey: ["leaderboard", metric, period],
    queryFn: () => fetchLeaderboard(metric, period),
  });
  const fmt = METRICS.find((m) => m.key === metric)!.fmt;

  const outsideTop = data?.me && !data.rows.some((r) => r.isMe) ? data.me : null;

  return (
    <Screen>
      <FlatList
        contentContainerClassName="px-5 pb-28"
        data={isPending ? [] : (data?.rows ?? [])}
        keyExtractor={(r) => r.handle}
        ListHeaderComponent={
          <View className="pb-3">
            <View className="h-14 flex-row items-center justify-between">
              <Pressable
                accessibilityLabel="Close"
                className="-ml-2 h-11 w-11 items-center justify-center"
                onPress={router.back}
              >
                <Feather color={mutedFg} name="x" size={22} />
              </Pressable>
              <Text className="font-bold text-[17px] text-foreground">Leaderboard</Text>
              <View className="w-9" />
            </View>

            <View className="mt-1 flex-row gap-2">
              {METRICS.map((m) => (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: metric === m.key }}
                  className={cx(
                    "flex-1 items-center rounded-xl border py-2.5",
                    metric === m.key ? "border-primary bg-primary" : "border-border bg-card",
                  )}
                  onPress={() => setMetric(m.key)}
                >
                  <Text
                    className={cx(
                      "font-semibold text-[12px]",
                      metric === m.key ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-2 flex-row gap-2">
              {(["week", "all"] as const).map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityState={{ selected: period === p }}
                  className={cx(
                    "rounded-full border px-3.5 py-1.5",
                    period === p ? "border-primary bg-accent dark:bg-accent/20" : "border-border bg-card",
                  )}
                  onPress={() => setPeriod(p)}
                >
                  <Text
                    className={cx(
                      "font-medium text-[12px]",
                      period === p ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {p === "week" ? "This week" : "All time"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => <Rank row={item} value={fmt(item.value)} />}
        ListEmptyComponent={
          isPending ? (
            <View className="gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton className="h-14 rounded-xl" key={i} />
              ))}
            </View>
          ) : isError ? (
            <EmptyState icon="wifi-off" title="Could not load the leaderboard" onRetry={refetch} />
          ) : (
            <EmptyState
              icon="award"
              title="No one's on the board yet"
              body="Log training this week to claim a spot."
            />
          )
        }
        ListFooterComponent={
          outsideTop ? (
            <View className="mt-3 border-t border-border pt-3">
              <Rank row={outsideTop} value={fmt(outsideTop.value)} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );

  function Rank({ row, value }: { row: LeaderboardRow; value: string }) {
    const medal = row.rank <= 3;
    return (
      <View
        className={cx(
          "mb-2 flex-row items-center rounded-xl border p-3",
          row.isMe ? "border-primary bg-accent dark:bg-accent/20" : "border-border bg-card",
        )}
      >
        <Text
          className={cx(
            "w-8 font-bold text-[15px]",
            medal ? "text-primary" : "text-muted-foreground",
          )}
        >
          {row.rank}
        </Text>
        <View className="ml-1 flex-1">
          <Text className="font-semibold text-[14px] text-foreground" numberOfLines={1}>
            {row.name}
            {row.isMe ? " (you)" : ""}
          </Text>
          <Text className="font-sans text-[11.5px] text-muted-foreground">@{row.handle}</Text>
        </View>
        <Text className="font-bold text-[15px] text-foreground">{value}</Text>
      </View>
    );
  }
}
