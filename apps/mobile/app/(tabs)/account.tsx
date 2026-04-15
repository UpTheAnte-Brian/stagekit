import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen, Card, Field, Hero, LoadingState, Message, PrimaryButton, SecondaryButton } from "../../src/components/ui";
import { useAuth } from "../../src/lib/auth";
import { type Location, listLocations } from "../../src/lib/locations";
import { getSupabaseClient } from "../../src/lib/supabase";
import { buildBulkPackRequestLabel, getDisplayUsername, getPreferredLocationId, getQuickSelectIncludeTimestamp } from "../../src/lib/user";

function PreferenceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <SecondaryButton label={active ? `${label} Selected` : label} onPress={onPress} />
  );
}

export default function AccountTab() {
  const { session } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [preferredLocationId, setPreferredLocationId] = useState<string>("none");
  const [includeQuickSelectTimestamp, setIncludeQuickSelectTimestamp] = useState(true);

  useEffect(() => {
    setDisplayName(getDisplayUsername(session));
    setPreferredLocationId(getPreferredLocationId(session) ?? "none");
    setIncludeQuickSelectTimestamp(getQuickSelectIncludeTimestamp(session));
  }, [session]);

  useEffect(() => {
    void listLocations()
      .then(setLocations)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load warehouse locations."))
      .finally(() => setLoadingLocations(false));
  }, []);

  const preferredLocation = useMemo(
    () => locations.find((location) => location.id === preferredLocationId) ?? null,
    [locations, preferredLocationId],
  );
  const generatedQuickSelectLabel = useMemo(() => {
    const nextMetadataSession =
      session
        ? {
            ...session,
            user: {
              ...session.user,
              user_metadata: {
                ...session.user.user_metadata,
                full_name: displayName.trim(),
                preferred_location_id: preferredLocation?.id ?? null,
                preferred_location_name: preferredLocation?.name ?? null,
                quick_select_include_timestamp: includeQuickSelectTimestamp,
              },
            },
          }
        : null;

    return buildBulkPackRequestLabel(nextMetadataSession);
  }, [displayName, includeQuickSelectTimestamp, preferredLocation?.id, preferredLocation?.name, session]);

  async function handleSave() {
    if (!session) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const metadata = session.user.user_metadata ?? {};
      const { error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          full_name: displayName.trim(),
          preferred_location_id: preferredLocation?.id ?? null,
          preferred_location_name: preferredLocation?.name ?? null,
          quick_select_include_timestamp: includeQuickSelectTimestamp,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessage("Account settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save account settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <Hero
        eyebrow="Account"
        title="StageKit settings"
        subtitle="Manage the name and defaults the app uses when it generates quick-select pack requests and future warehouse workflows."
      />
      {message ? <Message text={message} tone={message === "Account settings saved." ? "success" : "error"} /> : null}
      <Card>
        <Text style={{ color: "#1f2b26", fontSize: 22, fontWeight: "700" }}>{session?.user.email ?? "Unknown user"}</Text>
        <Text style={{ color: "#49564f", lineHeight: 22 }}>
          Update the identity and defaults StageKit uses while you work. These settings stay with your signed-in account.
        </Text>
      </Card>

      <Card>
        <Text style={{ color: "#1f2b26", fontSize: 18, fontWeight: "700" }}>Identity</Text>
        <Field
          label="Display name"
          onChangeText={setDisplayName}
          placeholder="Brian Johnson"
          value={displayName}
        />
        <Text style={{ color: "#49564f", lineHeight: 22 }}>
          Quick Select will use this name in generated labels instead of falling back to your email address.
        </Text>
      </Card>

      <Card>
        <Text style={{ color: "#1f2b26", fontSize: 18, fontWeight: "700" }}>Quick Select Defaults</Text>
        <Text style={{ color: "#49564f", lineHeight: 22 }}>Generated label preview: {generatedQuickSelectLabel}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <PreferenceChip
            label="Include Timestamp"
            active={includeQuickSelectTimestamp}
            onPress={() => setIncludeQuickSelectTimestamp(true)}
          />
          <PreferenceChip
            label="No Timestamp"
            active={!includeQuickSelectTimestamp}
            onPress={() => setIncludeQuickSelectTimestamp(false)}
          />
        </View>
      </Card>

      <Card>
        <Text style={{ color: "#1f2b26", fontSize: 18, fontWeight: "700" }}>Warehouse Defaults</Text>
        {loadingLocations ? (
          <LoadingState label="Loading warehouse locations..." />
        ) : (
          <>
            <Text style={{ color: "#49564f", lineHeight: 22 }}>
              Preferred warehouse location helps future intake and assignment flows start from the right place.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <PreferenceChip label="No Default" active={preferredLocationId === "none"} onPress={() => setPreferredLocationId("none")} />
              {locations.map((location) => (
                <PreferenceChip
                  key={location.id}
                  label={location.name}
                  active={preferredLocationId === location.id}
                  onPress={() => setPreferredLocationId(location.id)}
                />
              ))}
            </View>
          </>
        )}
      </Card>

      <Card>
        <Text style={{ color: "#1f2b26", fontSize: 18, fontWeight: "700" }}>Session</Text>
        <PrimaryButton disabled={saving || !session} label={saving ? "Saving..." : "Save Settings"} onPress={() => void handleSave()} />
        <SecondaryButton label="Sign Out" onPress={() => void getSupabaseClient().auth.signOut()} />
      </Card>
    </AppScreen>
  );
}
