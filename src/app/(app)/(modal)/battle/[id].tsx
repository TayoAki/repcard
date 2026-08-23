import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import { fetchBattle, type BattleFighter } from "@/lib/api";
import { cx } from "@/lib/cx";
import { useToken } from "@/theme/use-token";

/** Head-to-head. Sessions inside the battle window decide the lead. */
export default function BattleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mutedFg = useToken("mutedFg");

  const { data: battle, isError, isPending, refetch } = useQuery({
    enabled: Boolean(id),
    queryKey: ["battles", id],
    queryFn: () => fetchBattle(id),
  });

  if (isPending) {
    return (
      <Screen className="px-5">
        <Skeleton className="mt-6 h-8 w-1/2" />
        <View className="mt-6 flex-row gap-3">
          <Skeleton className="h-44 flex-1 rounded-3xl" />
          <Skeleton className="h-44 flex-1 rounded-3xl" />
        </View>
      </Screen>
    );
  }
  if (isError || !battle) {
    return (
      <Screen className="px-5">
        <EmptyState icon="wifi-off" title="Could not load this battle" onRetry={refetch} />
      </Screen>
    );
  }

  const iLead = battle.rival && battle.me.sessionsInBattle > battle.rival.sessionsInBattle;
  const tied = battle.rival && battle.me.sessionsInBattle === battle.rival.sessionsInBattle;

  return (
    <Screen>
      <View className="flex-1 px-5 pb-8">
        <View className="h-14 flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Go back"
            className="-ml-2 h-11 w-11 items-center justify-center"
            onPress={router.back}
          >
            <Feather color={mutedFg} name="arrow-left" size={22} />
          </Pressable>
          <Text className="font-semibold text-[13px] text-muted-foreground">
            Code {battle.code}
          </Text>
        </View>

        <Text className="font-bold text-[26px] tracking-tight text-foreground">
          {battle.status === "pending"
            ? "Waiting for your rival"
            : battle.status === "finished"
              ? "Battle over"
              : "Battle live"}
        </Text>
        {battle.status === "active" && battle.endsAt ? (
          <Text className="mt-1 font-sans text-[13px] text-muted-foreground">
            Ends in {formatDistanceToNowStrict(new Date(battle.endsAt))}
          </Text>
        ) : null}
        {battle.status === "pending" ? (
          <Text className="mt-1 font-sans text-[13px] text-muted-foreground">
            Share code {battle.code} - the clock starts when they join.
          </Text>
        ) : null}

        <View className="mt-8 flex-row items-stretch gap-3">
          <FighterCard fighter={battle.me} highlight={Boolean(iLead)} label="You" />
          <View className="items-center justify-center">
            <Text className="font-bold text-[16px] text-muted-foreground">VS</Text>
          </View>
          <FighterCard
            fighter={battle.rival}
            highlight={Boolean(battle.rival && !iLead && !tied)}
            label="Rival"
          />
        </View>

        {battle.status !== "pending" && battle.rival ? (
          <Text className="mt-6 text-center font-semibold text-[14px] text-foreground">
            {tied
              ? "Dead even. Next session takes the lead."
              : iLead
                ? "You're ahead. Stay there."
                : `${battle.rival.name.split(" ")[0]} leads. Fix that.`}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function FighterCard({
  fighter,
  highlight,
  label,
}: {
  fighter: BattleFighter | null;
  highlight: boolean;
  label: string;
}) {
  const mutedFg = useToken("mutedFg");
  return (
    <View
      className={cx(
        "flex-1 items-center rounded-3xl border bg-card px-3 py-6",
        highlight ? "border-primary" : "border-border",
      )}
    >
      <Text className="font-medium text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
      {fighter ? (
        <>
          <Text className="mt-2 text-center font-bold text-[16px] text-foreground" numberOfLines={1}>
            {fighter.name}
          </Text>
          <Text className="font-sans text-[11px] text-muted-foreground">@{fighter.handle}</Text>
          <Text className="mt-4 font-bold text-[40px] tracking-tight text-foreground">
            {fighter.sessionsInBattle}
          </Text>
          <Text className="font-sans text-[10.5px] text-muted-foreground">sessions this battle</Text>
          <View className="mt-3 flex-row items-center gap-1">
            <Feather color={mutedFg} name="zap" size={11} />
            <Text className="font-medium text-[11px] text-muted-foreground">
              {fighter.streak}-day streak
            </Text>
          </View>
        </>
      ) : (
        <Text className="mt-8 text-center font-sans text-[12px] text-muted-foreground">
          Nobody yet
        </Text>
      )}
    </View>
  );
}
