import { redirect } from "next/navigation";

import { FlashMessage } from "@/components/web/flash-message";
import { PendingSubmitButton } from "@/components/web/pending-submit-button";
import { ProjectsList } from "@/components/web/projects-list";
import { listJobsWithStats } from "@/lib/db/jobs";
import { buildProjectAddressLabel, canGeocodeProjectAddress, geocodeProjectAddress } from "@/lib/google-maps/geocoding";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableText(value: string) {
  return value.length > 0 ? value : null;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function createJobAction(formData: FormData) {
  "use server";

  const name = readString(formData.get("name"));
  if (!name) {
    redirect(`/jobs?message=${encodeURIComponent("Job name is required.")}&new=1`);
  }

  const supabase = await createServerSupabaseClient();
  const address1 = readString(formData.get("address1"));
  const address2 = readString(formData.get("address2"));
  const city = readString(formData.get("city"));
  const state = readString(formData.get("state"));
  const postal = readString(formData.get("postal"));
  const projectAddress = { address1: toNullableText(address1), address2: toNullableText(address2), city: toNullableText(city), state: toNullableText(state), postal: toNullableText(postal) };
  const geocodedAddress = canGeocodeProjectAddress(projectAddress) ? await geocodeProjectAddress(projectAddress) : null;
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      name,
      ...projectAddress,
      address_label: geocodedAddress?.addressLabel ?? (buildProjectAddressLabel(projectAddress) || null),
      latitude: geocodedAddress?.latitude ?? null,
      longitude: geocodedAddress?.longitude ?? null,
      geocoded_at: geocodedAddress ? new Date().toISOString() : null,
      start_date: toNullableText(readString(formData.get("start_date"))),
      end_date: toNullableText(readString(formData.get("end_date"))),
      status: toNullableText(readString(formData.get("status"))) ?? "active",
      notes: toNullableText(readString(formData.get("notes"))),
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/jobs?message=${encodeURIComponent(error.message)}&new=1`);
  }

  redirect(`/jobs/${data.id}`);
}

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const message = firstValue(params.message);
  const jobs = await listJobsWithStats();
  const jobCount = jobs?.length ?? 0;
  const showingCountLabel = `Showing ${jobCount} job${jobCount === 1 ? "" : "s"}`;
  const isCreateSectionOpen = jobCount === 0 || firstValue(params.new) === "1";

  return (
    <section className="space-y-6">
      {message ? <FlashMessage message={message} tone="warning" /> : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Projects</p>
            <h1 className="text-2xl font-semibold tracking-tight">See staging work and project history.</h1>
            <p className="text-sm text-muted">Open any project card to manage live work or review archived rooms, categories, and items.</p>
          </div>
          <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted shadow-sm">{showingCountLabel}</div>
        </div>

        <details className="rounded-2xl border border-border bg-surface p-4 shadow-sm" open={isCreateSectionOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="text-lg font-semibold">New Job</h2>
              <p className="text-sm text-muted">Collapsed by default so the project list stays front and center.</p>
            </div>
            <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Toggle</span>
          </summary>

          <form action={createJobAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input name="name" placeholder="Job name" required />
            <input defaultValue="active" name="status" placeholder="Status" />
            <input name="address1" placeholder="Street address" />
            <input name="address2" placeholder="Address line 2" />
            <input name="city" placeholder="City" />
            <input name="state" placeholder="State" />
            <input name="postal" placeholder="Postal" />
            <input name="start_date" type="date" />
            <input name="end_date" type="date" />
            <textarea className="md:col-span-2" name="notes" placeholder="Notes" />
            <PendingSubmitButton className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground md:col-span-2" pendingLabel="Creating…">
              Create Job
            </PendingSubmitButton>
          </form>
        </details>

        {jobCount === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold">No projects yet.</h2>
            <p className="mt-2 text-sm text-muted">Create a new job above, then open it to manage assignments, pack requests, and scenes.</p>
          </section>
        ) : (
          <ProjectsList jobs={jobs} />
        )}
      </section>
    </section>
  );
}
