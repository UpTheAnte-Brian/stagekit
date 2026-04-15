import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppScreen, Card, Hero, LoadingState } from "../../src/components/ui";
import { listInventoryItems } from "../../src/lib/inventory";
import { listActiveJobLocations, type ActiveJobLocation } from "../../src/lib/jobs";
import { listLocations, type Location } from "../../src/lib/locations";

export default function WarehouseTab() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>({});
  const [activeJobLocations, setActiveJobLocations] = useState<ActiveJobLocation[]>([]);

  useEffect(() => {
    Promise.all([listLocations(), listInventoryItems(), listActiveJobLocations()])
      .then(([nextLocations, items, nextActiveJobLocations]) => {
        setLocations(nextLocations);
        setActiveJobLocations(nextActiveJobLocations);
        const counts = items.reduce<Record<string, number>>((acc, item) => {
          const key = item.current_location_name ?? "Unassigned";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
        setLocationCounts(counts);
      })
      .finally(() => setLoading(false));
  }, []);

  const fallbackLocations = useMemo(() => ["In staging", "In truck", "In storage unit", "At house"], []);
  const locationNames = locations.length > 0 ? locations.map((location) => location.name) : fallbackLocations;

  return (
    <AppScreen>
      <Hero
        eyebrow="Warehouse"
        title="Track where items actually are."
        subtitle="This screen gives you a quick count by storage or staging location."
      />
      {loading ? <LoadingState label="Loading warehouse locations..." /> : null}
      {!loading
        ? (
            <>
              <Card>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2b26" }}>Storage Locations</Text>
                <Text style={{ color: "#49564f" }}>Tap a location to jump into Inventory with that location filter already selected.</Text>
              </Card>
              <Card>
                <View style={{ gap: 12 }}>
                  {locationNames.map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => router.push({ pathname: "/inventory", params: { location: name } })}
                      style={{
                        borderWidth: 1,
                        borderColor: "#d9c8a5",
                        borderRadius: 18,
                        padding: 16,
                        gap: 6,
                        backgroundColor: "#fffaf1",
                      }}
                      >
                      <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2b26" }}>{name}</Text>
                      {locations.find((location) => location.name === name)?.address_label ? (
                        <Text style={{ color: "#49564f" }}>{locations.find((location) => location.name === name)?.address_label}</Text>
                      ) : null}
                      <Text style={{ color: "#49564f" }}>{locationCounts[name] ?? 0} items</Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
              <Card>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2b26" }}>Active Projects / Stages</Text>
                <Text style={{ color: "#49564f" }}>Items checked out to a project appear here until they are checked back in.</Text>
              </Card>
              <Card>
                <View style={{ gap: 12 }}>
                  {activeJobLocations.length === 0 ? (
                    <View>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2b26" }}>No active project locations</Text>
                      <Text style={{ color: "#49564f" }}>Assign an item to a project to have that stage show up here.</Text>
                    </View>
                  ) : (
                    activeJobLocations.map((job) => (
                      <Pressable
                        key={job.id}
                        onPress={() => router.push({ pathname: "/inventory", params: { location: job.name } })}
                        style={{
                          borderWidth: 1,
                          borderColor: "#d9c8a5",
                          borderRadius: 18,
                          padding: 16,
                          gap: 6,
                          backgroundColor: "#fffaf1",
                        }}
                      >
                        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2b26" }}>{job.name}</Text>
                        {job.address_label ? <Text style={{ color: "#49564f" }}>{job.address_label}</Text> : null}
                        <Text style={{ color: "#49564f" }}>{job.activeItemCount} active item{job.activeItemCount === 1 ? "" : "s"}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </Card>
            </>
          )
        : null}
    </AppScreen>
  );
}
