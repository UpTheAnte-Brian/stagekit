import { Redirect } from "expo-router";

import { useAuth } from "../src/lib/auth";

export default function IndexScreen() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/(tabs)/inventory" />;
  }

  return <Redirect href="/login" />;
}
