import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import { redeemReferral } from "@/lib/api";
import { stashPendingReferral } from "@/lib/referral-store";
import { useToken } from "@/theme/use-token";

/** Deep-link target: repcard://invite/[code]. Redeems an incoming invite. */
export default function RedeemInvite() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { code } = useLocalSearchParams<{ code: string }>();
  const primary = useToken("primary");

  const redeem = useMutation({
    mutationFn: () => redeemReferral(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["referral"] }),
  });

  useEffect(() => {
    if (!code) return;
    // Stash first so the code survives if auth/profile setup bounces us away;
    // (app)/_layout redeems any pending code once a profile exists.
    stashPendingReferral(code);
    redeem.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per code
  }, [code]);

  const referrer = redeem.data?.referrer;

  return (
    <Screen className="items-center justify-center px-8">
      {redeem.isPending || redeem.isIdle ? (
        <>
          <ActivityIndicator color={primary} size="large" />
          <Text className="mt-4 font-medium text-[14px] text-muted-foreground">Applying your invite...</Text>
        </>
      ) : redeem.isSuccess ? (
        <>
          <Feather color={primary} name="check-circle" size={30} />
          <Text className="mt-4 text-center font-bold text-[18px] text-foreground">You&apos;re in</Text>
          <Text className="mt-2 text-center font-sans text-[13px] text-muted-foreground">
            {referrer ? `Invite from @${referrer.handle} applied. Time to train.` : "Invite applied. Time to train."}
          </Text>
          <Button className="mt-6" onPress={() => router.replace("/(app)/(tabs)")} size="sm">
            Start training
          </Button>
        </>
      ) : (
        <>
          <Feather color={primary} name="user-plus" size={30} />
          <Text className="mt-4 text-center font-bold text-[18px] text-foreground">
            Couldn&apos;t apply this invite
          </Text>
          <Text className="mt-2 text-center font-sans text-[13px] text-muted-foreground">
            {redeem.error instanceof Error ? redeem.error.message : "The code may be invalid or already used."}
          </Text>
          <Button className="mt-6" onPress={() => router.replace("/(app)/(tabs)")} size="sm">
            Go home
          </Button>
        </>
      )}
    </Screen>
  );
}
