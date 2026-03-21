import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#16213e",
          borderTopColor: "#0f3460",
        },
        tabBarActiveTintColor: "#f5c518",
        tabBarInactiveTintColor: "#6b7280",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          title: "Badges",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏅</Text>,
        }}
      />
      <Tabs.Screen
        name="quest/[pinId]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="island/[islandId]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
