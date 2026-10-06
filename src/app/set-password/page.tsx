import { redirect } from "next/navigation";

import { FlashMessage } from "@/components/web/flash-message";
import { PendingSubmitButton } from "@/components/web/pending-submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function setPasswordAction(formData: FormData) {
  "use server";
  const passwordValue = formData.get("password");
  const confirmationValue = formData.get("confirmation");
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const confirmation = typeof confirmationValue === "string" ? confirmationValue : "";
  if (password.length < 8) redirect("/set-password?message=Choose a password with at least 8 characters.");
  if (password !== confirmation) redirect("/set-password?message=The passwords do not match.");
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login?message=Your invitation link has expired. Ask an owner to send a new one.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/set-password?message=${encodeURIComponent(error.message)}`);
  redirect("/inventory");
}

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { message } = await searchParams;
  return <section className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <h1 className="text-2xl font-semibold">Set your password</h1><p className="mt-1 text-sm text-muted">Choose a password to finish joining StageKit.</p>
    {message ? <div className="mt-4"><FlashMessage message={message} tone="error" /></div> : null}
    <form action={setPasswordAction} className="mt-6 space-y-4"><div><label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} /></div><div><label className="mb-1 block text-sm font-medium" htmlFor="confirmation">Confirm password</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={8} /></div><PendingSubmitButton className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" pendingLabel="Saving password…">Save password</PendingSubmitButton></form>
  </section>;
}
