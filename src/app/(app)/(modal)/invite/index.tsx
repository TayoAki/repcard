import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import { fetchReferral, redeemReferral } from "@/lib/api";
import { API_URL } from "@/lib/auth-client";
import { haptic } from "@/lib/haptics";
import { useToken } from "@/theme/use-token";

/** Invite hub: your code + share link, recruit count, and redeem-a-code field. */
export default function InviteHub() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const primary = useToken("primary");
  const mutedFg = useToken("mutedFg");
  const [entered, setEntered] = useState("");

  const { data, isError, isPending, refetch } = useQuery({ queryKey: ["referral"], queryFn: fetchReferral });

  const redeem = useMutation({
    mutationFn: (code: string) => redeemReferral(code),
    onSuccess: (res) => {
      haptic.success();
      setEntered("");
      queryClient.invalidateQueries({ queryKey: ["referral"] });
      Alert.alert("You're in!", `Invite from @${res.referrer.handle} applied.`);
    },
    onError: (error) => Alert.alert("Couldn't redeem", error instanceof Error ? error.message : "Try again"),
  });

  const shareLink = async () => {
    if (!data) return;
    try {
      haptic.success();
      await Share.share({
        message: `Join me on RepCard — track workouts and earn a Player Card rated on real training: ${API_URL}/i/${data.code}`,
      });
    } catch {
      // user dismissed the share sheet - no-op
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        <View className="h-14 flex-row items-center">
          <Pressable
            accessibilityLabel="Close"
            className="-ml-2 h-11 w-11 items-center justify-center"
            onPress={router.back}
          >
            <Feather color={mutedFg} name="x" size={22} />
          </Pressable>
          <Text className="font-bold text-[17px] text-foreground">Invite friends</Text>
        </View>

        {isPending ? (
          <View className="mt-20 items-center">
            <ActivityIndicator color={primary} size="large" />
          </View>
        ) : isError || !data ? (
          <EmptyState icon="wifi-off" title="Could not load your invite code" onRetry={refetch} />
        ) : (
          <>
            <View className="mt-2 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent dark:bg-accent/20">
                <Feather color={primary} name="user-plus" size={28} />
              </View>
              <Text className="mt-4 text-center font-bold text-[22px] tracking-tight text-foreground">
                Build your roster
              </Text>
              <Text className="mt-1.5 text-center font-sans text-[13px] leading-5 text-muted-foreground">
                {data.recruits > 0
                  ? `${data.recruits} ${data.recruits === 1 ? "athlete has" : "athletes have"} joined from your invites.`
                  : "Share your link. Every athlete who joins gets counted on your roster."}
              </Text>
            </View>

            <View className="mt-6 items-center rounded-2xl border border-border bg-card py-5">
              <Text className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">
                Your invite code
              </Text>
              <Text className="mt-1.5 font-bold text-[30px] tracking-[4px] text-foreground">{data.code}</Text>
            </View>

            <Button
              before={<Feather color="#052E22" name="share" size={16} />}
              className="mt-3"
              onPress={shareLink}
            >
              Share invite link
            </Button>

            {data.redeemed ? (
              <View className="mt-8 flex-row items-center justify-center gap-1.5">
                <Feather color={primary} name="check-circle" size={14} />
                <Text className="font-medium text-[12px] text-muted-foreground">
                  You joined through an invite
                </Text>
              </View>
            ) : (
              <View className="mt-8">
                <Text className="mb-2 font-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                  Got an invite code?
                </Text>
                <View className="flex-row gap-2">
                  <TextInput
                    accessibilityLabel="Invite code"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    className="h-12 flex-1 rounded-2xl border border-input-border bg-muted px-4 font-semibold tracking-[3px] text-foreground"
                    maxLength={6}
                    onChangeText={(t) => setEntered(t.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
                    placeholder="ABC123"
                    placeholderTextColor={mutedFg}
                    returnKeyType="done"
                    value={entered}
                  />
                  <Button
                    busy={redeem.isPending}
                    disabled={entered.length !== 6}
                    onPress={() => redeem.mutate(entered)}
                    size="sm"
                  >
                    Redeem
                  </Button>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
