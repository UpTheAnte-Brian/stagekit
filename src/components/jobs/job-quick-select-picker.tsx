"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

type QuickPickItem = {
  id: string;
  name: string;
  item_code: string;
  status: string;
  category: string | null;
  color: string | null;
  current_location_name: string | null;
};

type InventoryThumbnailResponse = {
  thumbnails?: Record<string, string>;
};

const PAGE_SIZE = 18;

function matchesSearch(item: QuickPickItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [item.name, item.item_code, item.category, item.color, item.current_location_name, item.status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function JobQuickSelectPicker({ items }: { items: QuickPickItem[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [thumbnailByItemId, setThumbnailByItemId] = useState<Record<string, string>>({});
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredItems = useMemo(() => {
    return items.filter((item) => matchesSearch(item, deferredSearch));
  }, [deferredSearch, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visibleItemIdsKey = visibleItems.map((item) => item.id).join(",");

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  useEffect(() => {
    const itemIds = visibleItemIdsKey ? visibleItemIdsKey.split(",") : [];

    if (itemIds.length === 0) {
      setThumbnailByItemId({});
      return;
    }

    const controller = new AbortController();

    async function loadThumbnails() {
      try {
        const response = await fetch("/api/inventory/thumbnails", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ itemIds }),
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load thumbnails: ${response.status}`);
        }

        const payload = (await response.json()) as InventoryThumbnailResponse;
        setThumbnailByItemId(payload.thumbnails ?? {});
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to load quick-select thumbnails", {
          itemIds,
          error,
        });
        setThumbnailByItemId({});
      }
    }

    setThumbnailByItemId({});
    void loadThumbnails();

    return () => {
      controller.abort();
    };
  }, [visibleItemIdsKey]);

  function toggleItem(itemId: string, disabled: boolean) {
    if (disabled) {
      return;
    }

    setSelectedItemIds((current) => (current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#33413b]" htmlFor="quick-select-search">
            Search Inventory
          </label>
          <input
            id="quick-select-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, SKU, category, color, or location"
            type="search"
            value={search}
          />
        </div>
        <div className="rounded-2xl border border-[#ecdcc7] bg-[#fff8ef] px-4 py-3 text-sm font-medium text-[#5d4736]">
          {selectedItemIds.length} selected
        </div>
      </div>

      {selectedItemIds.map((itemId) => (
        <input key={itemId} name="item_ids" type="hidden" value={itemId} />
      ))}

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-[#ecdcc7] bg-white p-5 text-sm text-[#6f756c]">No inventory items match this search.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const disabled = item.status !== "available";
            const selected = selectedItemIds.includes(item.id);

            return (
              <button
                key={item.id}
                className={[
                  "grid overflow-hidden rounded-2xl border bg-white text-left transition md:grid-cols-[7rem_minmax(0,1fr)]",
                  disabled ? "border-[#eadfd3] opacity-70" : selected ? "border-[#c96f3d] ring-2 ring-[#e8b18e]" : "border-[#ecdcc7] hover:border-[#c96f3d]",
                ].join(" ")}
                onClick={() => toggleItem(item.id, disabled)}
                type="button"
              >
                <div className="flex h-28 items-center justify-center bg-[#f7f3ee]">
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
                    <div className="h-full w-full bg-[#efe7dc]" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#20322a]">{item.name}</p>
                      <p className="text-sm text-[#6f756c]">{item.item_code || "No code"}</p>
                    </div>
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                        selected ? "bg-[#c96f3d] text-white" : "bg-[#eef5f1] text-[#335244]",
                      ].join(" ")}
                    >
                      {selected ? "Selected" : disabled ? item.status : "Select"}
                    </span>
                  </div>
                  <p className="text-sm text-[#536158]">
                    {item.category ?? "No category"}
                    {item.color ? ` • ${item.color}` : ""}
                  </p>
                  <p className="text-sm text-[#536158]">
                    {item.current_location_name ?? "No location"} • {item.status}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filteredItems.length > PAGE_SIZE ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ecdcc7] bg-white px-4 py-3 text-sm text-[#536158]">
          <p>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-[#e3d0ba] bg-white px-3 py-2 font-semibold text-[#33413b] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="rounded-xl border border-[#e3d0ba] bg-white px-3 py-2 font-semibold text-[#33413b] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-sm leading-6 text-[#6f756c]">
        Thumbnail cards show only the current page of matches. Unavailable items stay visible for context but cannot be selected.
      </p>
    </div>
  );
}
