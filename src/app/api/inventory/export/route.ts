import { NextResponse } from "next/server";
import { z } from "zod";

import { listAllItemsForExport, listItemThumbnailUrls, type InventoryItemStatus } from "@/lib/db/inventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const inventoryExportQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: z.enum(["available", "on_job", "packed", "maintenance", "sold", "lost"]).optional(),
  category: z.string().trim().min(1).optional(),
  disposition: z.enum(["keep", "dispose"]).optional(),
  label: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(["created_at_desc", "name_asc"]).default("name_asc"),
  includePhotos: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((value) => value === undefined || value === "1" || value === "true"),
});

function buildDisposition(markedForDisposal: boolean) {
  return markedForDisposal ? "dispose" : "keep";
}

function buildResponseStatusSummary(items: Array<{ status: InventoryItemStatus }>) {
  const counts = new Map<InventoryItemStatus, number>();

  for (const item of items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }

  return Object.fromEntries(counts) as Partial<Record<InventoryItemStatus, number>>;
}

function buildExportFilename(filters: {
  q?: string;
  status?: string;
  category?: string;
  disposition?: string;
  label?: string;
}) {
  const dateSegment = new Date().toISOString().slice(0, 10);
  const descriptor = [filters.q, filters.status, filters.category, filters.disposition, filters.label]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return descriptor ? `inventory-export-${descriptor}-${dateSegment}.json` : `inventory-export-${dateSegment}.json`;
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = inventoryExportQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      disposition: url.searchParams.get("disposition") ?? undefined,
      label: url.searchParams.get("label") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      includePhotos: url.searchParams.get("includePhotos") ?? undefined,
    });

    const itemsForExport = await listAllItemsForExport(
      {
        q: parsed.q,
        status: parsed.status,
        category: parsed.category,
        disposition: parsed.disposition,
        label: parsed.label,
      },
      {
        sort: parsed.sort,
      },
      supabase,
    );

    const thumbnailByItemId = parsed.includePhotos
      ? await listItemThumbnailUrls(
          itemsForExport.map((item) => item.id),
          supabase,
        )
      : new Map<string, string>();

    const items = itemsForExport.map((item) => ({
      id: item.id,
      item_code: item.item_code,
      sku: item.sku,
      name: item.name,
      brand: item.brand,
      category: item.category,
      color: item.color,
      material: item.material,
      room: item.room,
      dimensions: item.dimensions,
      status: item.status,
      condition: item.condition,
      disposition: buildDisposition(item.marked_for_disposal),
      current_location_name: item.current_location_name,
      estimated_listing_price_cents: item.estimated_listing_price_cents,
      notes: item.notes,
      tags: item.tags,
      thumbnail_url: thumbnailByItemId.get(item.id) ?? null,
    }));

    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        totalCount: items.length,
        filters: {
          q: parsed.q ?? null,
          status: parsed.status ?? null,
          category: parsed.category ?? null,
          disposition: parsed.disposition ?? null,
          label: parsed.label ?? null,
          sort: parsed.sort,
          includePhotos: parsed.includePhotos,
        },
        photoUrlTtlSeconds: parsed.includePhotos ? 7 * 24 * 60 * 60 : 0,
        statusCounts: buildResponseStatusSummary(items),
      },
      items,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${buildExportFilename(parsed)}"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to export filtered inventory", error);

    return NextResponse.json(
      {
        message: "Failed to export inventory.",
      },
      { status: 400 },
    );
  }
}
