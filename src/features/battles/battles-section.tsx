import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Share, Text, TextInput, View } from "react-native";

import Button from "@/components/ui/button";
import { createBattle, fetchBattles, joinBattle } from "@/lib/api";
import { registerForPush } from "@/lib/notifications";
import { useToken } from "@/theme/use-token";

/** Battles block on the Card tab: create, join by code, open head-to-head. */
export default function BattlesSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");
  const [code, setCode] = useState("");

  const { data: battles = [] } = useQuery({ queryKey: ["battles"], queryFn: fetchBattles });

  const create = useMutation({
    mutationFn: createBattle,
    onError: (error) => Alert.alert("Could not create battle", error.message),
    onSuccess: async (battle) => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      registerForPush();
      await Share.share({
        message: `Streak battle. 7 days. Me vs you. Join with code ${battle.code} on RepCard.`,
      });
    },
  });

  const join = useMutation({
    mutationFn: () => joinBattle(code.trim().toUpperCase()),
    onError: (error) => Alert.alert("Could not join", error.message),
    onSuccess: (result) => {
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      registerForPush();
      router.push({ pathname: "/battle/[id]", params: { id: result.id } });
    },
  });

  const statusCopy = { pending: "Waiting for a rival", active: "LIVE", finished: "Finished" } as const;

  return (
    <View className="mt-8">
      <Text className="mb-2 font-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
        Streak battles
      </Text>

      {battles.length > 0 ? (
        <View className="mb-3 gap-2">
          {battles.map((battle) => (
            <Pressable
              className="flex-row items-center rounded-2xl border border-border bg-card p-3.5 active:bg-muted"
              key={battle.id}
              onPress={() => router.push({ pathname: "/battle/[id]", params: { id: battle.id } })}
            >
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent dark:bg-accent/20">
                <Feather color={primary} name="zap" size={16} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-[13px] text-foreground">Code {battle.code}</Text>
                <Text
                  className={`mt-0.5 font-medium text-[11px] ${battle.status === "active" ? "text-primary" : "text-muted-foreground"}`}
                >
                  {statusCopy[battle.status]}
                </Text>
              </View>
              <Feather color={mutedFg} name="chevron-right" size={17} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="rounded-2xl border border-border bg-card p-4">
        <Button busy={create.isPending} onPress={() => create.mutate()} size="sm">
          Challenge a friend
        </Button>
        <View className="mt-3 flex-row gap-2">
          <TextInput
            accessibilityLabel="Battle invite code"
            autoCapitalize="characters"
            className="h-11 flex-1 rounded-xl border border-input-border bg-input px-3 text-center font-semibold text-[14px] tracking-[3px] text-foreground"
            maxLength={6}
            onChangeText={setCode}
            placeholder="CODE"
            placeholderTextColor={mutedFg}
            value={code}
          />
          <Button
            busy={join.isPending}
            disabled={code.trim().length !== 6}
            onPress={() => join.mutate()}
            size="sm"
            variant="outline"
          >
            Join
          </Button>
        </View>
      </View>
    </View>
  );
}
