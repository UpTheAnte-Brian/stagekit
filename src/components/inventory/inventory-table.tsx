import Link from "next/link";

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

export function InventoryTable({
  items,
  thumbnailByItemId,
  returnTo,
  emptyMessage = "No inventory items found.",
  showAuditTags = false,
}: {
  items: InventoryListRow[];
  thumbnailByItemId: Map<string, string>;
  returnTo: string;
  emptyMessage?: string;
  showAuditTags?: boolean;
}) {
  const colSpan = showAuditTags ? 9 : 8;

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

            return (
              <tr key={item.id}>
                <td>
                  {thumbnailByItemId.get(item.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`${item.name} thumbnail`}
                      className="h-12 w-12 rounded-md border border-border object-cover"
                      suppressHydrationWarning
                      src={thumbnailByItemId.get(item.id)}
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
