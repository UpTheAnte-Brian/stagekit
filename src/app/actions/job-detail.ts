"use server";

import { redirect } from "next/navigation";

import {
  applySceneTemplateToJob,
  addJobConsultMedia,
  createJobConsult,
  createJobPickItem,
  createPackRequest,
  createSceneTemplateFromJobRoom,
  deleteJobPickItem,
  deleteJobConsultMedia,
  deletePackRequest,
  deleteSceneApplication,
  linkRequestedItemToPackRequest,
  togglePackRequestOptional,
  updateJob,
  updateJobConsult,
  updateJobStatus,
  updatePackRequest,
  updatePackRequestStatus,
} from "@/lib/db/job-details";
import { assignItemToJob, checkInAllJobItems, checkInItem, createItem, type InventoryItemCondition } from "@/lib/db/inventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const projectStatuses = ["active", "completed", "archived", "cancelled"] as const;
const inventoryConditionOptions: InventoryItemCondition[] = ["new", "like_new", "good", "fair", "rough"];
const MAX_CONSULT_MEDIA_BYTES = 1024 * 1024 * 1024;

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function readConsultMediaFiles(formData: FormData) {
  return formData
    .getAll("media")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function isConsultMediaFile(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/") || /\.(avif|gif|heic|heif|jpe?g|mov|mp4|m4v|png|webm)$/i.test(file.name);
}

function consultMediaContentType(file: File) {
  if (file.type) return file.type;
  if (/\.(mov|mp4|m4v)$/i.test(file.name)) return "video/mp4";
  if (/\.webm$/i.test(file.name)) return "video/webm";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.gif$/i.test(file.name)) return "image/gif";
  return "image/jpeg";
}

function validateConsultMediaFiles(files: File[]) {
  const invalidFile = files.find((file) => !isConsultMediaFile(file));
  if (invalidFile) {
    throw new Error(`${invalidFile.name} is not a photo or video.`);
  }
  const oversizedFile = files.find((file) => file.size > MAX_CONSULT_MEDIA_BYTES);
  if (oversizedFile) {
    throw new Error(`${oversizedFile.name} must be 1GB or smaller.`);
  }
}

