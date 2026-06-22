import "server-only";

import { z } from "zod";

import { inventoryAuditTagValues, type InventoryAuditTag } from "@/lib/inventory-audit";
import { canonicalizeInventoryCategory } from "@/lib/inventory-taxonomy";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type InventoryItemRow = Database["public"]["Tables"]["inventory_items"]["Row"];
type InventoryItemInsert = Database["public"]["Tables"]["inventory_items"]["Insert"];
type InventoryItemUpdate = Database["public"]["Tables"]["inventory_items"]["Update"];
type InventoryPhotoRow = Database["public"]["Tables"]["inventory_photos"]["Row"];

const inventoryStatusSchema = z.enum(["available", "on_job", "packed", "maintenance", "sold", "lost"]);
const inventoryConditionSchema = z.enum(["new", "like_new", "good", "fair", "rough"]);
const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const INVENTORY_PAGE_SIZE = 500;

const listItemsSchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: inventoryStatusSchema.optional(),
  category: z.string().trim().min(1).optional(),
  disposition: z.enum(["keep", "dispose"]).optional(),
  auditTag: z.enum([...inventoryAuditTagValues, "all"]).optional(),
});

const createItemSchema = z.object({
  sku: z.string().trim().min(1).max(120).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  color: z.string().trim().max(120).nullable().optional(),
  material: z.string().trim().max(120).nullable().optional(),
  dimensions: z.string().trim().max(120).nullable().optional(),
  status: inventoryStatusSchema.optional(),
  condition: inventoryConditionSchema.optional(),
  marked_for_disposal: z.boolean().optional(),
  estimated_listing_price_cents: z.number().int().nonnegative().nullable().optional(),
  purchase_price_cents: z.number().int().nonnegative().nullable().optional(),
  replacement_cost_cents: z.number().int().nonnegative().nullable().optional(),
  purchase_date: dateSchema.nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  home_location_id: uuidSchema.nullable().optional(),
  current_location_id: uuidSchema.nullable().optional(),
});

const updateItemSchema = createItemSchema.partial();
const addPhotoRowSchema = z.object({
  itemId: uuidSchema,
  storagePath: z.string().trim().min(1),
  sortOrder: z.number().int().nonnegative().default(0),
});
const removeAuditTagSchema = z.object({
  itemId: uuidSchema,
  tag: z.enum(inventoryAuditTagValues),
});

const assignItemSchema = z.object({
  jobId: uuidSchema,
  itemId: uuidSchema,
});

const checkInItemSchema = z.object({
  jobItemId: uuidSchema,
});

export type InventoryItemStatus = z.infer<typeof inventoryStatusSchema>;
export type InventoryItemCondition = z.infer<typeof inventoryConditionSchema>;

export type ListItemsParams = z.input<typeof listItemsSchema>;

export type InventoryListRow = Pick<
  InventoryItemRow,
  | "id"
  | "sku"
  | "item_code"
  | "name"
  | "category"
  | "status"
  | "condition"
  | "current_location_id"
  | "marked_for_disposal"
  | "estimated_listing_price_cents"
  | "tags"
> & {
  current_location_name: string | null;
};

export type PaginatedInventoryItems = {
  items: InventoryListRow[];
  totalCount: number;
};

type InventoryItemsFilterQuery = {
  contains: (...args: unknown[]) => InventoryItemsFilterQuery;
  eq: (...args: unknown[]) => InventoryItemsFilterQuery;
  or: (...args: unknown[]) => InventoryItemsFilterQuery;
  overlaps: (...args: unknown[]) => InventoryItemsFilterQuery;
};

type InventoryItemsListQuery = InventoryItemsFilterQuery & {
  order: (...args: unknown[]) => InventoryItemsListQuery;
  range: (from: number, to: number) => Promise<{
    data: unknown[] | null;
    error: { message: string } | null;
    count?: number | null;
  }>;
};

