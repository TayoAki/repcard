import {
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useRef } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { cx } from "@/lib/cx";

type Props = {
  markedDates?: Date[];
  value: Date;
  onChange: (date: Date) => void;
  weeksBack?: number;
};

/** Paged horizontal week strip; dot = trained day, future days disabled. */
export default function WeekStrip({ markedDates = [], value, onChange, weeksBack = 3 }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const today = startOfDay(new Date());

  const weeks = eachWeekOfInterval({
    start: subWeeks(startOfWeek(today), weeksBack),
    end: endOfWeek(today),
  }).map((weekStart) => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) }));

  return (
    <ScrollView
      className="-mx-5 mt-4 flex-grow-0"
      horizontal
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      pagingEnabled
      ref={scrollRef}
      showsHorizontalScrollIndicator={false}
    >
      {weeks.map((week) => (
        <View className="flex-row gap-1.5 px-5" key={week[0].getTime()} style={{ width }}>
          {week.map((day) => {
            const selected = isSameDay(day, value);
            const future = isAfter(day, today);
            const trained = markedDates.some((d) => isSameDay(d, day));
            return (
              <Pressable
                accessibilityLabel={format(day, "EEEE, MMMM d")}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: future }}
                className={cx(
                  "h-20 flex-1 items-center justify-center rounded-2xl border",
                  selected ? "border-primary bg-card" : "border-border bg-background",
                  future && "opacity-40",
                )}
                disabled={future}
                key={day.getTime()}
                onPress={() => onChange(day)}
              >
                <Text className="font-medium text-[10px] text-muted-foreground">
                  {format(day, "EE").toUpperCase()}
                </Text>
                <Text className="mt-1.5 font-bold text-[15px] text-foreground">{format(day, "d")}</Text>
                <View
                  className={cx(
                    "mt-1.5 h-1.5 w-1.5 rounded-full",
                    trained ? "bg-primary" : isSameDay(day, today) ? "bg-border" : "bg-transparent",
                  )}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
