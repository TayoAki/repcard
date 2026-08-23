import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { cx } from "@/lib/cx";
import { useToken } from "@/theme/use-token";

type Props = {
  icon: string;
  label: string;
  hint?: string;
  selected: boolean;
  delay?: number;
  onPress: () => void;
};

export default function OptionCard({ icon, label, hint, selected, delay = 0, onPress }: Props) {
  const primary = useToken("primary");
  const fg = useToken("fg");
  const primaryFg = useToken("primaryFg");

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(240)}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        className={cx(
          "min-h-20 flex-row items-center rounded-2xl border bg-card px-5 py-4",
          selected ? "border-primary" : "border-border",
        )}
        onPress={onPress}
      >
        <View className="w-9 items-center">
          <FontAwesome6 color={selected ? primary : fg} name={icon} size={22} />
        </View>
        <View className="ml-4 flex-1">
          <Text className={cx("font-semibold text-[15px]", selected ? "text-primary" : "text-foreground")}>
            {label}
          </Text>
          {hint ? <Text className="mt-0.5 font-sans text-[12px] text-muted-foreground">{hint}</Text> : null}
        </View>
        {selected ? (
          <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Feather color={primaryFg} name="check" size={14} />
          </View>
        ) : (
          <View className="h-6 w-6 rounded-full border-2 border-input-border" />
        )}
      </Pressable>
    </Animated.View>
  );
}
