import { redirect } from "next/navigation";

import { FlashMessage } from "@/components/web/flash-message";
import { PendingSubmitButton } from "@/components/web/pending-submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { sendInviteAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function TeamPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("user_profiles").select("role").eq("id", userData.user.id).maybeSingle(),
    supabase.from("user_profiles").select("id,display_name,role,created_at").order("display_name"),
  ]);
  if (profile?.role !== "owner") redirect("/inventory");

  const params = await searchParams;
  const message = first(params.message);
  const tone = first(params.tone) === "success" ? "success" : "error";

  return <section className="mx-auto max-w-2xl space-y-6">
    <div>
      <p className="text-sm font-medium text-muted">Workspace access</p>
      <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
      <p className="mt-2 text-muted">Invite a teammate to create their password and access StageKit.</p>
    </div>
    {message ? <FlashMessage message={message} tone={tone} /> : null}
    <form action={sendInviteAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Invite a teammate</h2>
      <div><label className="mb-1 block text-sm font-medium" htmlFor="display_name">Name</label><input id="display_name" name="display_name" placeholder="e.g. Sarah Johnson" /></div>
      <div><label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
      <PendingSubmitButton className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" pendingLabel="Sending invitation…">Send invite</PendingSubmitButton>
    </form>
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold">People with access</h2>
      <ul className="mt-4 divide-y divide-border">{(members ?? []).map((member) => <li className="flex items-center justify-between py-3" key={member.id}><span>{member.display_name}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{member.role}</span></li>)}</ul>
    </section>
  </section>;
}
