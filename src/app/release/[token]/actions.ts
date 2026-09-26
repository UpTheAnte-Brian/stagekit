"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { respondToPhotoRelease } from "@/lib/db/photo-releases";

export async function respondToPhotoReleaseAction(formData: FormData) {
  const token = typeof formData.get("token") === "string" ? String(formData.get("token")) : "";
  const intent = typeof formData.get("intent") === "string" ? String(formData.get("intent")) : "";
  const approvedItemIds = formData.getAll("approved_item_ids").filter((value): value is string => typeof value === "string");
  try {
    await respondToPhotoRelease({ token, approvedItemIds, declined: intent === "decline" });
  } catch (error) {
    redirect(`/release/${token}?error=${encodeURIComponent(error instanceof Error ? error.message : "We could not save your response.")}`);
  }

  revalidatePath("/");
  revalidatePath(`/release/${token}`);
  redirect(`/release/${token}?complete=${intent === "decline" ? "declined" : "approved"}`);
}
