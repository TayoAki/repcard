import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";

import Button from "@/components/ui/button";
import Screen from "@/components/ui/screen";
import { haptic } from "@/lib/haptics";
import { logRun } from "@/lib/api";
import { useToken } from "@/theme/use-token";

/** Manual run entry (GPS is a later phase). Distance km, duration minutes. */
export default function LogRun() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutedFg = useToken("mutedFg");
  const primary = useToken("primary");

  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");

  const distanceMeters = Math.round((Number.parseFloat(km) || 0) * 1000);
  const durationSeconds = Math.round((Number.parseFloat(minutes) || 0) * 60);
  const paceValid = distanceMeters >= 100 && durationSeconds >= 60;
  const paceSecPerKm = paceValid ? durationSeconds / (distanceMeters / 1000) : null;

  const save = useMutation({
    mutationFn: () =>
      logRun({ distanceMeters, durationSeconds, note: note.trim() || undefined }),
    onError: (error) => Alert.alert("Could not save run", error.message),
    onSuccess: async () => {
      haptic.success();
      await Promise.all(
        ["runs", "day-stats", "calendar", "streak", "card"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      router.back();
    },
  });

  const submit = () => {
    if (!paceValid) {
      Alert.alert("Almost", "Enter at least 0.1 km and 1 minute.");
      return;
    }
    save.mutate();
  };

  return (
    <Screen>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerClassName="flex-grow"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-grow px-6 pb-6 pt-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              className="min-h-11 justify-center pr-3"
              onPress={router.back}
            >
              <Text className="font-medium text-[13px] text-destructive">Cancel</Text>
            </Pressable>
            <Text className="font-bold text-[16px] text-foreground">Log Run</Text>
            <View className="w-12" />
          </View>

          <View className="mt-8 flex-row gap-3">
            <View className="flex-1 gap-2">
              <Text className="font-medium text-[14px] text-foreground">Distance (km)</Text>
              <TextInput
                accessibilityLabel="Distance in kilometers"
                className="h-16 rounded-2xl border border-input-border bg-input px-4 text-center font-bold text-[22px] text-foreground"
                keyboardType="decimal-pad"
                onChangeText={setKm}
                placeholder="5.0"
                placeholderTextColor={mutedFg}
                selectionColor={primary}
                value={km}
              />
            </View>
            <View className="flex-1 gap-2">
              <Text className="font-medium text-[14px] text-foreground">Duration (min)</Text>
              <TextInput
                accessibilityLabel="Duration in minutes"
                className="h-16 rounded-2xl border border-input-border bg-input px-4 text-center font-bold text-[22px] text-foreground"
                keyboardType="decimal-pad"
                onChangeText={setMinutes}
                placeholder="30"
                placeholderTextColor={mutedFg}
                selectionColor={primary}
                value={minutes}
              />
            </View>
          </View>

          {paceSecPerKm !== null ? (
            <View className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3">
              <Feather color={primary} name="trending-up" size={15} />
              <Text className="font-semibold text-[14px] text-foreground">
                {Math.floor(paceSecPerKm / 60)}:{String(Math.round(paceSecPerKm % 60)).padStart(2, "0")} /km pace
              </Text>
            </View>
          ) : null}

          <View className="mt-5 gap-2">
            <Text className="font-medium text-[14px] text-foreground">Note (optional)</Text>
            <TextInput
              className="h-20 rounded-2xl border border-input-border bg-input px-4 py-3 font-sans text-[14px] text-foreground"
              maxLength={280}
              multiline
              onChangeText={setNote}
              placeholder="Easy morning 5k..."
              placeholderTextColor={mutedFg}
              selectionColor={primary}
              textAlignVertical="top"
              value={note}
            />
          </View>

          <Button busy={save.isPending} className="mt-8" onPress={submit}>
            Save Run
          </Button>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </Screen>
  );
}
