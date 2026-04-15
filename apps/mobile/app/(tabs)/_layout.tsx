import { Redirect, Tabs } from "expo-router";

import { useAuth } from "../../src/lib/auth";
import { colors } from "../../src/lib/theme";

export default function TabsLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentDark,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          height: 74,
          paddingBottom: 12,
          paddingTop: 10,
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
      <Tabs.Screen name="add-item" options={{ title: "Add Item" }} />
      <Tabs.Screen name="projects" options={{ title: "Projects" }} />
      <Tabs.Screen name="warehouse" options={{ title: "Warehouse" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
