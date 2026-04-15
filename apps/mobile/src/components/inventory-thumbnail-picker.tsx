import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";

import type { InventoryPackCandidate } from "../lib/inventory";
import { colors } from "../lib/theme";
import { Card, Field } from "./ui";

type AvailabilityFilter = "all" | "available" | "on_job" | "unavailable";
const PAGE_SIZE = 60;

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: active ? colors.accentDark : colors.border,
        backgroundColor: active ? "#f7e3d8" : colors.panel,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function ThumbnailCard({
  item,
  selected,
  width,
  onToggle,
  onOpen,
  onPreview,
}: {
  item: InventoryPackCandidate;
  selected: boolean;
  width: number;
  onToggle: () => void;
  onOpen: () => void;
  onPreview: () => void;
}) {
  return (
    <View
      style={{
        width,
        borderWidth: 1,
        borderColor: selected ? colors.accentDark : colors.border,
        borderRadius: 16,
        backgroundColor: selected ? "#f7e3d8" : colors.panel,
        overflow: "hidden",
      }}
    >
      <Pressable onPress={onToggle}>
        {item.thumbnail_url ? (
          <Image alt="" source={{ uri: item.thumbnail_url }} style={{ width: "100%", aspectRatio: 1, backgroundColor: colors.panelAlt }} />
        ) : (
          <View
            style={{
              width: "100%",
              aspectRatio: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.panelAlt,
              padding: 12,
            }}
          >
            <Text style={{ color: "#d8e6dd", fontSize: 13, fontWeight: "700", textAlign: "center" }}>{item.category ?? "Item"}</Text>
          </View>
        )}
      </Pressable>
      <View style={{ gap: 6, padding: 12 }}>
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
          {item.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{item.item_code}</Text>
        <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12 }}>
          {item.category ?? "No category"} • {item.color ?? "No color"}
        </Text>
        <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12 }}>
          {item.current_location_name ?? "No location"} • {item.status}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={onToggle} style={{ flex: 1 }}>
            <Text style={{ color: colors.accentDark, fontSize: 13, fontWeight: "700" }}>{selected ? "Deselect" : "Select"}</Text>
          </Pressable>
          {item.thumbnail_url ? (
            <Pressable onPress={onPreview}>
              <Text style={{ color: colors.accentDark, fontSize: 13, fontWeight: "700" }}>Preview</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onOpen}>
            <Text style={{ color: colors.accentDark, fontSize: 13, fontWeight: "700" }}>Open</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function InventoryThumbnailPicker({
  items,
  search,
  onSearchChange,
  selectedItemIds,
  onToggleItem,
  availabilityFilter,
  onAvailabilityFilterChange,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  onOpenItem,
  onPreviewItem,
}: {
  items: InventoryPackCandidate[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedItemIds: string[];
  onToggleItem: (itemId: string) => void;
  availabilityFilter: AvailabilityFilter;
  onAvailabilityFilterChange: (value: AvailabilityFilter) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  locationOptions: string[];
  onOpenItem: (itemId: string) => void;
  onPreviewItem: (item: InventoryPackCandidate) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth >= 900 ? 280 : windowWidth >= 640 ? 220 : windowWidth - 40;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  useEffect(() => {
    setPage(1);
  }, [availabilityFilter, items.length, locationFilter, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <View style={{ gap: 12 }}>
      <Field label="Find" onChangeText={onSearchChange} placeholder="Search by item code, name, category, color..." value={search} />
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Availability</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <FilterChip label="All" active={availabilityFilter === "all"} onPress={() => onAvailabilityFilterChange("all")} />
          <FilterChip label="Available" active={availabilityFilter === "available"} onPress={() => onAvailabilityFilterChange("available")} />
          <FilterChip label="On Project" active={availabilityFilter === "on_job"} onPress={() => onAvailabilityFilterChange("on_job")} />
          <FilterChip label="Unavailable" active={availabilityFilter === "unavailable"} onPress={() => onAvailabilityFilterChange("unavailable")} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Location</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <FilterChip label="All" active={locationFilter === "all"} onPress={() => onLocationFilterChange("all")} />
          {locationOptions.slice(0, 8).map((locationName) => (
            <FilterChip
              key={locationName}
              label={locationName}
              active={locationFilter === locationName}
              onPress={() => onLocationFilterChange(locationName)}
            />
          ))}
        </View>
      </View>
      <Card>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
          {items.length} matching items • {selectedItemIds.length} selected
        </Text>
        <Text style={{ color: colors.muted }}>
          Page {page} of {totalPages}. Tap thumbnails to build a quick-select set. Search and filters work together.
        </Text>
      </Card>
      {items.length > PAGE_SIZE ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Previous</Text>
          </Pressable>
          <Pressable
            disabled={page === totalPages}
            onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
              opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Next</Text>
          </Pressable>
        </View>
      ) : null}
      {items.length === 0 ? (
        <Text style={{ color: colors.muted }}>No inventory items match the current search and filters.</Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {pagedItems.map((item) => (
            <ThumbnailCard
              key={item.id}
              item={item}
              selected={selectedItemIds.includes(item.id)}
              width={cardWidth}
              onToggle={() => onToggleItem(item.id)}
              onOpen={() => onOpenItem(item.id)}
              onPreview={() => onPreviewItem(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
