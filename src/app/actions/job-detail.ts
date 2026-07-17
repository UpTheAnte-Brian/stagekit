"use server";

import { redirect } from "next/navigation";

import {
  applySceneTemplateToJob,
  createJobPickItem,
  createPackRequest,
  createSceneTemplateFromJobRoom,
  deleteJobPickItem,
  deletePackRequest,
  deleteSceneApplication,
  linkRequestedItemToPackRequest,
  togglePackRequestOptional,
  updateJob,
  updateJobStatus,
  updatePackRequest,
  updatePackRequestStatus,
} from "@/lib/db/job-details";
import { assignItemToJob, checkInItem, createItem, type InventoryItemCondition } from "@/lib/db/inventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const projectStatuses = ["active", "completed", "archived", "cancelled"] as const;
const inventoryConditionOptions: InventoryItemCondition[] = ["new", "like_new", "good", "fair", "rough"];

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function parseInventoryCondition(value: string) {
  return inventoryConditionOptions.includes(value as InventoryItemCondition) ? (value as InventoryItemCondition) : "good";
}

function buildJobSectionHash(section?: string) {
  return section ? `#${section}` : "";
}

function buildJobUrl(
  jobId: string,
  {
    message,
    tone,
    section,
    editRequestId,
  }: {
    message?: string;
    tone?: "success" | "error";
    section?: string;
    editRequestId?: string | null;
  } = {},
) {
  const params = new URLSearchParams();

  if (message) {
    params.set("message", message);
  }
  if (tone) {
    params.set("tone", tone);
  }
  if (section) {
    params.set("section", section);
  }
  if (editRequestId) {
    params.set("edit_request", editRequestId);
  }

  const query = params.toString();
  const basePath = query ? `/jobs/${jobId}?${query}` : `/jobs/${jobId}`;
  return `${basePath}${buildJobSectionHash(section)}`;
}

function readJobId(formData: FormData) {
  const jobId = readString(formData.get("job_id"));
  if (!jobId) {
    redirect("/jobs?message=Project%20id%20is%20required.");
  }
  return jobId;
}

async function resolveRequestedItem(itemId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("inventory_items").select("name,category,color").eq("id", itemId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateJobAction(formData: FormData) {
  const jobId = readJobId(formData);
  const name = readString(formData.get("name"));
  const status = readString(formData.get("status"));

  if (!name) {
    redirect(buildJobUrl(jobId, { message: "Project name is required.", tone: "error", section: "edit-project" }));
  }
  if (!status) {
    redirect(buildJobUrl(jobId, { message: "Project status is required.", tone: "error", section: "edit-project" }));
  }
  if (!projectStatuses.includes(status as (typeof projectStatuses)[number])) {
    redirect(buildJobUrl(jobId, { message: "Choose a valid project status.", tone: "error", section: "edit-project" }));
  }

  try {
    await updateJob({
      jobId,
      name,
      address1: readString(formData.get("address1")),
      address2: readString(formData.get("address2")),
      city: readString(formData.get("city")),
      state: readString(formData.get("state")),
      postal: readString(formData.get("postal")),
      notes: readString(formData.get("notes")),
      status,
    });
    redirect(buildJobUrl(jobId, { message: "Project updated.", tone: "success" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to update project.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "edit-project" }));
  }
}

export async function archiveProjectAction(formData: FormData) {
  const jobId = readJobId(formData);

  try {
    await updateJobStatus(jobId, "archived");
    redirect(buildJobUrl(jobId, {
      message: "Project archived. Historical pack requests and exact picks are still visible.",
      tone: "success",
      section: "archive-readiness",
    }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to archive project.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "archive-readiness" }));
  }
}

export async function savePackRequestAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  const requestText = readString(formData.get("request_text"));
  const selectedItemId = readString(formData.get("requested_item_id"));
  const requestQuantity = Number.parseInt(readString(formData.get("quantity")), 10);
  const room = readString(formData.get("room"));
  const category = readString(formData.get("category"));
  const color = readString(formData.get("color"));
  const notes = readString(formData.get("notes"));
  const optional = readBoolean(formData.get("optional"));
  const editRedirectId = packRequestId || null;
  const requestedItem = selectedItemId ? await resolveRequestedItem(selectedItemId) : null;
  const resolvedText = requestText || requestedItem?.name || "";
  const resolvedCategory = category || requestedItem?.category || "";
  const resolvedColor = color || requestedItem?.color || "";

  if (!resolvedText) {
    redirect(buildJobUrl(jobId, { message: "Add a request description or choose an inventory item.", tone: "error", section: "add-pack-list", editRequestId: editRedirectId }));
  }

  if (!Number.isFinite(requestQuantity) || requestQuantity < 1) {
    redirect(buildJobUrl(jobId, { message: "Quantity must be at least 1.", tone: "error", section: "add-pack-list", editRequestId: editRedirectId }));
  }

  try {
    if (packRequestId) {
      await updatePackRequest({
        packRequestId,
        requestText: resolvedText,
        quantity: requestQuantity,
        room,
        category: resolvedCategory,
        color: resolvedColor,
        notes,
        optional,
        requestedItemId: selectedItemId || null,
      });
      redirect(buildJobUrl(jobId, { message: "Pack request updated.", tone: "success", section: "pack-requests" }));
    }

    await createPackRequest({
      jobId,
      requestText: resolvedText,
      quantity: requestQuantity,
      room,
      category: resolvedCategory,
      color: resolvedColor,
      notes,
      optional,
      requestedItemId: selectedItemId || null,
    });
    redirect(buildJobUrl(jobId, { message: "Pack request added.", tone: "success", section: "pack-requests" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : packRequestId ? "Failed to update pack request." : "Failed to add pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "add-pack-list", editRequestId: editRedirectId }));
  }
}

export async function toggleOptionalAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error", section: "pack-requests" }));
  }

  try {
    const nextOptional = await togglePackRequestOptional(packRequestId);
    redirect(buildJobUrl(jobId, {
      message: `Pack request marked ${nextOptional ? "optional" : "required"}.`,
      tone: "success",
      section: "pack-requests",
    }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to update pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "pack-requests" }));
  }
}

