import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { FlashMessage } from "@/components/web/flash-message";
import { PendingSubmitButton } from "@/components/web/pending-submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function messageUrl(message: string, tone: "error" | "success") {
  return `/forgot-password?message=${encodeURIComponent(message)}&tone=${tone}`;
}

async function sendResetAction(formData: FormData) {
  "use server";
  const value = formData.get("email");
  const email = typeof value === "string" ? value.trim() : "";
  if (!email) redirect(messageUrl("Enter your email address.", "error"));

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  if (!host) redirect(messageUrl("Could not prepare the reset link. Please try again.", "error"));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/callback?next=/set-password`,
  });
  if (error) redirect(messageUrl(error.message, "error"));

  // Keep the response neutral so this public form cannot be used to discover accounts.
  redirect(messageUrl("If that email has an account, we sent a password-reset link.", "success"));
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const message = first(params.message);
  const tone = first(params.tone) === "success" ? "success" : "error";
  return <section className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <h1 className="text-2xl font-semibold">Reset your password</h1>
    <p className="mt-1 text-sm text-muted">We&apos;ll email a secure link so you can choose a new password.</p>
    {message ? <div className="mt-4"><FlashMessage message={message} tone={tone} /></div> : null}
    <form action={sendResetAction} className="mt-6 space-y-4">
      <div><label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
      <PendingSubmitButton className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" pendingLabel="Sending link…">Email reset link</PendingSubmitButton>
    </form>
    <Link className="mt-5 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline" href="/login">Back to sign in</Link>
  </section>;
}
