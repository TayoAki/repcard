import { Feather } from "@expo/vector-icons";
import { forwardRef, useState, type ComponentRef } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { cx } from "@/lib/cx";
import { useToken } from "@/theme/use-token";

type Props = TextInputProps & {
  label: string;
  error?: string;
  secure?: boolean; // renders a visibility toggle
};

/** Labeled input with error text; `secure` adds a show/hide password toggle. */
const Field = forwardRef<ComponentRef<typeof TextInput>, Props>(function Field(
  { label, error, secure, className, ...rest },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  const mutedFg = useToken("mutedFg");
  const fg = useToken("fg");

  return (
    <View className="gap-2">
      <Text className="font-medium text-[14px] text-foreground">{label}</Text>
      <View
        className={cx(
          "h-14 flex-row items-center rounded-2xl border bg-input px-4",
          error ? "border-destructive" : "border-input-border",
        )}
      >
        <TextInput
          ref={ref}
          className={cx("h-full flex-1 font-sans text-[14px] text-foreground", className)}
          placeholderTextColor={mutedFg}
          secureTextEntry={secure ? hidden : false}
          selectionColor={fg}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            accessibilityRole="button"
            className="-mr-2 h-11 w-11 items-center justify-center"
            onPress={() => setHidden((v) => !v)}
          >
            <Feather color={mutedFg} name={hidden ? "eye" : "eye-off"} size={20} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="font-sans text-[12px] text-destructive">{error}</Text> : null}
    </View>
  );
});

export default Field;
