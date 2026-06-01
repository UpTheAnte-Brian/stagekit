import Link from "next/link";
import { redirect } from "next/navigation";

import { InventoryHistoryMarker } from "@/components/inventory/inventory-history-marker";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { inventoryCategorySuggestionValues, sortInventoryCategories } from "@/lib/inventory-taxonomy";
import {
  createItem,
  listItemThumbnailUrls,
  listItems,
  type InventoryItemCondition,
  type InventoryItemStatus,
} from "@/lib/db/inventory";
import { inventoryAuditTagConfig } from "@/lib/inventory-audit";

const statusOptions: InventoryItemStatus[] = ["available", "on_job", "packed", "maintenance", "sold", "lost"];
const conditionOptions: InventoryItemCondition[] = ["new", "like_new", "good", "fair", "rough"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableText(value: string) {
  return value.length > 0 ? value : null;
}

function parseStatus(value: string): InventoryItemStatus | undefined {
  return statusOptions.includes(value as InventoryItemStatus) ? (value as InventoryItemStatus) : undefined;
}

function parseCondition(value: string): InventoryItemCondition | undefined {
  return conditionOptions.includes(value as InventoryItemCondition) ? (value as InventoryItemCondition) : undefined;
}

function parseDisposition(value: string) {
  return value === "keep" || value === "dispose" ? value : undefined;
}

function buildInventoryReturnTo(params: {
  q: string;
  statusFilter?: InventoryItemStatus;
  categoryFilter: string;
  dispositionFilter?: "keep" | "dispose";
}) {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.statusFilter) {
    searchParams.set("status", params.statusFilter);
  }
  if (params.categoryFilter) {
    searchParams.set("category", params.categoryFilter);
  }
  if (params.dispositionFilter) {
    searchParams.set("disposition", params.dispositionFilter);
  }

  const query = searchParams.toString();
  return query.length > 0 ? `/inventory?${query}` : "/inventory";
}

async function createItemAction(formData: FormData) {
  "use server";

  const name = readString(formData.get("name"));
  if (!name) {
    redirect(`/inventory?message=${encodeURIComponent("Item name is required.")}`);
  }

  const status = parseStatus(readString(formData.get("status")));
  const condition = parseCondition(readString(formData.get("condition")));

  const item = await createItem({
    name,
    sku: toNullableText(readString(formData.get("sku"))),
    category: toNullableText(readString(formData.get("category"))),
    status,
    condition,
  });

  redirect(`/inventory/${item.id}`);
}

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = firstValue(params.q) ?? "";
  const statusFilter = parseStatus(firstValue(params.status) ?? "");
  const categoryFilter = firstValue(params.category) ?? "";
  const dispositionFilter = parseDisposition(firstValue(params.disposition) ?? "");
  const message = firstValue(params.message);

  const [items, allItems] = await Promise.all([
    listItems({
      q: q || undefined,
      status: statusFilter,
      category: categoryFilter || undefined,
      disposition: dispositionFilter,
    }),
    listItems(),
  ]);

  const categories = sortInventoryCategories([
    ...new Set([
      ...inventoryCategorySuggestionValues,
      ...allItems.map((item) => item.category).filter((value): value is string => Boolean(value)),
    ]),
  ]);
  const inventoryReturnTo = buildInventoryReturnTo({
    q,
    statusFilter,
    categoryFilter,
    dispositionFilter,
  });
  const showingCountLabel =
    items.length === allItems.length
      ? `Showing ${items.length} item${items.length === 1 ? "" : "s"}`
      : `Showing ${items.length} of ${allItems.length} item${allItems.length === 1 ? "" : "s"}`;
  const thumbnailByItemId = await listItemThumbnailUrls(items.map((item) => item.id));
  const auditCounts = inventoryAuditTagConfig.map((entry) => ({
    ...entry,
    count: allItems.filter((item) => item.tags.includes(entry.tag)).length,
  }));

  return (
    <section className="space-y-6">
      <InventoryHistoryMarker />

      {message ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>
      ) : null}

      <form className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm md:grid-cols-5" method="get">
        <datalist id="inventory-category-options">
          {inventoryCategorySuggestionValues.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <input name="q" placeholder="Search name, sku, brand..." defaultValue={q} />
        <select name="status" defaultValue={statusFilter ?? ""}>
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={categoryFilter}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select name="disposition" defaultValue={dispositionFilter ?? ""}>
          <option value="">All disposition</option>
          <option value="keep">Keep in inventory</option>
          <option value="dispose">Marked for disposal</option>
        </select>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" type="submit">
          Apply Filters
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Audit Queue</h2>
            <p className="text-sm text-muted">Open the filtered review screen for duplicate candidates, bad images, and unreadable-photo items.</p>
          </div>
          <Link className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/inventory/audit">
            Open Audit Queue
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {auditCounts.map((entry) => (
            <Link
              key={entry.tag}
              className="rounded-xl border border-border/70 bg-slate-50 px-4 py-3 transition hover:border-accent/40 hover:bg-white"
              href={`/inventory/audit?tag=${encodeURIComponent(entry.tag)}`}
            >
              <div className="text-sm font-semibold text-foreground">{entry.label}</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{entry.count}</div>
              <div className="mt-1 text-xs text-muted">{entry.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Add Item</h2>
        <form action={createItemAction} className="mt-3 grid gap-3 md:grid-cols-5">
          <input name="name" placeholder="Name" required />
          <input name="sku" placeholder="SKU" />
          <input list="inventory-category-options" name="category" placeholder="Tables / Coffee" />
          <select name="status" defaultValue="available">
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select name="condition" defaultValue="good">
            {conditionOptions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground md:col-span-5" type="submit">
            Add Item
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-muted">{showingCountLabel}</div>
        <InventoryTable items={items} returnTo={inventoryReturnTo} thumbnailByItemId={thumbnailByItemId} />
      </section>
    </section>
  );
}
