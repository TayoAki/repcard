import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import { useColorScheme } from "nativewind";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Screen from "@/components/ui/screen";
import Skeleton from "@/components/ui/skeleton";
import BattlesSection from "@/features/battles/battles-section";
import PlayerCard from "@/features/card/player-card";
import { deleteAccount, fetchMyCard, fetchProfile, updateProfile } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { haptic } from "@/lib/haptics";
import { useToken } from "@/theme/use-token";

/** Your card, the share action, and account settings. */
export default function CardTab() {
  const queryClient = useQueryClient();
  const shotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);
  const { colorScheme, setColorScheme } = useColorScheme();
  const primary = useToken("primary");
  const mutedFg = useToken("mutedFg");

  const { data: card, isError, isPending, refetch } = useQuery({
    queryKey: ["card"],
    queryFn: fetchMyCard,
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const setUnit = useMutation({
    mutationFn: (weightUnit: "kg" | "lb") => updateProfile({ weightUnit }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const shareCard = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing unavailable", "This device cannot share files.");
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(shotRef, { format: "png", quality: 1 });
      haptic.success();
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your RepCard" });
    } catch {
      Alert.alert("Could not render your card", "Try again.");
    } finally {
      setSharing(false);
    }
  };

  const signOut = async () => {
    const { error } = await authClient.signOut();
    if (error) Alert.alert("Could not sign out", error.message);
  };

  const confirmDeleteAccount = () =>
    Alert.alert(
      "Delete your account?",
      "Your card, workouts, and entire history are permanently erased. There is no undo.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              await authClient.signOut();
            } catch (error) {
              Alert.alert("Could not delete account", error instanceof Error ? error.message : "");
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-5 pb-28" showsVerticalScrollIndicator={false}>
        <Text className="pt-3 font-bold text-2xl tracking-tight text-foreground">My Card</Text>

        {isPending ? (
          <Skeleton className="mt-4 w-full rounded-[28px]" style={{ aspectRatio: 3 / 4 }} />
        ) : isError || !card ? (
          <EmptyState icon="wifi-off" title="Could not load your card" onRetry={refetch} />
        ) : (
          <>
            <View className="mt-4">
              <ViewShot ref={shotRef}>
                <PlayerCard card={card} />
              </ViewShot>
            </View>

            <Button
              before={<Feather color="#052E22" name="share" size={16} />}
              busy={sharing}
              className="mt-4"
              onPress={shareCard}
            >
              Share my card
            </Button>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <Chip label={`Rated on real training data`} />
              <Chip label={`${card.stats.totalSessions} lifetime sessions`} />
              <Chip label={`${card.stats.totalMinutes} min under the bar`} />
            </View>
          </>
        )}

        <BattlesSection />

        <Text className="mb-2 mt-8 font-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
          Settings
        </Text>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <Row icon="activity" label="Weight unit">
            <View className="flex-row overflow-hidden rounded-full border border-border">
              {(["kg", "lb"] as const).map((unit) => (
                <Pressable
                  key={unit}
                  accessibilityRole="button"
                  accessibilityState={{ selected: profile?.weightUnit === unit }}
                  className={
                    profile?.weightUnit === unit ? "bg-primary px-3.5 py-1.5" : "bg-card px-3.5 py-1.5"
                  }
                  onPress={() => setUnit.mutate(unit)}
                >
                  <Text
                    className={
                      profile?.weightUnit === unit
                        ? "font-semibold text-[12px] text-primary-foreground"
                        : "font-semibold text-[12px] text-muted-foreground"
                    }
                  >
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Row>
          <Row icon="moon" label="Dark mode">
            <Switch
              onValueChange={(on) => setColorScheme(on ? "dark" : "light")}
              trackColor={{ false: "#CBD5E1", true: primary }}
              value={colorScheme === "dark"}
            />
          </Row>
          <Row icon="log-out" label="Sign out" onPress={signOut} />
          <Row danger icon="trash-2" label="Delete account" onPress={confirmDeleteAccount} />
        </View>

        {profile ? (
          <Text className="mt-4 text-center font-sans text-[11px] text-muted-foreground">
            @{profile.handle} · card {`#${String(profile.cardSerial).padStart(4, "0")}`} ·{" "}
            {profile.email}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );

  function Row({
    children,
    danger,
    icon,
    label,
    onPress,
  }: {
    children?: React.ReactNode;
    danger?: boolean;
    icon: keyof typeof Feather.glyphMap;
    label: string;
    onPress?: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        className="min-h-14 flex-row items-center border-b border-border px-4 last:border-b-0 active:bg-muted"
        disabled={!onPress}
        onPress={onPress}
      >
        <Feather color={danger ? "#EF4444" : mutedFg} name={icon} size={18} />
        <Text
          className={`ml-3 flex-1 font-medium text-[14px] ${danger ? "text-destructive" : "text-foreground"}`}
        >
          {label}
        </Text>
        {children}
        {onPress && !children ? <Feather color={mutedFg} name="chevron-right" size={18} /> : null}
      </Pressable>
    );
  }
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border bg-card px-3 py-1.5">
      <Text className="font-sans text-[11px] text-muted-foreground">{label}</Text>
    </View>
  );
}
