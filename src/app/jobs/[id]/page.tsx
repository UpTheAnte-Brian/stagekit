import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { assignItemToJob, checkInItem } from "@/lib/db/inventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function formatAddress(job: {
  address_label?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
}) {
  if (job.address_label) {
    return job.address_label;
  }

  return [job.address1, job.address2, job.city, job.state, job.postal].filter(Boolean).join(", ");
}

async function assignItemAction(formData: FormData) {
  "use server";

  const jobId = readString(formData.get("job_id"));
  const itemId = readString(formData.get("item_id"));
  if (!jobId || !itemId) {
    redirect(`/jobs?message=${encodeURIComponent("Job and item are required.")}`);
  }

  try {
    await assignItemToJob(jobId, itemId);
    redirect(`/jobs/${jobId}?message=${encodeURIComponent("Item assigned.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign item.";
    redirect(`/jobs/${jobId}?message=${encodeURIComponent(message)}`);
  }
}

async function checkInItemAction(formData: FormData) {
  "use server";

  const jobId = readString(formData.get("job_id"));
  const jobItemId = readString(formData.get("job_item_id"));
  if (!jobId || !jobItemId) {
    redirect(`/jobs?message=${encodeURIComponent("Job item is required.")}`);
  }

  try {
    await checkInItem(jobItemId);
    redirect(`/jobs/${jobId}?message=${encodeURIComponent("Item checked in.")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check in item.";
    redirect(`/jobs/${jobId}?message=${encodeURIComponent(message)}`);
  }
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const search = await searchParams;
  const message = firstValue(search.message);

  const supabase = await createServerSupabaseClient();
  const { data: job, error: jobError } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (jobError) {
    throw new Error(`Failed to load job: ${jobError.message}`);
  }
  if (!job) {
    notFound();
  }

  const { data: jobItems, error: jobItemsError } = await supabase
    .from("job_items")
    .select("id,item_id,checked_out_at,checked_in_at")
    .eq("job_id", id)
    .order("checked_out_at", { ascending: false });
  if (jobItemsError) {
    throw new Error(`Failed to load job items: ${jobItemsError.message}`);
  }

  const assignedItemIds = [...new Set((jobItems ?? []).map((row) => row.item_id))];
  const { data: assignedItems, error: assignedItemsError } =
    assignedItemIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("inventory_items")
          .select("id,name,category,status,condition")
          .in("id", assignedItemIds);
  if (assignedItemsError) {
    throw new Error(`Failed to load assigned inventory details: ${assignedItemsError.message}`);
  }

  const { data: availableItems, error: availableItemsError } = await supabase
    .from("inventory_items")
    .select("id,name,category")
    .eq("status", "available")
    .order("name", { ascending: true });
  if (availableItemsError) {
    throw new Error(`Failed to load available inventory: ${availableItemsError.message}`);
  }

  const itemsById = new Map((assignedItems ?? []).map((item) => [item.id, item]));

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div>
          <p className="text-sm text-muted">Job</p>
          <h1 className="text-2xl font-semibold">{job.name}</h1>
          <p className="text-sm text-muted">{[formatAddress(job) || "Unknown location", job.status].filter(Boolean).join(" • ")}</p>
        </div>
        <Link className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium" href="/jobs">
          Back to Jobs
        </Link>
      </header>

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Assign Item</h2>
        <form action={assignItemAction} className="mt-3 flex flex-wrap gap-3">
          <input type="hidden" name="job_id" value={job.id} />
          <select className="max-w-sm" name="item_id" required>
            <option value="">Select available inventory item</option>
            {(availableItems ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.category ? `(${item.category})` : ""}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" type="submit">
            Assign Item
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Status</th>
              <th>Checked Out</th>
              <th>Checked In</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(jobItems ?? []).length === 0 ? (
              <tr>
                <td className="text-sm text-muted" colSpan={6}>
                  No items assigned yet.
                </td>
              </tr>
            ) : (
              (jobItems ?? []).map((jobItem) => {
                const assigned = itemsById.get(jobItem.item_id);
                return (
                  <tr key={jobItem.id}>
                    <td>{assigned?.name ?? "Unknown item"}</td>
                    <td>{assigned?.category ?? "—"}</td>
                    <td>{assigned?.status ?? "—"}</td>
                    <td>{formatTimestamp(jobItem.checked_out_at)}</td>
                    <td>{jobItem.checked_in_at ? formatTimestamp(jobItem.checked_in_at) : "Not yet"}</td>
                    <td>
                      {jobItem.checked_in_at ? (
                        <span className="text-sm text-muted">Done</span>
                      ) : (
                        <form action={checkInItemAction}>
                          <input type="hidden" name="job_id" value={job.id} />
                          <input type="hidden" name="job_item_id" value={jobItem.id} />
                          <button className="rounded-lg border border-border bg-white px-3 py-1 text-sm font-medium" type="submit">
                            Check In
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