function assertNoError(error: { message: string } | null, label: string) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function assertData<T>(data: T | null, label: string) {
  if (!data) {
    throw new Error(`${label}: empty response`);
  }
  return data;
}

async function listInventoryItemRows<T>(
  selectClause: string,
  configure?: (query: InventoryItemsListQuery) => InventoryItemsListQuery,
) {
  const supabase = await createServerSupabaseClient();
  const rows: T[] = [];

  for (let from = 0; ; from += INVENTORY_PAGE_SIZE) {
    let query: InventoryItemsListQuery = supabase.from("inventory_items").select(selectClause) as unknown as InventoryItemsListQuery;
    if (configure) {
      query = configure(query);
    }

    const { data, error } = await query.range(from, from + INVENTORY_PAGE_SIZE - 1);
    assertNoError(error, "Failed to list inventory items");

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < INVENTORY_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function applyListItemFilters<T extends InventoryItemsFilterQuery>(query: T, parsed: z.output<typeof listItemsSchema>) {
  let next = query;

  if (parsed.q) {
    const term = parsed.q.replaceAll(",", " ");
    next = next.or(`name.ilike.%${term}%,sku.ilike.%${term}%,item_code.ilike.%${term}%,brand.ilike.%${term}%`) as T;
  }

  if (parsed.status) {
    next = next.eq("status", parsed.status) as T;
  }

  if (parsed.category) {
    next = next.eq("category", canonicalizeInventoryCategory(parsed.category) ?? parsed.category) as T;
  }

  if (parsed.disposition === "dispose") {
    next = next.eq("marked_for_disposal", true) as T;
  }

  if (parsed.disposition === "keep") {
    next = next.eq("marked_for_disposal", false) as T;
  }

  if (parsed.auditTag === "all") {
    next = next.overlaps("tags", inventoryAuditTagValues) as T;
  } else if (parsed.auditTag) {
    next = next.contains("tags", [parsed.auditTag]) as T;
  }

  return next;
}

async function attachLocationNames<
  T extends Pick<InventoryItemRow, "current_location_id" | "id" | "sku" | "item_code" | "name" | "category" | "status" | "condition" | "marked_for_disposal" | "estimated_listing_price_cents" | "tags">
>(rows: T[]) {
  const supabase = await createServerSupabaseClient();
  const locationIds = [
    ...new Set(rows.map((row) => row.current_location_id).filter((value): value is string => Boolean(value))),
  ];

  const locationNamesById = new Map<string, string>();
  if (locationIds.length > 0) {
    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("id,name")
      .in("id", locationIds);
    assertNoError(locationsError, "Failed to load locations");
    (locations ?? []).forEach((location) => {
      locationNamesById.set(location.id, location.name);
    });
  }

  return rows.map((row) => ({
    ...row,
    current_location_name: row.current_location_id ? locationNamesById.get(row.current_location_id) ?? null : null,
  })) as InventoryListRow[];
}

export async function countItems(params: ListItemsParams = {}) {
  const parsed = listItemsSchema.parse(params);
  const supabase = await createServerSupabaseClient();
  const query = applyListItemFilters(
    supabase.from("inventory_items").select("id", { count: "exact", head: true }) as unknown as InventoryItemsFilterQuery,
    parsed,
  ) as unknown as Promise<{ count: number | null; error: { message: string } | null }>;

  const { count, error } = await query;
  assertNoError(error, "Failed to count inventory items");
  return count ?? 0;
}

export async function listItemsPage(
  params: ListItemsParams = {},
  pagination: {
    page: number;
    pageSize: number;
  },
): Promise<PaginatedInventoryItems> {
  const parsed = listItemsSchema.parse(params);
  const supabase = await createServerSupabaseClient();
  const from = Math.max(0, (pagination.page - 1) * pagination.pageSize);
  const to = from + pagination.pageSize - 1;

  let query = supabase
    .from("inventory_items")
    .select("id,sku,item_code,name,category,status,condition,current_location_id,marked_for_disposal,estimated_listing_price_cents,tags", {
      count: "exact",
    }) as unknown as InventoryItemsListQuery;

  query = applyListItemFilters(query, parsed).order("created_at", { ascending: false }) as InventoryItemsListQuery;

  const { data, error, count } = await query.range(from, to);
  assertNoError(error, "Failed to list inventory items");

  const items = await attachLocationNames(
    ((data ?? []) as Array<
      Pick<
        InventoryItemRow,
        | "id"
        | "sku"
        | "item_code"
        | "name"
        | "category"
        | "status"
        | "condition"
        | "current_location_id"
        | "marked_for_disposal"
        | "estimated_listing_price_cents"
        | "tags"
      >
    >),
  );

  return {
    items,
    totalCount: count ?? 0,
  };
}

export async function listItemCategories() {
  const rows = await listInventoryItemRows<Pick<InventoryItemRow, "category">>("category", (query) =>
    query.order("category", { ascending: true }),
  );

  return [...new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value)))];
}

