import type { Database } from "./database";
import { isMissingSceneSchemaError, toSceneSchemaAwareError } from "./schema-compat";
import { getSupabaseClient } from "./supabase";

type SceneTemplateRow = Database["public"]["Tables"]["scene_templates"]["Row"];
type SceneTemplateItemRow = Database["public"]["Tables"]["scene_template_items"]["Row"];

export type SceneTemplateItem = Pick<
  SceneTemplateItemRow,
  "id" | "request_text" | "quantity" | "category" | "color" | "notes" | "optional" | "is_anchor" | "requested_item_id"
> & {
  requested_item_name: string | null;
  requested_item_code: string | null;
};

export type SceneTemplate = Pick<
  SceneTemplateRow,
  "id" | "slug" | "name" | "room_type" | "style_label" | "summary" | "notes" | "sort_order"
> & {
  item_count: number;
  items: SceneTemplateItem[];
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

async function buildUniqueSceneSlug(name: string) {
  const supabase = getSupabaseClient();
  const baseSlug = slugify(name) || "scene-template";
  const { data, error } = await supabase.from("scene_templates").select("slug").ilike("slug", `${baseSlug}%`);

  if (error) {
    throw toSceneSchemaAwareError(error);
  }

  const existingSlugs = new Set((data ?? []).map((row) => row.slug));
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function listSceneTemplates() {
  const supabase = getSupabaseClient();
  const { data: templates, error: templatesError } = await supabase
    .from("scene_templates")
    .select("id,slug,name,room_type,style_label,summary,notes,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (templatesError) {
    if (isMissingSceneSchemaError(templatesError)) {
      return [] as SceneTemplate[];
    }

    throw new Error(templatesError.message);
  }

  const templateIds = (templates ?? []).map((template) => template.id);
  const { data: items, error: itemsError } =
    templateIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("scene_template_items")
          .select("id,scene_template_id,request_text,quantity,category,color,notes,optional,is_anchor,requested_item_id")
          .in("scene_template_id", templateIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

  if (itemsError) {
    if (isMissingSceneSchemaError(itemsError)) {
      return [] as SceneTemplate[];
    }

    throw new Error(itemsError.message);
  }

  const requestedItemIds = [...new Set((items ?? []).map((item) => item.requested_item_id).filter((value): value is string => Boolean(value)))];
  const { data: requestedItems, error: requestedItemsError } =
    requestedItemIds.length === 0
      ? { data: [], error: null }
      : await supabase.from("inventory_items").select("id,name,item_code").in("id", requestedItemIds);

  if (requestedItemsError) {
    throw new Error(requestedItemsError.message);
  }

  const requestedItemsById = new Map((requestedItems ?? []).map((item) => [item.id, item]));
  const itemsByTemplateId = (items ?? []).reduce<Record<string, SceneTemplateItem[]>>((acc, item) => {
    const requestedItem = item.requested_item_id ? requestedItemsById.get(item.requested_item_id) : null;
    const nextItem = {
      id: item.id,
      request_text: item.request_text,
      quantity: item.quantity,
      category: item.category,
      color: item.color,
      notes: item.notes,
      optional: item.optional,
      is_anchor: item.is_anchor,
      requested_item_id: item.requested_item_id,
      requested_item_name: requestedItem?.name ?? null,
      requested_item_code: requestedItem?.item_code ?? null,
    };
    acc[item.scene_template_id] = [...(acc[item.scene_template_id] ?? []), nextItem];
    return acc;
  }, {});

  return (templates ?? []).map((template) => ({
    ...template,
    item_count: (itemsByTemplateId[template.id] ?? []).length,
    items: itemsByTemplateId[template.id] ?? [],
  })) as SceneTemplate[];
}

export async function applySceneTemplateToJob({
  jobId,
  sceneTemplateId,
  roomLabel,
  notes,
}: {
  jobId: string;
  sceneTemplateId: string;
  roomLabel: string;
  notes?: string;
}) {
  const normalizedRoomLabel = roomLabel.trim();
  if (!normalizedRoomLabel) {
    throw new Error("Room label is required to apply a scene.");
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: template, error: templateError } = await supabase
    .from("scene_templates")
    .select("id,name")
    .eq("id", sceneTemplateId)
    .eq("active", true)
    .single();

  if (templateError) {
    throw toSceneSchemaAwareError(templateError);
  }

  const { data: templateItems, error: templateItemsError } = await supabase
    .from("scene_template_items")
    .select("id,request_text,quantity,category,color,notes,optional,requested_item_id")
    .eq("scene_template_id", sceneTemplateId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (templateItemsError) {
    throw toSceneSchemaAwareError(templateItemsError);
  }

  if (!templateItems || templateItems.length === 0) {
    throw new Error("This scene does not have any template items yet.");
  }

  const { data: sceneApplication, error: sceneApplicationError } = await supabase
    .from("job_scene_applications")
    .insert({
      job_id: jobId,
      scene_template_id: sceneTemplateId,
      room_label: normalizedRoomLabel,
      notes: notes?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (sceneApplicationError) {
    throw toSceneSchemaAwareError(sceneApplicationError);
  }

  const { error: packRequestInsertError } = await supabase.from("job_pack_requests").insert(
    templateItems.map((item) => ({
      job_id: jobId,
      request_text: item.request_text,
      quantity: item.quantity,
      room: normalizedRoomLabel,
      category: item.category,
      color: item.color,
      notes: item.notes,
      optional: item.optional,
      requested_item_id: item.requested_item_id,
      scene_application_id: sceneApplication.id,
      scene_template_item_id: item.id,
      created_by: user?.id ?? null,
    })),
  );

  if (packRequestInsertError) {
    await supabase.from("job_scene_applications").delete().eq("id", sceneApplication.id);
    throw toSceneSchemaAwareError(packRequestInsertError);
  }

  return {
    sceneApplicationId: sceneApplication.id as string,
    sceneName: template.name as string,
  };
}

export async function deleteSceneApplication(sceneApplicationId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("job_scene_applications").delete().eq("id", sceneApplicationId);

  if (error) {
    throw toSceneSchemaAwareError(error);
  }
}

export async function createSceneTemplateFromJobRoom({
  jobId,
  sourceRoom,
  name,
  roomType,
  styleLabel,
  summary,
  notes,
}: {
  jobId: string;
  sourceRoom: string;
  name: string;
  roomType?: string;
  styleLabel?: string;
  summary?: string;
  notes?: string;
}) {
  const normalizedSourceRoom = sourceRoom.trim();
  const normalizedName = name.trim();
  if (!normalizedSourceRoom) {
    throw new Error("Choose a room to save as a reusable scene.");
  }

  if (!normalizedName) {
    throw new Error("Scene template name is required.");
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sourceRequests, error: sourceRequestsError } = await supabase
    .from("job_pack_requests")
    .select("request_text,quantity,category,color,notes,optional,requested_item_id,created_at")
    .eq("job_id", jobId)
    .eq("room", normalizedSourceRoom)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (sourceRequestsError) {
    throw toSceneSchemaAwareError(sourceRequestsError);
  }

  if (!sourceRequests || sourceRequests.length === 0) {
    throw new Error("That room does not have any active pack requests to save.");
  }

  const slug = await buildUniqueSceneSlug(normalizedName);
  const { data: template, error: templateError } = await supabase
    .from("scene_templates")
    .insert({
      slug,
      name: normalizedName,
      room_type: roomType?.trim() || normalizedSourceRoom,
      style_label: styleLabel?.trim() || null,
      summary: summary?.trim() || `Saved from ${normalizedSourceRoom} pack list`,
      notes: notes?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select("id,name")
    .single();

  if (templateError) {
    throw toSceneSchemaAwareError(templateError);
  }

  const { error: itemsError } = await supabase.from("scene_template_items").insert(
    sourceRequests.map((request, index) => ({
      scene_template_id: template.id,
      sort_order: (index + 1) * 10,
      request_text: request.request_text,
      quantity: request.quantity,
      category: request.category,
      color: request.color,
      notes: request.notes,
      optional: request.optional,
      requested_item_id: request.requested_item_id,
      is_anchor: index === 0,
    })),
  );

  if (itemsError) {
    await supabase.from("scene_templates").delete().eq("id", template.id);
    throw toSceneSchemaAwareError(itemsError);
  }

  return {
    sceneTemplateId: template.id as string,
    sceneName: template.name as string,
    itemCount: sourceRequests.length,
  };
}
