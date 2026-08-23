import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import { importWorkout } from "@/lib/api";
import { useToken } from "@/theme/use-token";

/** Deep-link target: repcard://import/[slug]. Clones and jumps to the workout. */
export default function ImportShared() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const primary = useToken("primary");

  const importer = useMutation({
    mutationFn: () => importWorkout(slug),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.replace({ pathname: "/workout/[id]", params: { id: created.id } });
    },
  });

  useEffect(() => {
    if (slug) importer.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per slug
  }, [slug]);

  return (
    <Screen className="items-center justify-center px-8">
      {importer.isError ? (
        <>
          <Feather color={primary} name="link" size={30} />
          <Text className="mt-4 text-center font-bold text-[18px] text-foreground">
            Could not import this workout
          </Text>
          <Text className="mt-2 text-center font-sans text-[13px] text-muted-foreground">
            The link may have expired or the workout was deleted.
          </Text>
          <Button className="mt-6" onPress={() => router.replace("/(app)/(tabs)")} size="sm">
            Go home
          </Button>
        </>
      ) : (
        <>
          <ActivityIndicator color={primary} size="large" />
          <Text className="mt-4 font-medium text-[14px] text-muted-foreground">
            Adding this workout to your library...
          </Text>
        </>
      )}
    </Screen>
  );
}