export async function listItems(params: ListItemsParams = {}) {
  const parsed = listItemsSchema.parse(params);
  const rows = await listInventoryItemRows<Pick<
    InventoryItemRow,
    "id" | "sku" | "item_code" | "name" | "category" | "status" | "condition" | "current_location_id" | "marked_for_disposal" | "estimated_listing_price_cents" | "tags"
  >>("id,sku,item_code,name,category,status,condition,current_location_id,marked_for_disposal,estimated_listing_price_cents,tags", (query) =>
    applyListItemFilters(query, parsed).order("created_at", { ascending: false }) as InventoryItemsListQuery,
  );

  return attachLocationNames(rows);
}

const STORAGE_SIGN_BATCH_SIZE = 100;
const PHOTO_QUERY_BATCH_SIZE = 100;

export async function listItemThumbnailUrls(itemIds: string[]) {
  const supabase = await createServerSupabaseClient();
  const thumbnailByItemId = new Map<string, string>();

  if (itemIds.length === 0) {
    return thumbnailByItemId;
  }

  const photos: Array<{
    item_id: string;
    storage_bucket: string;
    storage_path: string;
    sort_order: number;
    created_at: string;
  }> = [];

  for (let from = 0; from < itemIds.length; from += PHOTO_QUERY_BATCH_SIZE) {
    const itemIdBatch = itemIds.slice(from, from + PHOTO_QUERY_BATCH_SIZE);
    const { data: photoBatch, error: photosError } = await supabase
      .from("inventory_photos")
      .select("item_id,storage_bucket,storage_path,sort_order,created_at")
      .in("item_id", itemIdBatch)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (photosError) {
      throw new Error(`Failed to load inventory thumbnails: ${photosError.message}`);
    }

    photos.push(...(photoBatch ?? []));
  }

  const firstPhotoByItemId = new Map<string, { bucket: string; path: string }>();
  for (const photo of photos) {
    if (!photo.storage_bucket || !photo.storage_path) {
      continue;
    }

    if (!firstPhotoByItemId.has(photo.item_id)) {
      firstPhotoByItemId.set(photo.item_id, {
        bucket: photo.storage_bucket,
        path: photo.storage_path,
      });
    }
  }

  const pathsByBucket = new Map<string, string[]>();
  firstPhotoByItemId.forEach((photo) => {
    const currentPaths = pathsByBucket.get(photo.bucket) ?? [];
    currentPaths.push(photo.path);
    pathsByBucket.set(photo.bucket, currentPaths);
  });

  const signedUrlByBucketAndPath = new Map<string, string>();
  await Promise.all(
    Array.from(pathsByBucket.entries()).map(async ([bucket, paths]) => {
      if (paths.length === 0) return;
      try {
        for (let from = 0; from < paths.length; from += STORAGE_SIGN_BATCH_SIZE) {
          const pathBatch = paths.slice(from, from + STORAGE_SIGN_BATCH_SIZE);
          const { data, error } = await supabase.storage.from(bucket).createSignedUrls(pathBatch, 60 * 60);
          if (error) {
            throw error;
          }

          (data ?? []).forEach((entry, index) => {
            if (entry.signedUrl) {
              signedUrlByBucketAndPath.set(`${bucket}:${pathBatch[index]}`, entry.signedUrl);
            }
          });
        }
      } catch (error) {
        console.error("Failed to sign inventory thumbnails", {
          bucket,
          count: paths.length,
          error,
        });
      }
    }),
  );

  firstPhotoByItemId.forEach((photo, itemId) => {
    const signedUrl = signedUrlByBucketAndPath.get(`${photo.bucket}:${photo.path}`);
    if (signedUrl) {
      thumbnailByItemId.set(itemId, signedUrl);
    }
  });

  return thumbnailByItemId;
}

