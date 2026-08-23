import { Feather } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToken } from "@/theme/use-token";

/**
 * Floating pill tab bar (Android + fallback). The center [+] is an action,
 * not a screen - it intercepts the press and opens the composer modal.
 */
function PillTabs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const card = useToken("card");
  const border = useToken("border");
  const primary = useToken("primary");
  const mutedFg = useToken("mutedFg");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: mutedFg,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
        tabBarStyle: {
          backgroundColor: card,
          borderColor: border,
          borderWidth: 0.5,
          borderRadius: 32,
          height: 64,
          marginHorizontal: 14,
          paddingBottom: 6,
          paddingTop: 6,
          position: "absolute",
          bottom: insets.bottom + (Platform.OS === "android" ? 10 : 0),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home tab",
          tabBarIcon: ({ color }) => <Feather color={color} name="home" size={21} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarAccessibilityLabel: "Workouts tab",
          tabBarIcon: ({ color }) => <Feather color={color} name="activity" size={21} />,
        }}
      />
      <Tabs.Screen
        name="create"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push("/workout/compose");
          },
        }}
        options={{
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: "New workout",
          tabBarButton: ({ onPress }) => (
            <Pressable className="flex-1 items-center justify-center" onPress={onPress}>
              <View className="-mt-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg">
                <Feather color="#052E22" name="plus" size={26} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarAccessibilityLabel: "History tab",
          tabBarIcon: ({ color }) => <Feather color={color} name="calendar" size={21} />,
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: "My Card",
          tabBarAccessibilityLabel: "My card tab",
          tabBarIcon: ({ color }) => <Feather color={color} name="credit-card" size={21} />,
        }}
      />
    </Tabs>
  );
}


/** iOS 26 native glass tab bar via SF Symbols. */
function GlassTabs() {
  const router = useRouter();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="workouts">
        <NativeTabs.Trigger.Label>Workouts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.strengthtraining.traditional" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        disabled
        listeners={{
          tabPress: () => router.push("/workout/compose"),
        }}
        name="create"
      >
        <NativeTabs.Trigger.Label>New</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="card">
        <NativeTabs.Trigger.Label>My Card</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.rectangle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabLayout() {
  return Platform.OS === "ios" ? <GlassTabs /> : <PillTabs />;
}
