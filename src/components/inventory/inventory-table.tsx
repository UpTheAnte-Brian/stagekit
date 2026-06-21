"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { InventoryListRow } from "@/lib/db/inventory";
import { hasAnyInventoryAuditTag, isInventoryAuditTag } from "@/lib/inventory-audit";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number | null) {
  return cents == null ? "—" : currencyFormatter.format(cents / 100);
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
  returnTo,
  emptyMessage = "No inventory items found.",
  showAuditTags = false,
}: {
  items: InventoryListRow[];
  returnTo: string;
  emptyMessage?: string;
  showAuditTags?: boolean;
}) {
  const [thumbnailByItemId, setThumbnailByItemId] = useState<Record<string, string>>({});
  const itemIdsKey = items.map((item) => item.id).join(",");
  const colSpan = showAuditTags ? 9 : 8;

  useEffect(() => {
    const itemIds = itemIdsKey ? itemIdsKey.split(",") : [];

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

        console.error("Failed to load inventory thumbnails", {
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

            return (
              <tr key={item.id}>
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
                    <div className="h-12 w-12 rounded-md border border-border bg-slate-100" />
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
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
