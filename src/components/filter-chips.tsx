import { ScrollView, Pressable, Text } from "react-native";

import { cx } from "@/lib/cx";

type Props = {
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  label: string;
};

/** One horizontal row of toggle chips; tapping the active chip clears it. */
export default function FilterChips({ options, selected, onSelect, label }: Props) {
  if (options.length === 0) return null;
  return (
    <ScrollView
      accessibilityLabel={`${label} filters`}
      className="-mx-5 flex-grow-0"
      contentContainerClassName="gap-2 px-5 py-1"
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => {
        const active = selected === option;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cx(
              "rounded-full border px-3.5 py-1.5",
              active ? "border-primary bg-primary" : "border-border bg-card",
            )}
            key={option}
            onPress={() => onSelect(active ? null : option)}
          >
            <Text
              className={cx(
                "font-medium capitalize text-[12px]",
                active ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