export async function getItem(id: string) {
  const parsedId = uuidSchema.parse(id);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("inventory_items").select("*").eq("id", parsedId).maybeSingle();
  assertNoError(error, "Failed to load inventory item");
  return data;
}

export async function createItem(payload: InventoryItemInsert) {
  const parsedPayload = createItemSchema.parse(payload);
  const normalizedPayload = {
    ...parsedPayload,
    category: canonicalizeInventoryCategory(parsedPayload.category),
  };
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.from("inventory_items").insert(normalizedPayload).select("*").single();
  assertNoError(error, "Failed to create inventory item");
  return assertData(data, "Failed to create inventory item");
}

export async function updateItem(id: string, payload: InventoryItemUpdate) {
  const parsedId = uuidSchema.parse(id);
  const parsedPayload = updateItemSchema.parse(payload);
  const normalizedPayload = {
    ...parsedPayload,
    category:
      Object.prototype.hasOwnProperty.call(parsedPayload, "category")
        ? canonicalizeInventoryCategory(parsedPayload.category)
        : parsedPayload.category,
  };
  const supabase = await createServerSupabaseClient();

  if (Object.keys(normalizedPayload).length === 0) {
    return getItem(parsedId);
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .update(normalizedPayload)
    .eq("id", parsedId)
    .select("*")
    .single();
  assertNoError(error, "Failed to update inventory item");
  return assertData(data, "Failed to update inventory item");
}

export async function removeInventoryAuditTag(itemId: string, tag: InventoryAuditTag) {
  const parsed = removeAuditTagSchema.parse({ itemId, tag });
  const item = await getItem(parsed.itemId);

  if (!item) {
    throw new Error("Inventory item not found.");
  }

  const existingTags = Array.isArray(item.tags) ? item.tags : [];
  const nextTags = existingTags.filter((existingTag) => existingTag !== parsed.tag);

  if (nextTags.length === existingTags.length) {
    return item;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .update({ tags: nextTags })
    .eq("id", parsed.itemId)
    .select("*")
    .single();
  assertNoError(error, "Failed to remove inventory audit tag");
  return assertData(data, "Failed to remove inventory audit tag");
}

export async function listPhotos(itemId: string) {
  const parsedItemId = uuidSchema.parse(itemId);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_photos")
    .select("*")
    .eq("item_id", parsedItemId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  assertNoError(error, "Failed to list photos");
  return (data ?? []) as InventoryPhotoRow[];
}

export async function addPhotoRow(itemId: string, storagePath: string, sortOrder = 0) {
  const parsed = addPhotoRowSchema.parse({ itemId, storagePath, sortOrder });
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_photos")
    .insert({
      item_id: parsed.itemId,
      storage_path: parsed.storagePath,
      sort_order: parsed.sortOrder,
      storage_bucket: "inventory",
    })
    .select("*")
    .single();

  assertNoError(error, "Failed to add photo row");
  return assertData(data, "Failed to add photo row");
}

export async function deleteItem(id: string) {
  const parsedId = uuidSchema.parse(id);
  const supabase = await createServerSupabaseClient();

  const { data: photos, error: photosError } = await supabase
    .from("inventory_photos")
    .select("storage_bucket,storage_path")
    .eq("item_id", parsedId);
  assertNoError(photosError, "Failed to load inventory photos");

  const pathsByBucket = new Map<string, string[]>();
  (photos ?? []).forEach((photo) => {
    const bucketPaths = pathsByBucket.get(photo.storage_bucket) ?? [];
    bucketPaths.push(photo.storage_path);
    pathsByBucket.set(photo.storage_bucket, bucketPaths);
  });

  for (const [bucket, storagePaths] of pathsByBucket.entries()) {
    if (storagePaths.length === 0) continue;
    const { error } = await supabase.storage.from(bucket).remove(storagePaths);
    assertNoError(error, "Failed to remove inventory photo files");
  }

  const { error: pickItemsError } = await supabase.from("job_pick_items").delete().eq("item_id", parsedId);
  assertNoError(pickItemsError, "Failed to delete job pick rows");

  const { error: jobItemsError } = await supabase.from("job_items").delete().eq("item_id", parsedId);
  assertNoError(jobItemsError, "Failed to delete job item rows");

  const { error: packRequestsError } = await supabase.from("job_pack_requests").update({ requested_item_id: null }).eq("requested_item_id", parsedId);
  assertNoError(packRequestsError, "Failed to clear pack request links");

  const { error: photoRowsError } = await supabase.from("inventory_photos").delete().eq("item_id", parsedId);
  assertNoError(photoRowsError, "Failed to delete inventory photo rows");

  const { error: itemError } = await supabase.from("inventory_items").delete().eq("id", parsedId);
  assertNoError(itemError, "Failed to delete inventory item");
}

export async function assignItemToJob(jobId: string, itemId: string) {
  const parsed = assignItemSchema.parse({ jobId, itemId });
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activeAssignment, error: activeAssignmentError } = await supabase
    .from("job_items")
    .select("id,job_id")
    .eq("item_id", parsed.itemId)
    .is("checked_in_at", null)
    .maybeSingle();
  assertNoError(activeAssignmentError, "Failed to check current assignment");
  if (activeAssignment) {
    throw new Error(activeAssignment.job_id === parsed.jobId ? "Item is already assigned to this job." : "Item is already assigned to another active job.");
  }

  const { data: item, error: itemError } = await supabase.from("inventory_items").select("id,status").eq("id", parsed.itemId).single();
  assertNoError(itemError, "Failed to load inventory item");
  if (!item || item.status !== "available") {
    throw new Error(`Item is not available. Current status: ${item?.status ?? "unknown"}.`);
  }

  const { data, error } = await supabase
    .from("job_items")
    .insert({
      job_id: parsed.jobId,
      item_id: parsed.itemId,
      checked_out_by: user?.id ?? null,
    })
    .select("*")
    .single();
  assertNoError(error, "Failed to assign item to job");

  const { error: itemStatusError } = await supabase
    .from("inventory_items")
    .update({ status: "on_job" })
    .eq("id", parsed.itemId);
  assertNoError(itemStatusError, "Failed to update item status to on_job");

  return assertData(data, "Failed to assign item to job");
}

export async function checkInItem(jobItemId: string) {
  const parsed = checkInItemSchema.parse({ jobItemId });
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jobItem, error: loadError } = await supabase
    .from("job_items")
    .select("id,item_id,checked_in_at")
    .eq("id", parsed.jobItemId)
    .single();
  assertNoError(loadError, "Failed to load job item");
  const checkedOutJobItem = assertData(jobItem, "Failed to load job item");

  const checkInTimestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("job_items")
    .update({
      checked_in_at: checkInTimestamp,
      checked_in_by: user?.id ?? null,
    })
    .eq("id", parsed.jobItemId)
    .select("*")
    .single();
  assertNoError(error, "Failed to check in job item");

  const { error: itemStatusError } = await supabase
    .from("inventory_items")
    .update({ status: "available" })
    .eq("id", checkedOutJobItem.item_id);
  assertNoError(itemStatusError, "Failed to update item status to available");

  return assertData(data, "Failed to check in job item");
}
