import { forwardRef, type ComponentRef, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

import { cx } from "@/lib/cx";
import { useToken } from "@/theme/use-token";

const styles = {
  solid: { root: "bg-primary border-primary active:bg-primary-hover", label: "text-primary-foreground" },
  outline: { root: "bg-card border-border active:bg-muted", label: "text-foreground" },
  ghost: { root: "bg-transparent border-transparent active:bg-muted", label: "text-foreground" },
  danger: { root: "bg-destructive border-destructive active:opacity-90", label: "text-destructive-foreground" },
} as const;

type Props = PressableProps & {
  children: ReactNode;
  variant?: keyof typeof styles;
  size?: "md" | "sm";
  busy?: boolean;
  before?: ReactNode;
  after?: ReactNode;
};

const Button = forwardRef<ComponentRef<typeof Pressable>, Props>(function Button(
  { children, className, disabled, variant = "solid", size = "md", busy, before, after, ...rest },
  ref,
) {
  const spinner = useToken(variant === "solid" ? "primaryFg" : "fg");
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) || Boolean(busy), busy: Boolean(busy) }}
      className={cx(
        "flex-row items-center justify-center gap-2 rounded-2xl border px-5",
        size === "sm" ? "h-11" : "h-14",
        styles[variant].root,
        disabled && "opacity-50",
        className,
      )}
      disabled={Boolean(disabled) || busy}
      {...rest}
    >
      {busy ? <ActivityIndicator color={spinner} /> : before}
      <Text
        className={cx(
          "font-semibold",
          size === "sm" ? "text-[13px]" : "text-[15px]",
          styles[variant].label,
        )}
      >
        {children}
      </Text>
      {after}
    </Pressable>
  );
});

export default Button;
