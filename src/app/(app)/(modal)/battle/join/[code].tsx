import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import { joinBattle } from "@/lib/api";
import { registerForPush } from "@/lib/notifications";
import { useToken } from "@/theme/use-token";

/** Deep-link target: repcard://battle/join/[code]. Joins, then opens the VS. */
export default function JoinBattle() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { code } = useLocalSearchParams<{ code: string }>();
  const primary = useToken("primary");

  const join = useMutation({
    mutationFn: () => joinBattle((code ?? "").toUpperCase()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      registerForPush();
      router.replace({ pathname: "/battle/[id]", params: { id: result.id } });
    },
  });

  useEffect(() => {
    if (code) join.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per code
  }, [code]);

  return (
    <Screen className="items-center justify-center px-8">
      {join.isError ? (
        <>
          <Text className="text-center font-bold text-[18px] text-foreground">
            Could not join this battle
          </Text>
          <Text className="mt-2 text-center font-sans text-[13px] text-muted-foreground">
            The code may be wrong, already claimed, or your own.
          </Text>
          <Button className="mt-6" onPress={() => router.replace("/(app)/(tabs)")} size="sm">
            Go home
          </Button>
        </>
      ) : (
        <>
          <ActivityIndicator color={primary} size="large" />
          <Text className="mt-4 font-medium text-[14px] text-muted-foreground">
            Joining the battle...
          </Text>
        </>
      )}
    </Screen>
  );
}
