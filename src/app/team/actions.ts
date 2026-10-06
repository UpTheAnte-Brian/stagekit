"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function teamUrl(message: string, tone: "error" | "success") {
  return `/team?message=${encodeURIComponent(message)}&tone=${tone}`;
}

export async function sendInviteAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const displayName = value(formData, "display_name");
  if (!email) redirect(teamUrl("Enter an email address.", "error"));

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (profile?.role !== "owner") redirect(teamUrl("Only an owner can invite team members.", "error"));

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  if (!host) redirect(teamUrl("Could not prepare the invitation link. Please try again.", "error"));

  const redirectTo = `${protocol}://${host}/auth/callback?next=/set-password`;
  const admin = createServiceRoleSupabaseClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: displayName ? { display_name: displayName } : undefined,
    redirectTo,
  });
  if (error) redirect(teamUrl(error.message, "error"));

  redirect(teamUrl(`Invitation sent to ${email}.`, "success"));
}