async function uploadConsultMediaFiles(jobId: string, consultId: string, files: File[]) {
  if (files.length === 0) return;
  validateConsultMediaFiles(files);
  const supabase = await createServerSupabaseClient();
  for (const file of files) {
    const contentType = consultMediaContentType(file);
    const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? (contentType.startsWith("video/") ? "mp4" : "jpg");
    const storagePath = `consults/${jobId}/${consultId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("job-consults").upload(storagePath, await file.arrayBuffer(), {
      cacheControl: "31536000",
      contentType,
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);
    try {
      await addJobConsultMedia({ consultId, storagePath, fileName: file.name, contentType, fileSizeBytes: file.size });
    } catch (error) {
      await supabase.storage.from("job-consults").remove([storagePath]);
      throw error;
    }
  }
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
    pickRequestId,
  }: {
    message?: string;
    tone?: "success" | "error";
    section?: string;
    editRequestId?: string | null;
    pickRequestId?: string | null;
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
  if (pickRequestId) {
    params.set("pick_request", pickRequestId);
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

export async function saveJobConsultAction(formData: FormData) {
  const jobId = readJobId(formData);
  const consultId = readString(formData.get("consult_id"));
  const section = "on-site-consults";
  const title = readString(formData.get("title"));
  const occurredAt = readString(formData.get("occurred_at"));
  const notes = readString(formData.get("notes"));
  const files = readConsultMediaFiles(formData);

  try {
    if (consultId) {
      await updateJobConsult({ consultId, title, occurredAt, notes });
      redirect(buildJobUrl(jobId, { message: "On-site consult updated.", tone: "success", section }));
    }
    const createdConsultId = await createJobConsult({ jobId, title, occurredAt, notes });
    await uploadConsultMediaFiles(jobId, createdConsultId, files);
    const fileMessage = files.length === 0 ? "" : ` with ${files.length} media file${files.length === 1 ? "" : "s"}`;
    redirect(buildJobUrl(jobId, { message: `On-site consult saved${fileMessage}.`, tone: "success", section, editRequestId: createdConsultId }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to save on-site consult.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section }));
  }
}

export async function uploadJobConsultMediaAction(formData: FormData) {
  const jobId = readJobId(formData);
  const consultId = readString(formData.get("consult_id"));
  const section = "on-site-consults";
  if (!consultId) {
    redirect(buildJobUrl(jobId, { message: "Save the consult before adding media.", tone: "error", section }));
  }

  const files = readConsultMediaFiles(formData);
  if (files.length === 0) {
    redirect(buildJobUrl(jobId, { message: "Select at least one photo or video.", tone: "error", section }));
  }
  try {
    await uploadConsultMediaFiles(jobId, consultId, files);
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to upload consult media.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section }));
  }

  redirect(buildJobUrl(jobId, { message: files.length === 1 ? "Consult media uploaded." : `${files.length} consult files uploaded.`, tone: "success", section }));
}

export async function deleteJobConsultMediaAction(formData: FormData) {
  const jobId = readJobId(formData);
  const mediaId = readString(formData.get("media_id"));
  const section = "on-site-consults";
  if (!mediaId) {
    redirect(buildJobUrl(jobId, { message: "Consult media is required.", tone: "error", section }));
  }
  try {
    await deleteJobConsultMedia(mediaId);
    redirect(buildJobUrl(jobId, { message: "Consult media removed.", tone: "success", section }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to remove consult media.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section }));
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
    } else {
      const createdPackRequestId = await createPackRequest({
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

      if (selectedItemId) {
        try {
          await createJobPickItem({
            jobId,
            itemId: selectedItemId,
            packRequestId: createdPackRequestId,
          });
        } catch (error) {
          await deletePackRequest(createdPackRequestId).catch(() => undefined);
          throw error;
        }
      }
    }
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : packRequestId ? "Failed to update pack request." : "Failed to add pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "add-pack-list", editRequestId: editRedirectId }));
  }

  const message = packRequestId
    ? "Pack request updated."
    : selectedItemId
      ? "Pack request and exact item added."
      : "Pack request added.";
  redirect(buildJobUrl(jobId, { message, tone: "success", section: "pack-requests" }));
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
    await createJobPickItem({
      jobId,
      itemId: item.id,
      packRequestId,
    });
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to create exact inventory item.";
    redirect(buildJobUrl(jobId, {
      message: nextMessage,
      tone: "error",
      section: "add-pack-list",
      editRequestId: packRequestId,
    }));
  }

  redirect(buildJobUrl(jobId, {
    message: "Exact inventory item created and added to this request.",
    tone: "success",
    section: "add-pack-list",
    editRequestId: packRequestId,
  }));
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

export async function checkInAllItemsAction(formData: FormData) {
  const jobId = readJobId(formData);

  try {
    const checkedInCount = await checkInAllJobItems(jobId);
    const message = checkedInCount === 0
      ? "No items were still checked out to this project."
      : `Checked in ${checkedInCount} item${checkedInCount === 1 ? "" : "s"}.`;
    redirect(buildJobUrl(jobId, { message, tone: "success", section: "assignments" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to check in project items.";
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
  const pickRequestId = packRequestId || null;

  if (selectedItemIds.length === 0) {
    redirect(buildJobUrl(jobId, { message: "Choose at least one inventory item to log.", tone: "error", section: "quick-select", pickRequestId }));
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
        pickRequestId,
      }));
    }

    redirect(buildJobUrl(jobId, {
      message: packRequestId ? `Logged ${successCount} quick select item${successCount === 1 ? "" : "s"} for request.` : `Created bulk pack request with ${successCount} item${successCount === 1 ? "" : "s"}.`,
      tone: "success",
      section: "quick-select",
      pickRequestId,
    }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to log quick select items.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "quick-select", pickRequestId }));
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
