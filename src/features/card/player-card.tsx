import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { forwardRef } from "react";
import { Text, View } from "react-native";

import { type CardData } from "@/lib/api";

cssInterop(LinearGradient, { className: "style" });

/**
 * The baseball card. A plain RN view (3:4) so react-native-view-shot can
 * rasterize it for sharing. Deliberately theme-independent: the card is a
 * branded asset and must look identical in light mode, dark mode, and in
 * whatever app the share lands in.
 */
const PlayerCard = forwardRef<View, { card: CardData }>(function PlayerCard({ card }, ref) {
  const serial = `#${String(card.serial).padStart(4, "0")}`;

  const grid = [
    { label: "SESSIONS 28D", value: String(card.stats.sessions28) },
    { label: "VOLUME 28D", value: `${(card.stats.volume28Kg / 1000).toFixed(1)}t` },
    { label: "STREAK", value: `${card.streak}d` },
    { label: "BEST RUN", value: `${card.bestStreak}d` },
    { label: "PRS 30D", value: String(card.stats.prCount30) },
    { label: "MUSCLES HIT", value: String(card.stats.muscleGroups28) },
  ];

  return (
    <View collapsable={false} ref={ref} style={{ aspectRatio: 3 / 4, width: "100%" }}>
      <LinearGradient
        className="flex-1 rounded-[28px] p-[3px]"
        colors={["#34D399", "#10B981", "#065F46"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
      >
        <View className="flex-1 rounded-[25px] bg-[#04120C] p-5">
          {/* Header: overall + position | serial */}
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="font-bold text-[54px] leading-[56px] text-emerald-300">
                {card.overall}
              </Text>
              <Text className="font-semibold text-[11px] uppercase tracking-[2px] text-emerald-200/80">
                {card.position}
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1 rounded-full bg-emerald-300/15 px-2.5 py-1">
                <Feather color="#6EE7B7" name="zap" size={11} />
                <Text className="font-semibold text-[11px] text-emerald-300">{card.streak}</Text>
              </View>
              <Text className="mt-2 font-medium text-[10px] text-emerald-100/50">{serial}</Text>
              <Text className="font-medium text-[10px] text-emerald-100/50">S{card.season}</Text>
            </View>
          </View>

          {/* Identity */}
          <View className="mt-auto">
            <Text className="font-bold text-[24px] leading-7 text-white" numberOfLines={2}>
              {card.name}
            </Text>
            <Text className="mt-0.5 font-medium text-[12px] text-emerald-300/90">@{card.handle}</Text>
          </View>

          {/* Stat grid */}
          <View className="mt-4 flex-row flex-wrap rounded-2xl bg-white/[0.06] p-3">
            {grid.map((cell) => (
              <View className="w-1/3 px-1 py-1.5" key={cell.label}>
                <Text className="font-bold text-[16px] text-white">{cell.value}</Text>
                <Text className="mt-0.5 font-medium text-[7.5px] tracking-[0.8px] text-emerald-100/50">
                  {cell.label}
                </Text>
              </View>
            ))}
          </View>

          <Text className="mt-3 text-center font-medium text-[8px] tracking-[2px] text-emerald-100/40">
            REPCARD · EVERY ATHLETE GETS A CARD
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
});

export default PlayerCard;
