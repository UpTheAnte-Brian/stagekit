"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

const MAX_VISIBLE_ITEMS = 24;

type ExactItem = {
  id: string;
  name: string;
  item_code: string;
  status: string;
  category: string | null;
  color: string | null;
  current_location_name: string | null;
};

function splitSearchTerms(query: string) {
  return [...new Set(query.split(/[\s,]+/).map((term) => term.trim()).filter(Boolean))];
}

function matchesSearch(item: ExactItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [item.name, item.item_code, item.category, item.color, item.current_location_name, item.status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return splitSearchTerms(query).every((term) => haystack.includes(term));
}

export function JobExactItemPicker({
  items,
  inputName,
  defaultValue = "",
  initialSearch = "",
}: {
  items: ExactItem[];
  inputName: string;
  defaultValue?: string;
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [selectedItemId, setSelectedItemId] = useState(defaultValue);
  const [thumbnailByItemId, setThumbnailByItemId] = useState<Record<string, string>>({});
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredItems = useMemo(() => items.filter((item) => matchesSearch(item, deferredSearch)), [deferredSearch, items]);
  const visibleItems = deferredSearch || selectedItemId ? filteredItems.slice(0, MAX_VISIBLE_ITEMS) : [];
  const visibleItemIdsKey = visibleItems.map((item) => item.id).join(",");
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  useEffect(() => {
    if (!visibleItemIdsKey) return;

    const controller = new AbortController();

    async function loadThumbnails() {
      try {
        const response = await fetch("/api/inventory/thumbnails", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemIds: visibleItemIdsKey.split(",") }),
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load thumbnails: ${response.status}`);
        }

        const payload = (await response.json()) as { thumbnails?: Record<string, string> };
        if (!controller.signal.aborted) {
          setThumbnailByItemId(payload.thumbnails ?? {});
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load exact-item thumbnails", error);
        }
      }
    }

    void loadThumbnails();
    return () => controller.abort();
  }, [visibleItemIdsKey]);

  return (
    <div className="space-y-4">
      <input name={inputName} type="hidden" value={selectedItemId} />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#33413b]" htmlFor={`${inputName}-search`}>
            Search Inventory
          </label>
          <input
            id={`${inputName}-search`}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, category, color, or location. Each word is matched separately."
            type="search"
            value={search}
          />
        </div>
        <button
          className="inline-flex items-center justify-center rounded-xl border border-[#e3d0ba] bg-white px-4 py-2.5 text-sm font-semibold text-[#33413b] transition hover:bg-[#fffaf4]"
          onClick={() => setSelectedItemId("")}
          type="button"
        >
          Clear Exact Item
        </button>
      </div>

      {selectedItem ? (
        <div className="rounded-2xl border border-[#d8e6dd] bg-[#f7fbf8] px-4 py-3 text-sm text-[#254238]">
          Selected exact item: <span className="font-semibold">{selectedItem.name}</span> ({selectedItem.item_code || "No code"}) •{" "}
          {selectedItem.status}
        </div>
      ) : null}

      {!deferredSearch && !selectedItemId ? (
        <div className="rounded-2xl border border-[#ecdcc7] bg-white p-5 text-sm text-[#6f756c]">
          Start typing to find the exact inventory item for this request.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-[#ecdcc7] bg-white p-5 text-sm text-[#6f756c]">No inventory items match this search.</div>
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const selected = item.id === selectedItemId;

            return (
              <button
                key={item.id}
                className={[
                  "flex w-full items-start gap-4 rounded-2xl border bg-white p-4 text-left transition",
                  selected ? "border-[#c96f3d] ring-2 ring-[#e8b18e]" : "border-[#ecdcc7] hover:border-[#c96f3d]",
                ].join(" ")}
                onClick={() => setSelectedItemId(item.id)}
                type="button"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f7f3ee] sm:h-28 sm:w-28">
                  {thumbnailByItemId[item.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`${item.name} thumbnail`}
                      className="h-full w-full object-cover"
                      decoding="async"
                      loading="lazy"
                      src={thumbnailByItemId[item.id]}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#6f756c]">No photo</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#20322a]">{item.name}</p>
                      <p className="mt-1 text-sm text-[#6f756c]">{item.item_code || "No code"}</p>
                    </div>
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                        selected ? "bg-[#c96f3d] text-white" : "bg-[#eef5f1] text-[#335244]",
                      ].join(" ")}
                    >
                      {selected ? "Linked" : item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#536158]">
                    {item.category ?? "No category"}
                    {item.color ? ` • ${item.color}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-[#536158]">{item.current_location_name ?? "No location"}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filteredItems.length > MAX_VISIBLE_ITEMS ? (
        <p className="text-sm leading-6 text-[#6f756c]">Showing the first {MAX_VISIBLE_ITEMS} matches. Refine the search to narrow the list.</p>
      ) : null}
    </div>
  );
}
