import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import Button from "@/components/ui/button";
import { useToken } from "@/theme/use-token";

type Props = {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  body?: string;
  onRetry?: () => void;
};

/** Shared empty / error state. Pass onRetry to render a retry action. */
export default function EmptyState({ icon = "inbox", title, body, onRetry }: Props) {
  const mutedFg = useToken("mutedFg");
  return (
    <View className="items-center px-8 py-14">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Feather color={mutedFg} name={icon} size={24} />
      </View>
      <Text className="mt-4 text-center font-semibold text-[15px] text-foreground">{title}</Text>
      {body ? (
        <Text className="mt-1.5 text-center font-sans text-[13px] leading-5 text-muted-foreground">
          {body}
        </Text>
      ) : null}
      {onRetry ? (
        <Button className="mt-5" onPress={onRetry} size="sm" variant="outline">
          Try again
        </Button>
      ) : null}
    </View>
  );
}
