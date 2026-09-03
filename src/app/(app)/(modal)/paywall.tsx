import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import { usePro } from "@/features/pro/use-pro";
import { haptic } from "@/lib/haptics";
import { useToken } from "@/theme/use-token";

// Placeholder Pro perks - tune these to the real offering. Nothing in the free
// app is gated yet; these describe what Pro would unlock.
const PERKS = [
  { icon: "image", title: "Pro card themes", body: "Alternate Player Card looks to show off." },
  { icon: "cpu", title: "Unlimited AI plans", body: "Generate as many coached plans as you want." },
  { icon: "bar-chart-2", title: "Advanced stats", body: "Deeper trends and lifetime breakdowns." },
] as const;

/** RepCard Pro paywall. Renders live offerings when RevenueCat is configured,
 *  and a graceful "coming soon" when it isn't (no keys). */
export default function Paywall() {
  const router = useRouter();
  const primary = useToken("primary");
  const mutedFg = useToken("mutedFg");
  const { isPro, packages, loading, canPurchase, buy, restore } = usePro();
  const [busy, setBusy] = useState<string | null>(null);

  const onBuy = async (pkg: PurchasesPackage) => {
    setBusy(pkg.identifier);
    const ok = await buy(pkg);
    setBusy(null);
    if (ok) {
      haptic.success();
      Alert.alert("You're Pro 🎉", "Thanks for supporting RepCard.");
      router.back();
    }
  };

  const onRestore = async () => {
    const ok = await restore();
    Alert.alert(ok ? "Restored" : "Nothing to restore", ok ? "Your Pro access is active." : "No prior purchase found.");
  };

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        <View className="h-14 flex-row items-center justify-between">
          <Pressable accessibilityLabel="Close" className="-ml-2 h-11 w-11 items-center justify-center" onPress={router.back}>
            <Feather color={mutedFg} name="x" size={22} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onRestore}>
            <Text className="font-medium text-[13px] text-muted-foreground">Restore</Text>
          </Pressable>
        </View>

        <View className="mt-2 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent dark:bg-accent/20">
            <Feather color={primary} name="zap" size={28} />
          </View>
          <Text className="mt-4 text-center font-bold text-[24px] tracking-tight text-foreground">RepCard Pro</Text>
          <Text className="mt-1.5 text-center font-sans text-[13px] leading-5 text-muted-foreground">
            {isPro ? "You're a Pro member. Thank you!" : "Level up your card and training."}
          </Text>
        </View>

        <View className="mt-6 gap-3">
          {PERKS.map((p) => (
            <View key={p.title} className="flex-row items-center rounded-2xl border border-border bg-card p-4">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent dark:bg-accent/20">
                <Feather color={primary} name={p.icon} size={18} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-[14px] text-foreground">{p.title}</Text>
                <Text className="mt-0.5 font-sans text-[12px] text-muted-foreground">{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="mt-6">
          {isPro ? (
            <View className="items-center rounded-2xl border border-primary bg-accent py-4 dark:bg-accent/20">
              <Text className="font-semibold text-[14px] text-primary">Pro is active ✓</Text>
            </View>
          ) : loading ? (
            <ActivityIndicator color={primary} />
          ) : canPurchase && packages.length > 0 ? (
            packages.map((pkg) => (
              <Button
                key={pkg.identifier}
                busy={busy === pkg.identifier}
                className="mb-2"
                onPress={() => onBuy(pkg)}
              >
                {`${pkg.product.title} — ${pkg.product.priceString}`}
              </Button>
            ))
          ) : (
            <View className="items-center rounded-2xl border border-border bg-card py-5">
              <Text className="font-semibold text-[14px] text-foreground">Coming soon</Text>
              <Text className="mt-1 px-6 text-center font-sans text-[12px] text-muted-foreground">
                Pro isn&apos;t available yet. Check back soon.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
