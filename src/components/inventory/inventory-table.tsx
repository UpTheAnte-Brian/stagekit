"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

import type { InventoryItemCondition, InventoryItemStatus, InventoryListRow } from "@/lib/db/inventory";
import { hasAnyInventoryAuditTag, isInventoryAuditTag } from "@/lib/inventory-audit";
import { getCachedInventoryThumbnails, primeInventoryThumbnailCache } from "@/lib/inventory-thumbnail-cache";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number | null) {
  return cents == null ? "—" : currencyFormatter.format(cents / 100);
}

function formatCurrencyInput(cents: number | null) {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

const statusOptions: InventoryItemStatus[] = ["available", "on_job", "packed", "maintenance", "sold", "lost"];
const conditionOptions: InventoryItemCondition[] = ["new", "like_new", "good", "fair", "rough"];

type LocationOption = {
  id: string;
  name: string;
  kind: string;
};

function locationGroupLabel(kind: string) {
  const labels: Record<string, string> = {
    warehouse: "Warehouses",
    unit: "Homes / Units",
    truck: "Trucks",
    client: "Client Sites",
    project: "Active Project Houses",
    other: "Other",
  };

  return labels[kind] ?? `${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}`;
}

function tagLabel(tag: string) {
  if (tag === "audit-unreadable-photo") return "Unreadable Photo";
  if (tag === "audit-bad-image") return "Bad Image";
  if (tag === "audit-duplicate-candidate") return "Duplicate Candidate";
  return tag;
}

function tagClass(tag: string) {
  if (tag === "audit-unreadable-photo") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (tag === "audit-bad-image") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tag === "audit-duplicate-candidate") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

type InventoryThumbnailResponse = {
  thumbnails?: Record<string, string>;
};

export function InventoryTable({
  items,
  locationOptions = [],
  onQuickUpdate,
  returnTo,
  emptyMessage = "No inventory items found.",
  showAuditTags = false,
}: {
  items: InventoryListRow[];
  locationOptions?: LocationOption[];
  onQuickUpdate?: (formData: FormData) => void | Promise<void>;
  returnTo: string;
  emptyMessage?: string;
  showAuditTags?: boolean;
}) {
  const itemIdsKey = items.map((item) => item.id).join(",");
  const [thumbnailByItemId, setThumbnailByItemId] = useState<Record<string, string>>(() =>
    getCachedInventoryThumbnails(itemIdsKey ? itemIdsKey.split(",") : []),
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const canQuickEdit = Boolean(onQuickUpdate);
  const colSpan = (showAuditTags ? 9 : 8) + (canQuickEdit ? 1 : 0);
  const locationsByKind = locationOptions.reduce<Map<string, LocationOption[]>>((groups, location) => {
    const locations = groups.get(location.kind) ?? [];
    locations.push(location);
    groups.set(location.kind, locations);
    return groups;
  }, new Map());

  useEffect(() => {
    const itemIds = itemIdsKey ? itemIdsKey.split(",") : [];

    if (itemIds.length === 0) {
      setThumbnailByItemId({});
      return;
    }

    const cachedThumbnails = getCachedInventoryThumbnails(itemIds);
    setThumbnailByItemId(cachedThumbnails);

    const missingItemIds = itemIds.filter((itemId) => !cachedThumbnails[itemId]);
    if (missingItemIds.length === 0) {
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
          body: JSON.stringify({ itemIds: missingItemIds }),
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load thumbnails: ${response.status}`);
        }

        const payload = (await response.json()) as InventoryThumbnailResponse;
        const nextThumbnails = payload.thumbnails ?? {};
        primeInventoryThumbnailCache(nextThumbnails);
        setThumbnailByItemId((current) => ({
          ...current,
          ...nextThumbnails,
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to load inventory thumbnails", {
          itemIds: missingItemIds,
          error,
        });
      }
    }

    void loadThumbnails();

    return () => {
      controller.abort();
    };
  }, [itemIdsKey]);

  return (
    <table>
      <thead>
        <tr>
          <th>Photo</th>
          <th>Name</th>
          <th>Category</th>
          {showAuditTags ? <th>Audit Tags</th> : null}
          <th>Status</th>
          <th>Disposition</th>
          <th>List Price</th>
          <th>Condition</th>
          <th>Current Location</th>
          {canQuickEdit ? (
            <th>
              <span className="sr-only">Actions</span>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td className="text-sm text-muted" colSpan={colSpan}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          items.map((item) => {
            const auditTags = (item.tags ?? []).filter((tag) => isInventoryAuditTag(tag));
            const thumbnailUrl = thumbnailByItemId[item.id];
            const isEditing = editingItemId === item.id;

            return (
              <Fragment key={item.id}>
                <tr>
                  <td>
                    {thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`${item.name} thumbnail`}
                        className="h-12 w-12 rounded-md border border-border object-cover"
                        decoding="async"
                        loading="lazy"
                        suppressHydrationWarning
                        src={thumbnailUrl}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-slate-100 p-1 text-center text-[8px] leading-tight text-muted">
                        No photo uploaded yet.
                      </div>
                    )}
                  </td>
                  <td>
                    <Link
                      className="font-medium text-accent hover:underline"
                      href={`/inventory/${item.id}?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      {item.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted">{item.item_code}</div>
                  </td>
                  <td>{item.category ?? "—"}</td>
                  {showAuditTags ? (
                    <td>
                      {hasAnyInventoryAuditTag(item.tags) ? (
                        <div className="flex flex-wrap gap-1">
                          {auditTags.map((tag) => (
                            <span key={tag} className={`rounded-full border px-2 py-1 text-xs font-medium ${tagClass(tag)}`}>
                              {tagLabel(tag)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  <td>{item.status}</td>
                  <td>{item.marked_for_disposal ? "Dispose" : "Keep"}</td>
                  <td>{formatCurrency(item.estimated_listing_price_cents)}</td>
                  <td>{item.condition}</td>
                  <td>{item.current_location_name ?? "—"}</td>
                  {canQuickEdit ? (
                    <td>
                      <button
                        aria-expanded={isEditing}
                        className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:border-accent/40"
                        onClick={() => setEditingItemId(isEditing ? null : item.id)}
                        type="button"
                      >
                        {isEditing ? "Close" : "Edit"}
                      </button>
                    </td>
                  ) : null}
                </tr>
                {isEditing && onQuickUpdate ? (
                  <tr className="bg-slate-50/80">
                    <td colSpan={colSpan}>
                      <form action={onQuickUpdate} className="rounded-xl border border-accent/20 bg-white p-4 shadow-sm">
                        <input name="item_id" type="hidden" value={item.id} />
                        <input name="return_to" type="hidden" value={returnTo} />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">Edit {item.item_code}</h3>
                            <p className="mt-1 text-sm text-muted">Update the fields shown in this list. Open the item for photos, costs, notes, and other details.</p>
                          </div>
                          <Link className="text-sm font-medium text-accent hover:underline" href={`/inventory/${item.id}?returnTo=${encodeURIComponent(returnTo)}`}>
                            Full item details
                          </Link>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <label className="text-sm font-medium text-foreground">
                            Name
                            <input className="mt-1" defaultValue={item.name} name="name" required />
                          </label>
                          <label className="text-sm font-medium text-foreground">
                            Category
                            <input className="mt-1" defaultValue={item.category ?? ""} list="inventory-category-options" name="category" />
                          </label>
                          <label className="text-sm font-medium text-foreground">
                            Status
                            <select className="mt-1" defaultValue={item.status} name="status">
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-foreground">
                            Condition
                            <select className="mt-1" defaultValue={item.condition} name="condition">
                              {conditionOptions.map((condition) => (
                                <option key={condition} value={condition}>
                                  {condition}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-foreground">
                            List price (USD)
                            <input className="mt-1" defaultValue={formatCurrencyInput(item.estimated_listing_price_cents)} inputMode="decimal" name="estimated_listing_price_cents" placeholder="0.00" />
                          </label>
                          <label className="text-sm font-medium text-foreground">
                            Current location
                            <select className="mt-1" defaultValue={item.current_location_id ?? ""} name="current_location_id">
                              <option value="">None</option>
                              {Array.from(locationsByKind.entries()).map(([kind, locations]) => (
                                <optgroup key={kind} label={locationGroupLabel(kind)}>
                                  {locations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                      {location.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </label>
                          <label className="flex items-center gap-3 rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-medium text-foreground md:mt-6">
                            <input className="h-4 w-4 shrink-0" defaultChecked={item.marked_for_disposal} name="marked_for_disposal" type="checkbox" />
                            Mark for disposal
                          </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" type="submit">
                            Save changes
                          </button>
                          <button className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground" onClick={() => setEditingItemId(null)} type="button">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );
}
