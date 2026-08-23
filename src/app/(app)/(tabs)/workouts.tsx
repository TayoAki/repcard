import { Text } from "react-native";
import { useRouter } from "expo-router";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";

export default function WorkoutsTab() {
  const router = useRouter();
  return (
    <Screen className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Workouts</Text>
      <EmptyState icon="tool" title="Workout builder lands in its feature PR" />
      <Button onPress={() => router.push("/exercise")} variant="outline">
        Browse Exercise Library
      </Button>
    </Screen>
  );
}