export async function cancelPackRequestAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error", section: "pack-requests" }));
  }

  try {
    await updatePackRequestStatus(packRequestId, "cancelled");
    redirect(buildJobUrl(jobId, { message: "Pack request updated.", tone: "success", section: "pack-requests" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to update pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "pack-requests" }));
  }
}

export async function deletePackRequestAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error", section: "pack-requests" }));
  }

  try {
    await deletePackRequest(packRequestId);
    redirect(buildJobUrl(jobId, { message: "Pack request removed.", tone: "success", section: "pack-requests" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to remove pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "pack-requests" }));
  }
}

export async function createExactInventoryItemForPackRequestAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  const name = readString(formData.get("name"));
  const sku = readString(formData.get("sku"));
  const room = readString(formData.get("room"));
  const category = readString(formData.get("category"));
  const color = readString(formData.get("color"));
  const notes = readString(formData.get("notes"));
  const condition = parseInventoryCondition(readString(formData.get("condition")));

  if (!packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error", section: "pack-requests" }));
  }

  if (!name) {
    redirect(buildJobUrl(jobId, {
      message: "Item name is required.",
      tone: "error",
      section: "add-pack-list",
      editRequestId: packRequestId,
    }));
  }

  try {
    const item = await createItem({
      name,
      sku: sku || null,
      room: room || null,
      category: category || null,
      color: color || null,
      notes: notes || null,
      condition,
      status: "available",
      source_job_id: jobId,
    });

    await linkRequestedItemToPackRequest(packRequestId, item.id);

    redirect(buildJobUrl(jobId, {
      message: "Exact inventory item created and linked to this request.",
      tone: "success",
      section: "add-pack-list",
      editRequestId: packRequestId,
    }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to create exact inventory item.";
    redirect(buildJobUrl(jobId, {
      message: nextMessage,
      tone: "error",
      section: "add-pack-list",
      editRequestId: packRequestId,
    }));
  }
}

export async function assignItemAction(formData: FormData) {
  const jobId = readJobId(formData);
  const itemId = readString(formData.get("item_id"));
  const section = readString(formData.get("section")) || "pack-requests";
  if (!itemId) {
    redirect(buildJobUrl(jobId, { message: "Inventory item is required.", tone: "error", section }));
  }

  try {
    await assignItemToJob(jobId, itemId);
    redirect(buildJobUrl(jobId, { message: "Item assigned.", tone: "success", section }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to assign item.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section }));
  }
}

export async function checkInItemAction(formData: FormData) {
  const jobId = readJobId(formData);
  const jobItemId = readString(formData.get("job_item_id"));
  if (!jobItemId) {
    redirect(buildJobUrl(jobId, { message: "Job item is required.", tone: "error", section: "assignments" }));
  }

  try {
    await checkInItem(jobItemId);
    redirect(buildJobUrl(jobId, { message: "Item checked in.", tone: "success", section: "assignments" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to check in item.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "assignments" }));
  }
}

export async function logPickedItemAction(formData: FormData) {
  const jobId = readJobId(formData);
  const itemId = readString(formData.get("item_id"));
  const packRequestId = readString(formData.get("pack_request_id"));
  const section = readString(formData.get("section")) || "pack-requests";
  if (!itemId) {
    redirect(buildJobUrl(jobId, { message: "Inventory item is required.", tone: "error", section }));
  }

  try {
    await createJobPickItem({
      jobId,
      itemId,
      packRequestId: packRequestId || null,
    });
    redirect(buildJobUrl(jobId, { message: "Exact item logged.", tone: "success", section }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to log exact item.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section }));
  }
}

