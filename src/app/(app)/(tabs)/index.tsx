import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { addDays, addWeeks, startOfDay, startOfWeek, subWeeks } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import WeekStrip from "@/components/week-strip";
import { useStreak } from "@/features/streak/streak-context";
import { fetchCalendarDates, fetchDayStats, fetchSessions, fetchWorkouts } from "@/lib/api";
import { formatDuration, formatSessionDate } from "@/lib/format";
import { useToken } from "@/theme/use-token";

export default function HomeTab() {
  const router = useRouter();
  const streak = useStreak();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");
  const [day, setDay] = useState(() => startOfDay(new Date()));

  const calendarStart = subWeeks(startOfWeek(new Date()), 3);
  const calendarEnd = addWeeks(startOfWeek(new Date()), 1);

  const { data: stats, isPending: statsPending } = useQuery({
    queryKey: ["day-stats", day.toISOString()],
    queryFn: () => fetchDayStats(day, addDays(day, 1)),
  });
  const { data: calendar } = useQuery({
    queryKey: ["calendar", calendarStart.toISOString()],
    queryFn: () => fetchCalendarDates(calendarStart, calendarEnd),
  });
  const { data: workouts = [], isPending: workoutsPending } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
  });
  const { data: recent } = useQuery({
    queryKey: ["sessions", "recent"],
    queryFn: () => fetchSessions({ limit: 1 }),
  });

  const statCards = [
    { label: "Sessions", value: String(stats?.sessions ?? 0), icon: "activity" },
    { label: "Time", value: formatDuration(stats?.totalSeconds ?? 0), icon: "clock" },
    { label: "Avg", value: formatDuration(stats?.averageSeconds ?? 0), icon: "bar-chart-2" },
  ] as const;

  const lastSession = recent?.items[0];

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-5 pb-28 pt-2" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between">
          <Text accessibilityRole="header" className="font-bold text-[22px] tracking-tight text-foreground">
            RepCard
          </Text>
          <Pressable
            accessibilityLabel={`Streak: ${streak.current} days`}
            className="h-10 flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3.5 active:bg-muted"
            onPress={streak.show}
          >
            <Feather color={primary} name="zap" size={15} />
            <Text className="font-bold text-[14px] text-foreground">{streak.current}</Text>
          </Pressable>
        </View>

        <WeekStrip
          markedDates={(calendar?.dates ?? []).map((d) => new Date(d))}
          onChange={setDay}
          value={day}
        />

        <View className="mt-3 flex-row gap-2">
          {statCards.map((card) =>
            statsPending ? (
              <Skeleton className="h-[104px] flex-1 rounded-2xl" key={card.label} />
            ) : (
              <View className="min-h-[104px] flex-1 rounded-2xl border border-border bg-card px-3 py-3.5" key={card.label}>
                <Text adjustsFontSizeToFit className="font-bold text-[18px] tracking-tight text-foreground" numberOfLines={1}>
                  {card.value}
                </Text>
                <Text className="mt-0.5 font-sans text-[11px] text-muted-foreground">{card.label}</Text>
                <View className="mt-auto h-7 w-7 items-center justify-center rounded-full bg-accent dark:bg-accent/20">
                  <Feather color={primary} name={card.icon} size={14} />
                </View>
              </View>
            ),
          )}
        </View>

        <SectionHeader onMore={() => router.push("/workouts")} title="My Workouts" />
        {workoutsPending ? (
          <View className="flex-row gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton className="h-40 flex-1 rounded-2xl" key={i} />
            ))}
          </View>
        ) : workouts.length === 0 ? (
          <Pressable
            className="items-center rounded-2xl border border-dashed border-border bg-card py-8 active:bg-muted"
            onPress={() => router.push("/workout/compose")}
          >
            <Feather color={mutedFg} name="plus-circle" size={22} />
            <Text className="mt-2 font-medium text-[13px] text-muted-foreground">
              Build your first workout
            </Text>
          </Pressable>
        ) : (
          <ScrollView className="-mx-5" contentContainerClassName="gap-2 px-5" horizontal showsHorizontalScrollIndicator={false}>
            {workouts.slice(0, 6).map((workout) => (
              <TouchableOpacity
                className="w-36 overflow-hidden rounded-2xl border border-border bg-card"
                key={workout.id}
                onPress={() => router.push({ pathname: "/workout/[id]", params: { id: workout.id } })}
              >
                {workout.image ? (
                  <Image className="h-20 w-full bg-muted" resizeMode="cover" source={{ uri: workout.image }} />
                ) : (
                  <View className="h-20 items-center justify-center bg-muted">
                    <Feather color={mutedFg} name="image" size={18} />
                  </View>
                )}
                <View className="p-2.5">
                  <Text className="font-semibold text-[13px] text-foreground" numberOfLines={1}>
                    {workout.name}
                  </Text>
                  <Text className="mt-1 font-sans text-[10.5px] text-muted-foreground">
                    {workout.exerciseCount} exercises · {workout.totalSets} sets
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <SectionHeader onMore={() => router.push("/history")} title="Last Session" />
        {!lastSession ? (
          <View className="items-center rounded-2xl border border-border bg-card py-7">
            <Feather color={mutedFg} name="clock" size={20} />
            <Text className="mt-2 font-sans text-[12.5px] text-muted-foreground">
              Your first session will land here.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-row items-center rounded-2xl border border-border bg-card p-3"
            onPress={() => router.push({ pathname: "/session/[id]", params: { id: lastSession.id } })}
          >
            {lastSession.image ? (
              <Image className="h-16 w-20 rounded-xl bg-muted" resizeMode="cover" source={{ uri: lastSession.image }} />
            ) : (
              <View className="h-16 w-20 items-center justify-center rounded-xl bg-muted">
                <Feather color={mutedFg} name="image" size={18} />
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-[14px] text-foreground">{lastSession.workoutName}</Text>
              <Text className="mt-0.5 font-sans text-[11.5px] text-muted-foreground">
                {formatSessionDate(lastSession.completedAt)}
              </Text>
              <Text className="mt-0.5 font-sans text-[11.5px] text-muted-foreground">
                {lastSession.exerciseCount} exercises · {lastSession.setCount} sets ·{" "}
                {formatDuration(lastSession.durationSeconds)}
              </Text>
            </View>
            <Feather color={mutedFg} name="chevron-right" size={19} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ onMore, title }: { onMore?: () => void; title: string }) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="font-bold text-[16px] text-foreground">{title}</Text>
      {onMore ? (
        <Pressable className="min-h-9 justify-center" onPress={onMore}>
          <Text className="font-medium text-[12px] text-primary">See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
