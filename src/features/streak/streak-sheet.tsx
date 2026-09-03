import { Feather } from "@expo/vector-icons";
import { eachDayOfInterval, endOfWeek, format, isAfter, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/components/ui/button";
import { enableReminders, remindersEnabled } from "@/features/streak/streak-reminder";
import { cx } from "@/lib/cx";
import { useToken } from "@/theme/use-token";
import { type StreakSummary } from "@/lib/streak";

type Props = { summary: StreakSummary; visible: boolean; onClose: () => void };

/** Bottom sheet: current streak, this week's grid, best streak, nudge copy. */
export default function StreakSheet({ summary, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const primary = useToken("primary");
  const today = startOfDay(new Date());
  const week = eachDayOfInterval({ start: startOfWeek(today), end: endOfWeek(today) });
  const trainedToday = summary.trainedDays.some((d) => isSameDay(d, today));
  const atRisk = summary.current > 0 && !trainedToday;

  // Reminder opt-in state: null while unknown, then granted/denied.
  const [reminderOn, setReminderOn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    remindersEnabled().then((on) => alive && setReminderOn(on));
    return () => {
      alive = false;
    };
  }, [visible]);
  const onEnableReminder = async () => {
    setReminderOn(await enableReminders(summary));
  };

  const nudge = trainedToday
    ? "Logged today. The card doesn't build itself - but today, you did."
    : summary.current > 0
      ? "Train today to keep the run alive."
      : "One session starts the streak.";

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityLabel="Close streak details"
          className="absolute inset-0 bg-overlay/60"
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          className="rounded-t-[30px] border-t border-border bg-card px-5 pt-12"
          style={{ paddingBottom: Math.max(insets.bottom, 18) + 10 }}
        >
          <View className="absolute -top-9 left-0 right-0 items-center">
            <View className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-card bg-background">
              <Image
                accessibilityLabel="Streak flame"
                className="h-12 w-12"
                resizeMode="contain"
                source={require("../../../assets/images/streak-flame.png")}
              />
            </View>
          </View>

          <Text className="text-center font-medium text-[13px] text-muted-foreground">Streak</Text>
          <Text className="mt-1 text-center font-bold text-[38px] tracking-tight text-foreground">
            {summary.current} {summary.current === 1 ? "day" : "days"}
          </Text>

          <View className="mt-6 flex-row gap-1.5">
            {week.map((day) => {
              const trained = summary.trainedDays.some((d) => isSameDay(d, day));
              const future = isAfter(day, today);
              return (
                <View
                  className={cx(
                    "h-[74px] flex-1 items-center justify-center rounded-2xl border bg-background",
                    isSameDay(day, today) ? "border-primary" : "border-border",
                    future && "opacity-40",
                  )}
                  key={day.getTime()}
                >
                  <Text className="font-semibold text-[10px] text-muted-foreground">
                    {format(day, "EE").toUpperCase()}
                  </Text>
                  {trained ? (
                    <View className="mt-1.5 h-7 w-7 items-center justify-center rounded-full bg-primary">
                      <Feather color="#052E22" name="check" size={15} />
                    </View>
                  ) : (
                    <Text className="mt-1.5 font-semibold text-[14px] text-foreground">
                      {format(day, "d")}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          <Text className="mt-6 text-center font-semibold text-[14px] text-foreground">
            Best: {summary.best} {summary.best === 1 ? "day" : "days"}
          </Text>

          {summary.freezesEarned > 0 ? (
            <View className="mt-3 flex-row items-center justify-center gap-1.5">
              <Feather color={primary} name="shield" size={13} />
              <Text className="font-medium text-[12px] text-muted-foreground">
                {summary.freezesEarned - summary.freezesUsed} rest-day{" "}
                {summary.freezesEarned - summary.freezesUsed === 1 ? "freeze" : "freezes"} banked
                {summary.freezesUsed > 0
                  ? ` · ${summary.freezesUsed} protecting your streak`
                  : ""}
              </Text>
            </View>
          ) : null}
          <Text className="mt-1.5 text-center font-sans text-[13px] leading-5 text-muted-foreground">
            {nudge}
          </Text>

          {atRisk && reminderOn === false ? (
            <Pressable
              accessibilityLabel="Remind me before my streak ends"
              accessibilityRole="button"
              className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 active:bg-muted"
              onPress={onEnableReminder}
            >
              <Feather color={primary} name="bell" size={15} />
              <Text className="font-semibold text-[13px] text-foreground">Remind me before it ends</Text>
            </Pressable>
          ) : atRisk && reminderOn === true ? (
            <View className="mt-4 flex-row items-center justify-center gap-1.5">
              <Feather color={primary} name="bell" size={12} />
              <Text className="font-medium text-[12px] text-muted-foreground">
                We&apos;ll nudge you this evening if you haven&apos;t trained
              </Text>
            </View>
          ) : null}

          <Button className="mt-6" onPress={onClose}>
            Keep going
          </Button>
        </View>
      </View>
    </Modal>
  );
}
