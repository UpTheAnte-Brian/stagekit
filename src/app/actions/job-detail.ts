"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  setJobConsultMediaPortfolioCandidate,
  setJobPortfolioCoverMedia,
  togglePackRequestOptional,
  updateJob,
  updateJobConsult,
  updateJobStatus,
  updatePackRequest,
  updatePackRequestStatus,
} from "@/lib/db/job-details";
import { assignItemToJob, checkInAllJobItems, checkInItem, createItem, type InventoryItemCondition } from "@/lib/db/inventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPhotoRelease } from "@/lib/db/photo-releases";

const projectStatuses = ["active", "completed", "archived", "cancelled"] as const;
const inventoryConditionOptions: InventoryItemCondition[] = ["new", "like_new", "good", "fair", "rough"];
const MAX_CONSULT_MEDIA_BYTES = 1024 * 1024 * 1024;
const visitTypes = ["site_visit", "finished_walkthrough"] as const;

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function readVisitType(value: FormDataEntryValue | null) {
  const visitType = readString(value);
  return visitTypes.includes(visitType as (typeof visitTypes)[number])
    ? (visitType as (typeof visitTypes)[number])
    : "site_visit";
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

function buildJobUrl(
  jobId: string,
  {
    message,
    tone,
    section,
    editRequestId,
    pickRequestId,
    releaseToken,
  }: {
    message?: string;
    tone?: "success" | "error";
    section?: string;
    editRequestId?: string | null;
    pickRequestId?: string | null;
    releaseToken?: string | null;
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
  if (releaseToken) {
    params.set("release", releaseToken);
  }

  const query = params.toString();
  return query ? `/jobs/${jobId}?${query}` : `/jobs/${jobId}`;
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

  let result: Awaited<ReturnType<typeof updateJob>>;
  try {
    result = await updateJob({
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
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to update project.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "edit-project" }));
  }

  revalidatePath("/jobs");
  revalidatePath("/projects/map");
  const message = result.geocoded
    ? "Project updated and coordinates stored."
    : result.incompleteAddress
      ? "Project updated. Add a street address, city, and state to store coordinates."
      : result.geocodingNotConfigured
        ? "Project updated. Add the Google Maps server key to store coordinates."
        : result.addressNotFound
          ? "Project updated, but Google Maps could not find this address. Check the address and save again."
          : "Project updated.";
  redirect(buildJobUrl(jobId, { message, tone: result.addressNotFound ? "error" : "success" }));
}

export async function saveJobConsultAction(formData: FormData) {
  const jobId = readJobId(formData);
  const consultId = readString(formData.get("consult_id"));
  const section = "on-site-consults";
  const submittedTitle = readString(formData.get("title"));
  const occurredAt = readString(formData.get("occurred_at"));
  const notes = readString(formData.get("notes"));
  const visitType = readVisitType(formData.get("visit_type"));
  const title = !submittedTitle || (submittedTitle === "On-site visit" && visitType === "finished_walkthrough")
    ? (visitType === "finished_walkthrough" ? "Finished walkthrough" : "On-site visit")
    : submittedTitle;
  const files = readConsultMediaFiles(formData);

  let createdConsultId: string | null = null;
  let fileMessage = "";
  try {
    if (consultId) {
      await updateJobConsult({ consultId, title, occurredAt, notes, visitType });
    } else {
      createdConsultId = await createJobConsult({ jobId, title, occurredAt, notes, visitType });
      await uploadConsultMediaFiles(jobId, createdConsultId, files);
      fileMessage = files.length === 0 ? "" : ` with ${files.length} media file${files.length === 1 ? "" : "s"}`;
    }
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to save on-site consult.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section }));
  }

  const visitLabel = visitType === "finished_walkthrough" ? "Finished walkthrough" : "On-site visit";
  redirect(buildJobUrl(jobId, { message: createdConsultId ? `${visitLabel} saved${fileMessage}.` : `${visitLabel} updated.`, tone: "success", section, editRequestId: createdConsultId }));
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

