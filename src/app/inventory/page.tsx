import Link from "next/link";
import { redirect } from "next/navigation";

import { InventoryPagination } from "@/components/inventory/inventory-pagination";
import { InventoryHistoryMarker } from "@/components/inventory/inventory-history-marker";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { FlashMessage } from "@/components/web/flash-message";
import { normalizeInventoryReturnTo } from "@/lib/inventory-navigation";
import { inventoryCategorySuggestionValues, sortInventoryCategories } from "@/lib/inventory-taxonomy";
import {
  countItems,
  createItem,
  listItemCategories,
  listInventoryLabels,
  listItemsPage,
  updateItem,
  type InventoryItemCondition,
  type InventoryItemStatus,
} from "@/lib/db/inventory";
import { inventoryAuditTagConfig } from "@/lib/inventory-audit";
import { formatInventoryLabel, needsMeasurementLabel } from "@/lib/inventory-labels";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusOptions: InventoryItemStatus[] = ["available", "on_job", "packed", "maintenance", "sold", "lost"];
const conditionOptions: InventoryItemCondition[] = ["new", "like_new", "good", "fair", "rough"];
const INVENTORY_TABLE_PAGE_SIZE = 50;

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

function parseCurrencyToCents(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replaceAll(",", "").replaceAll("$", "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return undefined;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : undefined;
}

function parseStatus(value: string): InventoryItemStatus | undefined {
  return statusOptions.includes(value as InventoryItemStatus) ? (value as InventoryItemStatus) : undefined;
}

function parseCondition(value: string): InventoryItemCondition | undefined {
  return conditionOptions.includes(value as InventoryItemCondition) ? (value as InventoryItemCondition) : undefined;
}

function parseDisposition(value: string): "keep" | "dispose" | undefined {
  return value === "keep" || value === "dispose" ? value : undefined;
}

function parseLabel(value: string) {
  return value.trim().slice(0, 80);
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildInventoryReturnTo(params: {
  q: string;
  statusFilter?: InventoryItemStatus;
  categoryFilter: string;
  dispositionFilter?: "keep" | "dispose";
  labelFilter: string;
  page: number;
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
  if (params.labelFilter) {
    searchParams.set("label", params.labelFilter);
  }
  if (params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const query = searchParams.toString();
  return query.length > 0 ? `/inventory?${query}` : "/inventory";
}

function buildInventoryExportHref(params: {
  q: string;
  statusFilter?: InventoryItemStatus;
  categoryFilter: string;
  dispositionFilter?: "keep" | "dispose";
  labelFilter: string;
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
  if (params.labelFilter) {
    searchParams.set("label", params.labelFilter);
  }
  searchParams.set("sort", "name_asc");
  searchParams.set("includePhotos", "true");

  return `/api/inventory/export?${searchParams.toString()}`;
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

async function quickUpdateItemAction(formData: FormData) {
  "use server";

  const itemId = readString(formData.get("item_id"));
  const returnTo = normalizeInventoryReturnTo(readString(formData.get("return_to"))) ?? "/inventory";
  const name = readString(formData.get("name"));
  const estimatedListingPrice = parseCurrencyToCents(readString(formData.get("estimated_listing_price_cents")));

  if (!itemId || !name) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}message=${encodeURIComponent("Item name is required.")}`);
  }

  if (estimatedListingPrice === undefined) {
    redirect(
      `${returnTo}${returnTo.includes("?") ? "&" : "?"}message=${encodeURIComponent("List price must be a valid dollar amount.")}`,
    );
  }

  await updateItem(itemId, {
    name,
    category: toNullableText(readString(formData.get("category"))),
    status: parseStatus(readString(formData.get("status"))),
    condition: parseCondition(readString(formData.get("condition"))),
    marked_for_disposal: formData.get("marked_for_disposal") === "on",
    estimated_listing_price_cents: estimatedListingPrice,
    current_location_id: toNullableText(readString(formData.get("current_location_id"))),
  });

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}message=${encodeURIComponent("Item updated.")}`);
}

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = firstValue(params.q) ?? "";
  const statusFilter = parseStatus(firstValue(params.status) ?? "");
  const categoryFilter = firstValue(params.category) ?? "";
  const dispositionFilter = parseDisposition(firstValue(params.disposition) ?? "");
  const labelFilter = parseLabel(firstValue(params.label) ?? "");
  const page = parsePage(firstValue(params.page));
  const message = firstValue(params.message);

  const filters = {
    q: q || undefined,
    status: statusFilter,
    category: categoryFilter || undefined,
    disposition: dispositionFilter,
    label: labelFilter || undefined,
  };

  const supabase = await createServerSupabaseClient();
  const [pageResult, totalInventoryCount, itemCategories, itemLabels, auditCounts, measurementCount, locationResult] = await Promise.all([
    listItemsPage(filters, {
      page,
      pageSize: INVENTORY_TABLE_PAGE_SIZE,
    }),
    countItems(),
    listItemCategories(),
    listInventoryLabels(),
    Promise.all(
      inventoryAuditTagConfig.map(async (entry) => ({
        ...entry,
        count: await countItems({ auditTag: entry.tag }),
      })),
    ),
    countItems({ label: needsMeasurementLabel }),
    supabase.from("locations").select("id,name,kind").order("kind", { ascending: true }).order("name", { ascending: true }),
  ]);

  if (locationResult.error) {
    throw new Error(`Failed to load locations: ${locationResult.error.message}`);
  }

  const categories = sortInventoryCategories([
    ...new Set([
      ...inventoryCategorySuggestionValues,
      ...itemCategories,
    ]),
  ]);
  const inventoryReturnTo = buildInventoryReturnTo({
    q,
    statusFilter,
    categoryFilter,
    dispositionFilter,
    labelFilter,
    page,
  });
  const inventoryExportHref = buildInventoryExportHref({
    q,
    statusFilter,
    categoryFilter,
    dispositionFilter,
    labelFilter,
  });
  const queryEntries = [
    ...(q ? ([["q", q]] as Array<[string, string]>) : []),
    ...(statusFilter ? ([["status", statusFilter]] as Array<[string, string]>) : []),
    ...(categoryFilter ? ([["category", categoryFilter]] as Array<[string, string]>) : []),
    ...(dispositionFilter ? ([["disposition", dispositionFilter]] as Array<[string, string]>) : []),
    ...(labelFilter ? ([["label", labelFilter]] as Array<[string, string]>) : []),
  ];
  const showingCountLabel =
    pageResult.totalCount === totalInventoryCount
      ? `${pageResult.totalCount} item${pageResult.totalCount === 1 ? "" : "s"}`
      : `${pageResult.totalCount} matching item${pageResult.totalCount === 1 ? "" : "s"} of ${totalInventoryCount}`;

  return (
    <section className="space-y-6">
      <InventoryHistoryMarker />

      {message ? <FlashMessage message={message} tone={message.toLowerCase().includes("updated") ? "success" : "warning"} /> : null}

      <form className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm lg:grid-cols-7" method="get">
        <datalist id="inventory-category-options">
          {categories.map((category) => (
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
        <select name="label" defaultValue={labelFilter}>
          <option value="">All labels</option>
          {itemLabels.map((label) => (
            <option key={label} value={label}>
              {formatInventoryLabel(label)}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" type="submit">
          Apply Filters
        </button>
        <Link
          className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-accent/40"
          href={inventoryExportHref}
        >
          Export JSON + Thumbnails
        </Link>
      </form>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Measurement Queue</h2>
            <p className="text-sm text-muted">Create labels on any item, starting with a one-click “Needs measurement” marker.</p>
          </div>
          <Link
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:border-amber-400"
            href={`/inventory?label=${encodeURIComponent(needsMeasurementLabel)}`}
          >
            Needs measurement ({measurementCount})
          </Link>
        </div>
      </section>

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
        <p className="mt-1 text-sm text-muted">
          StageKit assigns the item code automatically when you save. Leave the optional SKU blank unless the item already has a vendor or barcode reference.
        </p>
        <form action={createItemAction} className="mt-3 grid gap-3 md:grid-cols-5">
          <input name="name" placeholder="Name" required />
          <input aria-label="Optional external SKU" name="sku" placeholder="Optional SKU (vendor/barcode)" />
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
        <InventoryTable
          items={pageResult.items}
          locationOptions={(locationResult.data ?? []).map((location) => ({
            id: location.id,
            name: location.name,
            kind: location.kind,
          }))}
          onQuickUpdate={quickUpdateItemAction}
          returnTo={inventoryReturnTo}
        />
        <InventoryPagination
          basePath="/inventory"
          page={page}
          pageSize={INVENTORY_TABLE_PAGE_SIZE}
          queryEntries={queryEntries}
          totalCount={pageResult.totalCount}
        />
      </section>
    </section>
  );
}
