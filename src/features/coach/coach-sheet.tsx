import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Skeleton from "@/components/ui/skeleton";
import { fetchCoachCues } from "@/lib/api";
import { useToken } from "@/theme/use-token";

type Props = { exerciseId: string; exerciseName: string; visible: boolean; onClose: () => void };

/** Coach bottom sheet. Fetch is lazy - nothing runs until it opens. */
export default function CoachSheet({ exerciseId, exerciseName, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const primary = useToken("primary");

  const { data, isError, isPending, refetch } = useQuery({
    enabled: visible && Boolean(exerciseId),
    queryKey: ["coach", exerciseId],
    queryFn: () => fetchCoachCues(exerciseId),
    staleTime: Infinity, // cues don't change mid-session; cache per exercise
  });

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View className="flex-1 justify-end">
        <Pressable accessibilityLabel="Close coach" className="absolute inset-0 bg-overlay/60" onPress={onClose} />
        <View
          className="max-h-[84%] rounded-t-[28px] border-t border-border bg-card"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View className="items-center pt-3">
            <View className="h-1.5 w-11 rounded-full bg-border" />
          </View>
          <ScrollView contentContainerClassName="px-5 pb-4 pt-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent dark:bg-accent/20">
                <Feather color={primary} name="message-circle" size={20} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-[16px] text-foreground">Coach's cues</Text>
                <Text className="mt-0.5 font-sans text-[12px] text-muted-foreground" numberOfLines={1}>
                  {exerciseName}
                </Text>
              </View>
              {data ? (
                <View className="rounded-full bg-muted px-2.5 py-1">
                  <Text className="font-semibold text-[9px] uppercase tracking-wide text-muted-foreground">
                    {data.source === "ai" ? "AI" : "Manual"}
                  </Text>
                </View>
              ) : null}
            </View>

            {isPending ? (
              <View className="mt-5 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton className="h-10 w-full" key={i} />
                ))}
              </View>
            ) : isError ? (
              <View className="mt-5 items-center py-6">
                <Feather color={primary} name="wifi-off" size={22} />
                <Text className="mt-3 font-sans text-[13px] text-muted-foreground">
                  The coach is unreachable right now.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  className="mt-4 rounded-full border border-border bg-background px-4 py-2 active:opacity-70"
                  onPress={() => refetch()}
                >
                  <Text className="font-semibold text-[12px] text-primary">Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-5 gap-3.5">
                {(data?.cues ?? []).map((cue, index) => (
                  <View className="flex-row gap-3" key={index}>
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-accent dark:bg-accent/20">
                      <Text className="font-semibold text-[11px] text-primary">{index + 1}</Text>
                    </View>
                    <Text className="flex-1 font-sans text-[13.5px] leading-5 text-foreground">{cue}</Text>
                  </View>
                ))}
                {data?.mistake ? (
                  <View className="mt-1 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5">
                    <Text className="font-semibold text-[11px] uppercase tracking-wide text-destructive">
                      Watch out
                    </Text>
                    <Text className="mt-1 font-sans text-[13px] leading-5 text-foreground">{data.mistake}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
