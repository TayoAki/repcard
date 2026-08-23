import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "@/components/ui/button";

cssInterop(LinearGradient, { className: "style" });

/**
 * Welcome hero. Card-shaped motif previews the Player Card concept:
 * your training becomes a card worth showing off.
 */
export default function Welcome() {
  const router = useRouter();

  return (
    <LinearGradient
      className="flex-1"
      colors={["#022C22", "#064E3B", "#0A0F0D"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <SafeAreaView className="flex-1 px-6" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center">
          {/* Placeholder card frame - the real Player Card lands in its own PR */}
          <View className="h-72 w-56 -rotate-3 rounded-3xl border-2 border-emerald-300/40 bg-emerald-950/60 p-4 shadow-lg">
            <View className="flex-row items-start justify-between">
              <Text className="font-bold text-4xl text-emerald-300">87</Text>
              <Feather color="#6EE7B7" name="zap" size={20} />
            </View>
            <Text className="mt-1 font-semibold text-[11px] uppercase tracking-widest text-emerald-200/70">
              Builder · S1
            </Text>
            <View className="mt-auto gap-1.5">
              <View className="h-2 w-3/4 rounded-full bg-emerald-300/30" />
              <View className="h-2 w-1/2 rounded-full bg-emerald-300/20" />
            </View>
          </View>

          <Text className="mt-10 text-center font-bold text-[34px] leading-10 tracking-tight text-white">
            Every athlete{"\n"}gets a card.
          </Text>
          <Text className="mt-3 text-center font-sans text-[15px] leading-6 text-emerald-100/70">
            Track your training. Watch your rating climb.{"\n"}Share the card that proves it.
          </Text>
        </View>

        <Button
          after={<Feather color="#052E22" name="arrow-right" size={20} />}
          onPress={() => router.push("/(app)/(tabs)")}
        >
          Get Started
        </Button>
        <View className="h-3" />
      </SafeAreaView>
    </LinearGradient>
  );
}