export async function deletePickedItemAction(formData: FormData) {
  const jobId = readJobId(formData);
  const jobPickItemId = readString(formData.get("job_pick_item_id"));
  const section = readString(formData.get("section")) || "pack-requests";
  if (!jobPickItemId) {
    redirect(buildJobUrl(jobId, { message: "Picked item is required.", tone: "error", section }));
  }

  try {
    await deleteJobPickItem(jobPickItemId);
    redirect(buildJobUrl(jobId, { message: "Exact project item removed.", tone: "success", section }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to remove exact item.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section }));
  }
}

export async function quickSelectAction(formData: FormData) {
  const jobId = readJobId(formData);
  const selectedItemIds = formData.getAll("item_ids").map((value) => (typeof value === "string" ? value : "")).filter(Boolean);
  const packRequestId = readString(formData.get("pack_request_id"));
  const notes = readString(formData.get("notes"));

  if (selectedItemIds.length === 0) {
    redirect(buildJobUrl(jobId, { message: "Choose at least one inventory item to log.", tone: "error", section: "quick-select" }));
  }

  try {
    let resolvedPackRequestId = packRequestId || null;
    const resolvedNotes = notes || `Bulk pack request at ${new Date().toLocaleString()}`;

    if (!resolvedPackRequestId) {
      resolvedPackRequestId = await createPackRequest({
        jobId,
        requestText: resolvedNotes,
        quantity: selectedItemIds.length,
        room: "",
        category: "",
        color: "",
        notes: resolvedNotes,
        optional: false,
        requestedItemId: null,
      });
    }

    let successCount = 0;
    let failureMessage: string | null = null;

    for (const itemId of selectedItemIds) {
      try {
        await createJobPickItem({
          jobId,
          itemId,
          packRequestId: resolvedPackRequestId,
          notes: resolvedNotes,
        });
        successCount += 1;
      } catch (error) {
        if (!failureMessage) {
          failureMessage = error instanceof Error ? error.message : `Failed to log item ${itemId}.`;
        }
      }
    }

    if (failureMessage) {
      redirect(buildJobUrl(jobId, {
        message: `Logged ${successCount} item${successCount === 1 ? "" : "s"}. ${failureMessage}`,
        tone: "error",
        section: "quick-select",
      }));
    }

    redirect(buildJobUrl(jobId, {
      message: packRequestId ? `Logged ${successCount} quick select item${successCount === 1 ? "" : "s"} for request.` : `Created bulk pack request with ${successCount} item${successCount === 1 ? "" : "s"}.`,
      tone: "success",
      section: "quick-select",
    }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to log quick select items.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "quick-select" }));
  }
}

export async function applySceneTemplateAction(formData: FormData) {
  const jobId = readJobId(formData);
  const sceneTemplateId = readString(formData.get("scene_template_id"));
  const roomLabel = readString(formData.get("room_label"));
  const notes = readString(formData.get("notes"));

  if (!sceneTemplateId) {
    redirect(buildJobUrl(jobId, { message: "Scene template is required.", tone: "error", section: "scene-templates" }));
  }

  try {
    const result = await applySceneTemplateToJob({
      jobId,
      sceneTemplateId,
      roomLabel,
      notes,
    });
    redirect(buildJobUrl(jobId, { message: `${result.sceneName} added to the pack list for ${roomLabel}.`, tone: "success", section: "scene-templates" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to apply scene template.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "scene-templates" }));
  }
}

export async function deleteSceneApplicationAction(formData: FormData) {
  const jobId = readJobId(formData);
  const sceneApplicationId = readString(formData.get("scene_application_id"));
  const sceneName = readString(formData.get("scene_name"));
  if (!sceneApplicationId) {
    redirect(buildJobUrl(jobId, { message: "Scene application is required.", tone: "error", section: "scene-templates" }));
  }

  try {
    await deleteSceneApplication(sceneApplicationId);
    redirect(buildJobUrl(jobId, { message: `${sceneName || "Scene"} removed from this project.`, tone: "success", section: "scene-templates" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to remove scene application.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "scene-templates" }));
  }
}

export async function createSceneTemplateAction(formData: FormData) {
  const jobId = readJobId(formData);
  const sourceRoom = readString(formData.get("source_room"));
  const name = readString(formData.get("name"));

  if (!sourceRoom) {
    redirect(buildJobUrl(jobId, { message: "Choose a project room to save as a reusable scene.", tone: "error", section: "scene-templates" }));
  }
  if (!name) {
    redirect(buildJobUrl(jobId, { message: "Scene template name is required.", tone: "error", section: "scene-templates" }));
  }

  try {
    const result = await createSceneTemplateFromJobRoom({
      jobId,
      sourceRoom,
      name,
      roomType: readString(formData.get("room_type")),
      styleLabel: readString(formData.get("style_label")),
      summary: readString(formData.get("summary")),
      notes: readString(formData.get("notes")),
    });
    redirect(buildJobUrl(jobId, {
      message: `Saved ${result.sceneName} with ${result.itemCount} room request${result.itemCount === 1 ? "" : "s"}.`,
      tone: "success",
      section: "scene-templates",
    }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to save room as a reusable scene.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "scene-templates" }));
  }
}
