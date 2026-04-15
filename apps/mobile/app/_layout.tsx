import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

import { AuthProvider, useAuth } from "../src/lib/auth";
import { AppScreen } from "../src/components/ui";

function RootNavigator() {
  const { booting, envReady } = useAuth();

  if (!envReady) {
    return (
      <AppScreen scroll={false}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#1f2b26" }}>StageKit mobile needs Supabase env values.</Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: "#49564f" }}>
            Copy `apps/mobile/.env.example` to `apps/mobile/.env`, then add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
          </Text>
        </View>
      </AppScreen>
    );
  }

  if (booting) {
    return (
      <AppScreen scroll={false}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <Text style={{ fontSize: 18, color: "#49564f" }}>Loading StageKit...</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="inventory/[id]" />
        <Stack.Screen name="projects/[id]" />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
