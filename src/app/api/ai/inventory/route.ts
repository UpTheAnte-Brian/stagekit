import { NextResponse } from "next/server";
import { z } from "zod";

import { listItemsForExport, listItemThumbnailUrls, type InventoryItemStatus } from "@/lib/db/inventory";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

const inventoryExportQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: z.enum(["available", "on_job", "packed", "maintenance", "sold", "lost"]).optional(),
  category: z.string().trim().min(1).optional(),
  disposition: z.enum(["keep", "dispose"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(250),
  sort: z.enum(["created_at_desc", "name_asc"]).default("name_asc"),
  includePhotos: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((value) => value === undefined || value === "1" || value === "true"),
});

function getRequiredEnv(name: "AI_INVENTORY_EXPORT_TOKEN") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

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

export async function GET(request: Request) {
  try {
    const expectedToken = getRequiredEnv("AI_INVENTORY_EXPORT_TOKEN");
    const providedToken = readBearerToken(request);

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = inventoryExportQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      disposition: url.searchParams.get("disposition") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      includePhotos: url.searchParams.get("includePhotos") ?? undefined,
    });

    const supabase = createServiceRoleSupabaseClient();
    const pageResult = await listItemsForExport(
      {
        q: parsed.q,
        status: parsed.status,
        category: parsed.category,
        disposition: parsed.disposition,
      },
      {
        page: parsed.page,
        pageSize: parsed.pageSize,
        sort: parsed.sort,
      },
      supabase,
    );

    const thumbnailByItemId = parsed.includePhotos
      ? await listItemThumbnailUrls(
          pageResult.items.map((item) => item.id),
          supabase,
        )
      : new Map<string, string>();

    const items = pageResult.items.map((item) => ({
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

    return NextResponse.json(
      {
        meta: {
          exportedAt: new Date().toISOString(),
          page: parsed.page,
          pageSize: parsed.pageSize,
          totalCount: pageResult.totalCount,
          returnedCount: items.length,
          totalPages: Math.max(1, Math.ceil(pageResult.totalCount / parsed.pageSize)),
          filters: {
            q: parsed.q ?? null,
            status: parsed.status ?? null,
            category: parsed.category ?? null,
            disposition: parsed.disposition ?? null,
            sort: parsed.sort,
            includePhotos: parsed.includePhotos,
          },
          photoUrlTtlSeconds: parsed.includePhotos ? 7 * 24 * 60 * 60 : 0,
          statusCountsOnPage: buildResponseStatusSummary(items),
        },
        items,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to build AI inventory export", error);

    return NextResponse.json(
      {
        message: "Failed to export inventory.",
      },
      { status: 400 },
    );
  }
}
