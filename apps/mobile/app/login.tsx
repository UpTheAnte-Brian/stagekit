import { Redirect } from "expo-router";
import { useState } from "react";

import { AppScreen, Card, Field, Hero, Message, PrimaryButton } from "../src/components/ui";
import { useAuth } from "../src/lib/auth";
import { getSupabaseClient } from "../src/lib/supabase";

type AuthMode = "signin" | "signup";

export default function LoginScreen() {
  const { session } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Redirect href="/(tabs)/inventory" />;
  }

  async function handleAuth() {
    setSubmitting(true);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(data.session ? "Account created and signed in." : "Account created. Check email confirmation if enabled.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <Hero
        eyebrow="StageKit"
        title="Sign in on your phone."
        subtitle="This mobile app uses the same Supabase backend as the web app, with sessions stored on device."
      />
      <Card>
        <Field keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="you@example.com" value={email} />
        <Field label="Password" onChangeText={setPassword} placeholder="Password" value={password} />
        {message ? <Message text={message} tone={message.includes("created") ? "success" : "error"} /> : null}
        <PrimaryButton
          disabled={submitting || !email || !password}
          label={submitting ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}
          onPress={() => void handleAuth()}
        />
        <PrimaryButton
          disabled={submitting}
          label={mode === "signin" ? "Switch to Sign Up" : "Switch to Sign In"}
          onPress={() => setMode((current) => (current === "signin" ? "signup" : "signin"))}
        />
      </Card>
    </AppScreen>
  );
}
