import { Text } from "react-native";

import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";

export default function CardTab() {
  return (
    <Screen className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Card</Text>
      <EmptyState icon="tool" title="Coming in its feature PR" />
    </Screen>
  );
}
