import { useEffect } from "react";
import { type ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { cx } from "@/lib/cx";

/** Pulsing placeholder block. Size it with className. */
export default function Skeleton({ className, style, ...rest }: ViewProps & { className?: string }) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      className={cx("rounded-xl bg-muted", className)}
      style={[animated, style]}
      {...rest}
    />
  );
}