export async function setPortfolioCandidateAction(formData: FormData) {
  const jobId = readJobId(formData);
  const mediaId = readString(formData.get("media_id"));
  const selected = readBoolean(formData.get("selected"));
  const section = "on-site-consults";
  if (!mediaId) redirect(buildJobUrl(jobId, { message: "Finished media is required.", tone: "error", section }));
  try {
    await setJobConsultMediaPortfolioCandidate({ jobId, mediaId, selected });
  } catch (error) {
    redirect(buildJobUrl(jobId, { message: error instanceof Error ? error.message : "Failed to update portfolio shortlist.", tone: "error", section }));
  }
  redirect(buildJobUrl(jobId, { message: selected ? "Added to the portfolio shortlist. It is still private until homeowner approval." : "Removed from the portfolio shortlist.", tone: "success", section }));
}

export async function setPortfolioCoverAction(formData: FormData) {
  const jobId = readJobId(formData);
  const mediaId = readString(formData.get("media_id"));
  const section = "on-site-consults";
  if (!mediaId) redirect(buildJobUrl(jobId, { message: "Finished media is required.", tone: "error", section }));
  try {
    await setJobPortfolioCoverMedia({ jobId, mediaId });
  } catch (error) {
    redirect(buildJobUrl(jobId, { message: error instanceof Error ? error.message : "Failed to select portfolio cover.", tone: "error", section }));
  }
  redirect(buildJobUrl(jobId, { message: "Portfolio cover selected. It remains private until homeowner approval.", tone: "success", section }));
}

export async function createPhotoReleaseAction(formData: FormData) {
  const jobId = readJobId(formData);
  const section = "portfolio-release";
  let token = "";
  try {
    token = await createPhotoRelease({
      jobId,
      recipientName: readString(formData.get("recipient_name")),
      recipientEmail: readString(formData.get("recipient_email")),
      channels: formData.getAll("channels").filter((value): value is string => typeof value === "string"),
    });
  } catch (error) {
    redirect(buildJobUrl(jobId, { message: error instanceof Error ? error.message : "Failed to create the homeowner review link.", tone: "error", section }));
  }
  redirect(buildJobUrl(jobId, { message: "Private homeowner review link created. Copy it below when you are ready to send it.", tone: "success", section, releaseToken: token }));
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
    redirect(buildJobUrl(jobId, { message: "Add a request description or choose an inventory item.", tone: "error", editRequestId: editRedirectId }));
  }

  if (!Number.isFinite(requestQuantity) || requestQuantity < 1) {
    redirect(buildJobUrl(jobId, { message: "Quantity must be at least 1.", tone: "error", editRequestId: editRedirectId }));
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
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", editRequestId: editRedirectId }));
  }

  const message = packRequestId
    ? "Pack request updated."
    : selectedItemId
      ? "Pack request and exact item added."
      : "Pack request added.";
  redirect(buildJobUrl(jobId, { message, tone: "success" }));
}

