import Link from "next/link";

import { InventoryHistoryMarker } from "@/components/inventory/inventory-history-marker";
import { InventoryPagination } from "@/components/inventory/inventory-pagination";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { countItems, listItemsPage, type InventoryItemStatus } from "@/lib/db/inventory";
import { inventoryAuditTagConfig, isInventoryAuditTag, type InventoryAuditTag } from "@/lib/inventory-audit";

const statusOptions: InventoryItemStatus[] = ["available", "on_job", "packed", "maintenance", "sold", "lost"];
const INVENTORY_AUDIT_PAGE_SIZE = 50;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string): InventoryItemStatus | undefined {
  return statusOptions.includes(value as InventoryItemStatus) ? (value as InventoryItemStatus) : undefined;
}

function parseDisposition(value: string): "keep" | "dispose" | undefined {
  return value === "keep" || value === "dispose" ? value : undefined;
}

function parseAuditTag(value: string | undefined): "all" | InventoryAuditTag {
  return value === "all" || isInventoryAuditTag(value) ? value : "all";
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildAuditReturnTo(params: {
  q: string;
  tag: "all" | InventoryAuditTag;
  statusFilter?: InventoryItemStatus;
  dispositionFilter?: "keep" | "dispose";
  page: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.tag !== "all") {
    searchParams.set("tag", params.tag);
  }
  if (params.statusFilter) {
    searchParams.set("status", params.statusFilter);
  }
  if (params.dispositionFilter) {
    searchParams.set("disposition", params.dispositionFilter);
  }
  if (params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const query = searchParams.toString();
  return query.length > 0 ? `/inventory/audit?${query}` : "/inventory/audit";
}

export default async function InventoryAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = firstValue(params.q) ?? "";
  const selectedTag = parseAuditTag(firstValue(params.tag));
  const statusFilter = parseStatus(firstValue(params.status) ?? "");
  const dispositionFilter = parseDisposition(firstValue(params.disposition) ?? "");
  const page = parsePage(firstValue(params.page));

  const filters = {
    q: q || undefined,
    status: statusFilter,
    disposition: dispositionFilter,
    auditTag: selectedTag,
  };

  const [pageResult, totalAuditCount, auditCounts] = await Promise.all([
    listItemsPage(filters, {
      page,
      pageSize: INVENTORY_AUDIT_PAGE_SIZE,
    }),
    countItems({ auditTag: "all" }),
    Promise.all(
      inventoryAuditTagConfig.map(async (entry) => ({
        ...entry,
        count: await countItems({ auditTag: entry.tag }),
      })),
    ),
  ]);

  const returnTo = buildAuditReturnTo({
    q,
    tag: selectedTag,
    statusFilter,
    dispositionFilter,
    page,
  });
  const queryEntries = [
    ...(q ? ([["q", q]] as Array<[string, string]>) : []),
    ...(selectedTag !== "all" ? ([["tag", selectedTag]] as Array<[string, string]>) : []),
    ...(statusFilter ? ([["status", statusFilter]] as Array<[string, string]>) : []),
    ...(dispositionFilter ? ([["disposition", dispositionFilter]] as Array<[string, string]>) : []),
  ];

  const activeTagLabel =
    selectedTag === "all"
      ? "All Audit Items"
      : inventoryAuditTagConfig.find((entry) => entry.tag === selectedTag)?.label ?? "Audit Items";

  return (
    <section className="space-y-6">
      <InventoryHistoryMarker />

      <header className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted">Inventory Audit</p>
            <h1 className="text-2xl font-semibold">{activeTagLabel}</h1>
            <p className="mt-1 text-sm text-muted">Filter the items tagged during the audit pass and jump straight into review or deletion.</p>
          </div>
          <Link className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium" href="/inventory">
            Back to Inventory
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Link
          className={[
            "rounded-2xl border px-4 py-4 shadow-sm transition",
            selectedTag === "all" ? "border-[#173f97] bg-[#173f97] text-white" : "border-border bg-surface hover:border-accent/40",
          ].join(" ")}
          href="/inventory/audit"
        >
          <div className="text-sm font-semibold">All Audit Items</div>
          <div className="mt-1 text-2xl font-semibold">{totalAuditCount}</div>
          <div className={`mt-1 text-xs ${selectedTag === "all" ? "text-blue-100" : "text-muted"}`}>Unreadable photos, bad images, and duplicate candidates.</div>
        </Link>
        {auditCounts.map((entry) => {
          const active = selectedTag === entry.tag;
          return (
            <Link
              key={entry.tag}
              className={[
                "rounded-2xl border px-4 py-4 shadow-sm transition",
                active ? "border-[#173f97] bg-[#173f97] text-white" : "border-border bg-surface hover:border-accent/40",
              ].join(" ")}
              href={`/inventory/audit?tag=${encodeURIComponent(entry.tag)}`}
            >
              <div className="text-sm font-semibold">{entry.label}</div>
              <div className="mt-1 text-2xl font-semibold">{entry.count}</div>
              <div className={`mt-1 text-xs ${active ? "text-blue-100" : "text-muted"}`}>{entry.description}</div>
            </Link>
          );
        })}
      </section>

      <form className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm md:grid-cols-4" method="get">
        <input name="q" placeholder="Search name, SKU, item code..." defaultValue={q} />
        <select name="tag" defaultValue={selectedTag}>
          <option value="all">All audit tags</option>
          {inventoryAuditTagConfig.map((entry) => (
            <option key={entry.tag} value={entry.tag}>
              {entry.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={statusFilter ?? ""}>
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select name="disposition" defaultValue={dispositionFilter ?? ""}>
          <option value="">All disposition</option>
          <option value="keep">Keep in inventory</option>
          <option value="dispose">Marked for disposal</option>
        </select>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground md:col-span-4" type="submit">
          Apply Audit Filters
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-muted">
          {pageResult.totalCount} audit item{pageResult.totalCount === 1 ? "" : "s"}
          {selectedTag === "all" ? "" : ` in ${activeTagLabel}`}
        </div>
        <InventoryTable
          emptyMessage="No audit-tagged inventory items match these filters."
          items={pageResult.items}
          returnTo={returnTo}
          showAuditTags
        />
        <InventoryPagination
          basePath="/inventory/audit"
          page={page}
          pageSize={INVENTORY_AUDIT_PAGE_SIZE}
          queryEntries={queryEntries}
          totalCount={pageResult.totalCount}
        />
      </section>
    </section>
  );
}
