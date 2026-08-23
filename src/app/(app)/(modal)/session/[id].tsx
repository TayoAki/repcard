import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import { fetchProfile, fetchSessionDetail } from "@/lib/api";
import { displayVolume, displayWeight, formatDuration, formatSessionDate } from "@/lib/format";
import { useToken } from "@/theme/use-token";

/** Box score for one session, in the athlete's preferred weight unit. */
export default function SessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mutedFg = useToken("mutedFg");

  const { data, isError, isPending, refetch } = useQuery({
    enabled: Boolean(id),
    queryKey: ["sessions", id],
    queryFn: () => fetchSessionDetail(id),
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const unit = profile?.weightUnit ?? "kg";

  if (isPending) {
    return (
      <Screen className="px-5">
        <Skeleton className="mt-5 h-7 w-2/3" />
        <Skeleton className="mt-2 h-4 w-40" />
        <View className="mt-5 flex-row gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-20 flex-1 rounded-2xl" key={i} />
          ))}
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen className="px-5">
        <EmptyState icon="wifi-off" title="Could not load this session" onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <View className="h-14 flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Go back"
            className="-ml-2 h-11 w-11 items-center justify-center"
            onPress={router.back}
          >
            <Feather color={mutedFg} name="arrow-left" size={22} />
          </Pressable>
        </View>

        <Text className="font-bold text-[24px] tracking-tight text-foreground">{data.workoutName}</Text>
        <Text className="mt-1 font-sans text-[12px] text-muted-foreground">
          {formatSessionDate(data.completedAt)}
        </Text>

        <View className="my-5 flex-row gap-2">
          <Stat label="Duration" value={formatDuration(data.durationSeconds)} />
          <Stat label="Sets" value={String(data.setCount)} />
          <Stat label="Volume" value={data.volumeKg !== null ? displayVolume(data.volumeKg, unit) : "—"} />
        </View>

        <Text className="mb-3 font-bold text-[15px] text-foreground">Box score</Text>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          {data.exercises.map((exercise) => (
            <View
              className="min-h-20 flex-row items-center border-b border-border px-3 py-2.5 last:border-b-0"
              key={exercise.id}
            >
              {exercise.image ? (
                <Image className="h-11 w-12 rounded-xl bg-muted" resizeMode="cover" source={{ uri: exercise.image }} />
              ) : (
                <View className="h-11 w-12 items-center justify-center rounded-xl bg-muted">
                  <Feather color={mutedFg} name="image" size={15} />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-[13px] text-foreground">{exercise.name}</Text>
                <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                  {exercise.sets.map((set, i) => (
                    <View className="rounded-lg bg-muted px-2 py-1" key={i}>
                      <Text className="font-sans text-[10.5px] text-muted-foreground">
                        {set.weight !== null ? `${displayWeight(set.weight, unit)} × ` : ""}
                        {set.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        {data.workoutId !== null ? (
          <Button
            before={<Feather color="#052E22" name="repeat" size={15} />}
            className="mt-6"
            onPress={() =>
              router.push({ pathname: "/workout/[id]/live", params: { id: data.workoutId! } })
            }
            size="sm"
          >
            Run it back
          </Button>
        ) : (
          <Text className="mt-6 text-center font-sans text-[12px] text-muted-foreground">
            The workout behind this session was deleted - the record stays.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-border bg-card px-2 py-3.5">
      <Text className="font-sans text-[11px] text-muted-foreground">{label}</Text>
      <Text className="mt-1.5 font-bold text-[14px] text-foreground">{value}</Text>
    </View>
  );
}