export async function toggleOptionalAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error" }));
  }

  try {
    const nextOptional = await togglePackRequestOptional(packRequestId);
    redirect(buildJobUrl(jobId, {
      message: `Pack request marked ${nextOptional ? "optional" : "required"}.`,
      tone: "success",
    }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to update pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
  }
}

export async function cancelPackRequestAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error" }));
  }

  try {
    await updatePackRequestStatus(packRequestId, "cancelled");
    redirect(buildJobUrl(jobId, { message: "Pack request updated.", tone: "success" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to update pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
  }
}

export async function deletePackRequestAction(formData: FormData) {
  const jobId = readJobId(formData);
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error" }));
  }

  try {
    await deletePackRequest(packRequestId);
    redirect(buildJobUrl(jobId, { message: "Pack request removed.", tone: "success" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to remove pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
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
    redirect(buildJobUrl(jobId, { message: "Pack request is required.", tone: "error" }));
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
    revalidatePath(`/jobs/${jobId}`);
    redirect(buildJobUrl(jobId, { message: "Item assigned.", tone: "success" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to assign item.";
    revalidatePath(`/jobs/${jobId}`);
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
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
    revalidatePath(`/jobs/${jobId}`);
    redirect(buildJobUrl(jobId, { message: "Item checked in.", tone: "success" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to check in item.";
    revalidatePath(`/jobs/${jobId}`);
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
  }
}

export async function checkInAllItemsAction(formData: FormData) {
  const jobId = readJobId(formData);

  try {
    const checkedInCount = await checkInAllJobItems(jobId);
    const message = checkedInCount === 0
      ? "No items were still checked out to this project."
      : `Checked in ${checkedInCount} item${checkedInCount === 1 ? "" : "s"}.`;
    revalidatePath(`/jobs/${jobId}`);
    redirect(buildJobUrl(jobId, { message, tone: "success" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to check in project items.";
    revalidatePath(`/jobs/${jobId}`);
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
  }
}

export async function logPickedItemAction(formData: FormData) {
  const jobId = readJobId(formData);
  const itemId = readString(formData.get("item_id"));
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!itemId) {
    redirect(buildJobUrl(jobId, { message: "Inventory item is required.", tone: "error" }));
  }

  try {
    await createJobPickItem({
      jobId,
      itemId,
      packRequestId: packRequestId || null,
    });
    redirect(buildJobUrl(jobId, { message: "Exact item logged.", tone: "success" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to log exact item.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
  }
}

export async function linkDirectCheckoutToPackRequestAction(formData: FormData) {
  const jobId = readJobId(formData);
  const itemId = readString(formData.get("item_id"));
  const packRequestId = readString(formData.get("pack_request_id"));
  if (!itemId || !packRequestId) {
    redirect(buildJobUrl(jobId, { message: "Choose the matching pack request.", tone: "error", section: "assignments" }));
  }

  try {
    await createJobPickItem({
      jobId,
      itemId,
      packRequestId,
      notes: "Linked after a direct checkout.",
    });
    revalidatePath(`/jobs/${jobId}`);
    redirect(buildJobUrl(jobId, { message: "Checkout linked to its pack request.", tone: "success", section: "assignments" }));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to link checkout to pack request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", section: "assignments" }));
  }
}

export async function deletePickedItemAction(formData: FormData) {
  const jobId = readJobId(formData);
  const jobPickItemId = readString(formData.get("job_pick_item_id"));
  if (!jobPickItemId) {
    redirect(buildJobUrl(jobId, { message: "Picked item is required.", tone: "error" }));
  }

  try {
    await deleteJobPickItem(jobPickItemId, jobId);
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to remove exact item.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error" }));
  }
  redirect(buildJobUrl(jobId, { message: "Exact pick and matching original selection removed.", tone: "success" }));
}

export async function quickSelectAction(formData: FormData) {
  const jobId = readJobId(formData);
  const selectedItemIds = formData.getAll("item_ids").map((value) => (typeof value === "string" ? value : "")).filter(Boolean);
  const packRequestId = readString(formData.get("pack_request_id"));
  const notes = readString(formData.get("notes"));
  const pickRequestId = packRequestId || null;

  if (selectedItemIds.length === 0) {
    redirect(buildJobUrl(jobId, { message: "Choose at least one inventory item to add to this request.", tone: "error", pickRequestId }));
  }

  let successCount = 0;
  let failureMessage: string | null = null;
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
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : "Failed to add selected items to the request.";
    redirect(buildJobUrl(jobId, { message: nextMessage, tone: "error", pickRequestId }));
  }

  if (failureMessage) {
    redirect(buildJobUrl(jobId, {
      message: `Logged ${successCount} item${successCount === 1 ? "" : "s"}. ${failureMessage}`,
      tone: "error",
      pickRequestId,
    }));
  }

  redirect(buildJobUrl(jobId, {
    message: packRequestId ? `Added ${successCount} exact item${successCount === 1 ? "" : "s"} to the request.` : `Created bulk pack request with ${successCount} item${successCount === 1 ? "" : "s"}.`,
    tone: "success",
    pickRequestId,
  }));
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
