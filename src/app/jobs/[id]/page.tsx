import { PersistentDetails } from "@/components/web/persistent-details";
import { PendingSubmitButton } from "@/components/web/pending-submit-button";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobExactItemPicker } from "@/components/jobs/job-exact-item-picker";
import { JobQuickSelectPicker } from "@/components/jobs/job-quick-select-picker";
import { ConsultMediaGallery } from "@/components/jobs/consult-media-gallery";
import { ConsultMediaUploadForm } from "@/components/jobs/consult-media-upload-form";
import { CheckInAllItemsForm } from "@/components/jobs/check-in-all-items-form";
import { CloseDetailsButton } from "@/components/web/close-details-button";
import { FlashMessage } from "@/components/web/flash-message";
import { PendingBlockLink } from "@/components/web/pending-block-link";
import { PendingLink } from "@/components/web/pending-link";
import {
  getJobDetail,
  listPackListInventoryItems,
  listSceneTemplates,
  type JobPackRequest,
} from "@/lib/db/job-details";
import {
  applySceneTemplateAction,
  archiveProjectAction,
  assignItemAction,
  cancelPackRequestAction,
  checkInAllItemsAction,
  checkInItemAction,
  createExactInventoryItemForPackRequestAction,
  createSceneTemplateAction,
  deletePackRequestAction,
  deletePickedItemAction,
  deleteSceneApplicationAction,
  deleteJobConsultMediaAction,
  logPickedItemAction,
  quickSelectAction,
  savePackRequestAction,
  saveJobConsultAction,
  toggleOptionalAction,
  updateJobAction,
} from "@/app/actions/job-detail";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const primaryButtonClass = "inline-flex items-center justify-center rounded-xl bg-[#c96f3d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b86133]";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-[#e3d0ba] bg-white px-4 py-2.5 text-sm font-semibold text-[#33413b] transition hover:bg-[#fffaf4]";
const headerButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-[#d8e6dd] bg-[#fffdf9] px-4 py-2.5 text-sm font-semibold !text-[#16382d] shadow-sm transition hover:bg-[#f2eadf]";
const quietButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-[#d4ded7] bg-[#f7fbf8] px-4 py-2.5 text-sm font-semibold text-[#254238] transition hover:bg-[#eef6f0]";
const sectionCardClass = "rounded-3xl border border-[#e8d9c6] bg-[#fffdf9] p-5 shadow-sm";
const mutedTextClass = "text-sm leading-6 text-[#6f756c]";
const projectStatuses = ["active", "completed", "archived", "cancelled"] as const;
const inventoryConditionOptions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "rough", label: "Rough" },
] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatStatus(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function detailsOpen(activeSection: string | null, sectionName: string, fallback = false) {
  return fallback || activeSection === sectionName;
}

function normalizeRoomLabel(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function roomGroupKey(value: string | null | undefined) {
  return normalizeRoomLabel(value).toLocaleLowerCase() || "no room";
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
  return query ? `/jobs/${jobId}?${query}` : `/jobs/${jobId}`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ecdcc7] bg-[#fff8ef] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8c7b]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#20322a]">{value}</p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  countLabel,
  right,
}: {
  title: string;
  description?: string;
  countLabel?: string;
  right?: import("react").ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-[#20322a]">{title}</h2>
          {countLabel ? (
            <span className="rounded-full border border-[#e3d0ba] bg-[#fff8ef] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#6f756c]">
              {countLabel}
            </span>
          ) : null}
        </div>
        {description ? <p className={`mt-2 ${mutedTextClass}`}>{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

function SectionChevron({ groupName }: { groupName?: "packRequest" } = {}) {
  const className = groupName === "packRequest"
    ? "h-5 w-5 shrink-0 text-[#6f756c] transition-transform group-open/packRequest:rotate-180"
    : "h-5 w-5 shrink-0 text-[#6f756c] transition-transform group-open:rotate-180";

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ItemThumbnail({
  href,
  src,
  alt,
}: {
  href: string;
  src: string;
  alt: string;
}) {
  return (
    <Link className="block h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-[#ecdcc7] bg-[#f7f3ee]" href={href}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} className="h-full w-full object-cover" loading="lazy" src={src} />
    </Link>
  );
}

function buildCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getCheckoutButtonLabel(itemStatus: string, isCheckedOutToThisProject: boolean) {
  if (isCheckedOutToThisProject) {
    return "Already Checked Out";
  }

  if (itemStatus === "available") {
    return "Check Out to Project";
  }

  if (itemStatus === "on_job") {
    return "Checked Out Elsewhere";
  }

  return "Unavailable";
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
  const tone = firstValue(search.tone) === "error" ? "error" : "success";
  const activeSection = firstValue(search.section) ?? null;
  const editRequestId = firstValue(search.edit_request) ?? null;
  const pickRequestId = firstValue(search.pick_request) ?? null;

  const [{ job, assignments, packRequests, pickedItems, sceneApplications, consults }, packCandidates, sceneTemplates] = await Promise.all([
    getJobDetail(id).catch((error) => {
      if (error instanceof Error && /0 rows|No rows/i.test(error.message)) {
        notFound();
      }
      throw error;
    }),
    listPackListInventoryItems(),
    listSceneTemplates(),
  ]);

  const projectLocation = formatAddress(job);
  const projectSubtitle = [projectLocation, formatStatus(job.status)].filter(Boolean).join(" • ");
  const activeAssignments = assignments.filter((assignment) => !assignment.checked_in_at);
  const completedAssignments = assignments.filter((assignment) => Boolean(assignment.checked_in_at));
  const activeAssignedItemIds = new Set(activeAssignments.map((assignment) => assignment.item_id));
  const openPackRequests = packRequests.filter((request) => request.status !== "cancelled");
  const openPackRequestById = new Map(openPackRequests.map((request) => [request.id, request]));
  const fulfilledRequestCount = openPackRequests.filter((request) => request.picked_count >= request.quantity).length;
  const totalRequestedQuantity = openPackRequests.reduce((sum, request) => sum + request.quantity, 0);
  const openPackRequestsByRoom = [...openPackRequests.reduce<Map<string, { label: string; requests: JobPackRequest[] }>>((groups, request) => {
    const key = roomGroupKey(request.room);
    const current = groups.get(key);
    const label = normalizeRoomLabel(request.room) || "No room";
    groups.set(key, current ? { ...current, requests: [...current.requests, request] } : { label, requests: [request] });
    return groups;
  }, new Map()).values()]
    .map(({ label, requests }) => [label, requests] as const)
    .sort(([a], [b]) => {
      if (a === "No room") return -1;
      if (b === "No room") return 1;
      return a.localeCompare(b);
    });
  const extraPickedItems = pickedItems.filter((pickedItem) => !pickedItem.pack_request_id);
  const pickedQueueItems = pickedItems.filter((pickedItem) => !activeAssignedItemIds.has(pickedItem.item_id));
  const exactItemIds = new Set(pickedItems.map((pickedItem) => pickedItem.item_id));
  const assignedItemIds = new Set(assignments.map((assignment) => assignment.item_id));
  const rememberedItemIds = new Set([...exactItemIds, ...assignedItemIds]);
  const assignedWithoutExactPickCount = assignments.filter((assignment) => !exactItemIds.has(assignment.item_id)).length;
  const exactPicksNotAssignedCount = pickedItems.filter((pickedItem) => !assignedItemIds.has(pickedItem.item_id)).length;
  const requestsWithoutExactPicksCount = openPackRequests.filter((request) => request.picked_count === 0).length;
  const closeoutWarnings = [
    activeAssignments.length > 0 ? `${buildCountLabel(activeAssignments.length, "item")} still checked out` : null,
    assignedWithoutExactPickCount > 0 ? `${buildCountLabel(assignedWithoutExactPickCount, "assignment")} without exact pick history` : null,
    requestsWithoutExactPicksCount > 0 ? `${buildCountLabel(requestsWithoutExactPicksCount, "request")} with no exact items logged` : null,
  ].filter((value): value is string => Boolean(value));
  const roomArchiveSummary = openPackRequestsByRoom.map(([roomLabel, requests]) => {
    const requestQuantity = requests.reduce((sum, request) => sum + request.quantity, 0);
    const exactPicks = requests.reduce((sum, request) => sum + request.picked_count, 0);
    const categories = [...new Set(requests.map((request) => request.category).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));

    return {
      roomLabel,
      requestCount: requests.length,
      requestQuantity,
      exactPicks,
      categories,
    };
  });
  const categoryArchiveSummary = Object.entries(
    openPackRequests.reduce<Record<string, { requestCount: number; requestQuantity: number; exactPicks: number }>>((acc, request) => {
      const key = (request.category ?? "").trim() || "Uncategorized";
      const current = acc[key] ?? { requestCount: 0, requestQuantity: 0, exactPicks: 0 };
      current.requestCount += 1;
      current.requestQuantity += request.quantity;
      current.exactPicks += request.picked_count;
      acc[key] = current;
      return acc;
    }, {}),
  ).sort(([a], [b]) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });
  const editingPackRequest = editRequestId ? openPackRequests.find((request) => request.id === editRequestId) ?? null : null;
  const activePickRequest = pickRequestId ? openPackRequests.find((request) => request.id === pickRequestId) ?? null : null;
  const authorableRooms = openPackRequestsByRoom.filter(([roomLabel]) => roomLabel !== "No room");
  const defaultSceneSourceRoom = authorableRooms[0]?.[0] ?? "";
  const appliedSceneCountByTemplateId = sceneApplications.reduce<Record<string, number>>((acc, application) => {
    acc[application.scene_template_id] = (acc[application.scene_template_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="space-y-6 pb-10">
      <header className="rounded-[2rem] bg-[#16382d] px-6 py-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c7d8cd]">Project</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">{job.name}</h1>
            <p className="mt-4 text-lg text-[#d8e6dd]">{projectSubtitle || "Project detail"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PendingBlockLink className={headerButtonClass} href="/jobs" pendingLabel="Opening projects…">
              Back to Projects
            </PendingBlockLink>
          </div>
        </div>
      </header>

      {message ? <FlashMessage clearSearchParams={["tone"]} message={message} tone={tone} /> : null}

      <PersistentDetails storageKey={`job:${id}:edit-project`} className={`${sectionCardClass} scroll-mt-6`} id="edit-project" open={detailsOpen(activeSection, "edit-project")}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <SectionHeader
            title="Edit Project Details"
            description="Client name, map address, notes, and status live here."
            right={<span className={secondaryButtonClass}>Toggle</span>}
          />
        </summary>

        <form action={updateJobAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <input name="job_id" type="hidden" value={id} />
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">Client / Project Name</label>
            <input defaultValue={job.name} name="name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">Street Address</label>
            <input defaultValue={job.address1 ?? ""} name="address1" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">Address Line 2</label>
            <input defaultValue={job.address2 ?? ""} name="address2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">City</label>
            <input defaultValue={job.city ?? ""} name="city" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">State</label>
            <input defaultValue={job.state ?? ""} name="state" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">Postal Code</label>
            <input defaultValue={job.postal ?? ""} name="postal" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">Status</label>
            <select defaultValue={projectStatuses.includes(job.status as (typeof projectStatuses)[number]) ? job.status : "active"} name="status">
              {projectStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-[#ecdcc7] bg-[#fff8ef] px-4 py-3 md:col-span-2">
            <p className={mutedTextClass}>
              {projectLocation ? `Map address: ${projectLocation}, US` : "Add a full address so this project can be pinned on a map later."}
            </p>
            <p className={`${mutedTextClass} mt-2`}>
              {job.latitude != null && job.longitude != null
                ? `Stored coordinates: ${job.latitude.toFixed(5)}, ${job.longitude.toFixed(5)}`
                : "Coordinates not stored yet."}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[#33413b]">Notes</label>
            <textarea defaultValue={job.notes ?? ""} name="notes" />
          </div>
          <div className="md:col-span-2">
            <PendingSubmitButton className={primaryButtonClass} pendingLabel="Saving…">
              Save Project Details
            </PendingSubmitButton>
          </div>
        </form>
      </PersistentDetails>

      <section className="rounded-[2rem] border border-[#cfe0d4] bg-[#e9f3ec] p-4 shadow-sm sm:p-6">
        <SectionHeader
          title="Project Flow"
          description="Everything for this project is organized around the work as it happens: capture, plan, then pull and deliver."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#b9d2c0] bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8c7b]">1. Capture the visit</p>
            <p className="mt-2 text-sm font-semibold text-[#20322a]">{consults.length === 0 ? "Add your notes and today’s photos." : `${consults.length} visit record${consults.length === 1 ? "" : "s"} saved.`}</p>
          </div>
          <div className="rounded-2xl border border-[#b9d2c0] bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8c7b]">2. Build the pack list</p>
            <p className="mt-2 text-sm font-semibold text-[#20322a]">{openPackRequests.length} request{openPackRequests.length === 1 ? "" : "s"} • {fulfilledRequestCount} covered</p>
          </div>
          <div className="rounded-2xl border border-[#b9d2c0] bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8c7b]">3. Pull & deliver</p>
            <p className="mt-2 text-sm font-semibold text-[#20322a]">{pickedItems.length} picked • {activeAssignments.length} checked out</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[2rem] border border-[#cfe0d4] bg-[#f4f8f5] p-3 sm:p-5" id="on-site-consults">
        <div className="px-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60766a]">Step 1</p>
          <h2 className="mt-1 text-xl font-semibold text-[#20322a]">Capture the visit</h2>
          <p className={`${mutedTextClass} mt-1`}>Keep the source material together before turning it into a pack plan.</p>
        </div>
        <PersistentDetails storageKey={`job:${id}:on-site-consults`} className={`${sectionCardClass} group`} open={detailsOpen(activeSection, "on-site-consults")}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <SectionHeader
              title="1. Capture On-Site Visit"
              countLabel={buildCountLabel(consults.length, "visit")}
              description="Save raw notes and room measurements first. Then add today’s photos and larger walkthrough videos directly to the saved visit."
              right={<span className={quietButtonClass}>Add visit</span>}
            />
            <SectionChevron />
          </summary>

          <form action={saveJobConsultAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input name="job_id" type="hidden" value={id} />
            <input name="title" type="hidden" value="On-site visit" />
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#33413b]">When</label>
              <input name="occurred_at" type="datetime-local" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#33413b]">Walkthrough notes</label>
              <textarea name="notes" placeholder={"Fireplace room\n12’ or 9’ (in front of fireplace) by 13’\n\nSun room\n11’\n\nBed 1 — 11’ x 10.5’"} />
              <p className={`${mutedTextClass} mt-2`}>Keep the notes in the form they happened. You can clean them up later if needed.</p>
            </div>
            <div className="md:col-span-2">
              <PendingSubmitButton className={primaryButtonClass} pendingLabel="Saving…">Save Visit Notes</PendingSubmitButton>
            </div>
          </form>
        </PersistentDetails>

        {consults.length > 0 ? (
          <section className={sectionCardClass} aria-labelledby="saved-visits-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#20322a]" id="saved-visits-heading">Saved visits</h3>
                <p className={`${mutedTextClass} mt-1`}>Expand a visit to review notes, photos, and videos.</p>
              </div>
              <p className={mutedTextClass}>Use the pack list below to turn a visit into requests.</p>
            </div>
            <div className="mt-5 space-y-3">
              {consults.map((consult) => (
                <PersistentDetails storageKey={`job:${id}:consult:${consult.id}`} key={consult.id} className="rounded-2xl border border-[#ecdcc7] bg-white p-4" open={consult.id === editRequestId}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <div>
                      <h4 className="text-lg font-semibold text-[#20322a]">{consult.title}</h4>
                      <p className={`${mutedTextClass} mt-1`}>{formatTimestamp(consult.occurred_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#f7fbf8] px-3 py-1 text-xs font-semibold text-[#254238]">{consult.media.length} file{consult.media.length === 1 ? "" : "s"}</span>
                      <span className={quietButtonClass}>View visit</span>
                    </div>
                  </summary>
                  <div className="mt-4 border-t border-[#ecdcc7] pt-4">
                    {consult.notes ? <p className="whitespace-pre-wrap text-sm leading-6 text-[#4e584f]">{consult.notes}</p> : <p className={mutedTextClass}>No written notes saved.</p>}
                    <PersistentDetails storageKey={`job:${id}:consult-media:${consult.id}`} className="mt-4 rounded-xl border border-[#ecdcc7] bg-[#fffaf4] p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[#33413b]">Edit consult notes</summary>
                      <form action={saveJobConsultAction} className="mt-4 grid gap-3 md:grid-cols-2">
                        <input name="job_id" type="hidden" value={id} />
                        <input name="consult_id" type="hidden" value={consult.id} />
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[#33413b]">Consult name</label>
                          <input defaultValue={consult.title} name="title" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[#33413b]">When</label>
                          <input defaultValue={formatDateTimeLocal(consult.occurred_at)} name="occurred_at" type="datetime-local" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-[#33413b]">Walkthrough notes</label>
                          <textarea defaultValue={consult.notes ?? ""} name="notes" />
                        </div>
                        <div className="md:col-span-2"><PendingSubmitButton className={secondaryButtonClass} pendingLabel="Saving…">Save changes</PendingSubmitButton></div>
                      </form>
                    </PersistentDetails>
                    {consult.media.length > 0 ? (
                      <ConsultMediaGallery action={deleteJobConsultMediaAction} jobId={id} media={consult.media} />
                    ) : null}
                    <ConsultMediaUploadForm
                      consultId={consult.id}
                      jobId={id}
                    />
                  </div>
                </PersistentDetails>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      {job.status === "archived" ? <PersistentDetails storageKey={`job:${id}:archive-readiness`} className={`${sectionCardClass} scroll-mt-6`} id="archive-readiness" open={detailsOpen(activeSection, "archive-readiness", true)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <SectionHeader
            title="Archive Readiness"
            description="Closeout keeps project history useful without pretending every item was perfectly assigned and checked in."
            right={<span className={quietButtonClass}>{job.status === "archived" ? "Archived" : "Review"}</span>}
          />
        </summary>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <MetricCard label="Remembered Items" value={String(rememberedItemIds.size)} />
          <MetricCard label="Open Check-ins" value={String(activeAssignments.length)} />
          <MetricCard label="Rooms Captured" value={String(roomArchiveSummary.length)} />
          <MetricCard label="Requested Quantity" value={String(totalRequestedQuantity)} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
            <h3 className="text-lg font-semibold text-[#20322a]">Historical Value</h3>
            <p className={`${mutedTextClass} mt-2`}>
              This project can still teach future pack lists from rooms, categories, requested quantities, exact picks, and applied scenes.
              {exactPicksNotAssignedCount > 0 ? ` ${buildCountLabel(exactPicksNotAssignedCount, "exact pick")} were logged without an active assignment record.` : ""}
            </p>
            <div className="mt-4 space-y-3">
              {roomArchiveSummary.length === 0 ? (
                <p className={mutedTextClass}>No room-level requests are available yet.</p>
              ) : (
                roomArchiveSummary.map((room) => (
                  <div key={room.roomLabel} className="rounded-xl border border-[#f0e4d3] bg-[#fffaf4] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#20322a]">{room.roomLabel}</p>
                      <p className="text-sm font-medium text-[#536158]">
                        {room.exactPicks} exact / {room.requestQuantity} requested
                      </p>
                    </div>
                    <p className={`${mutedTextClass} mt-1`}>
                      {buildCountLabel(room.requestCount, "request")} {room.categories.length > 0 ? `• ${room.categories.join(", ")}` : "• No categories"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
            <h3 className="text-lg font-semibold text-[#20322a]">Closeout Notes</h3>
            {closeoutWarnings.length === 0 ? (
              <p className={`${mutedTextClass} mt-2`}>No obvious cleanup gaps from the current records.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {closeoutWarnings.map((warning) => (
                  <li key={warning} className="rounded-xl bg-[#fff8ef] px-3 py-2 text-sm font-medium text-[#5d4736]">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
            <p className={`${mutedTextClass} mt-4`}>
              Archiving only changes the project status. Inventory availability still comes from check-ins and item status, so historical data stays intact.
            </p>
            {job.status === "archived" ? null : (
              <form action={archiveProjectAction} className="mt-4">
                <input name="job_id" type="hidden" value={id} />
                <PendingSubmitButton className={primaryButtonClass} pendingLabel="Archiving…">
                  Archive Project
                </PendingSubmitButton>
              </form>
            )}
          </div>
        </div>

        {categoryArchiveSummary.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-[#ecdcc7] bg-white p-4">
            <h3 className="text-lg font-semibold text-[#20322a]">Category Snapshot</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categoryArchiveSummary.map(([category, stats]) => (
                <div key={category} className="rounded-xl bg-[#f7fbf8] px-3 py-2">
                  <p className="font-semibold text-[#20322a]">{category}</p>
                  <p className={`${mutedTextClass} mt-1`}>
                    {stats.requestQuantity} requested • {stats.exactPicks} exact • {buildCountLabel(stats.requestCount, "line")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </PersistentDetails> : null}

      <section className="space-y-4 rounded-[2rem] border border-[#cfe0d4] bg-[#f4f8f5] p-3 sm:p-5">
        <div className="px-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60766a]">Step 2</p>
          <h2 className="mt-1 text-xl font-semibold text-[#20322a]">Build the pack list</h2>
          <p className={`${mutedTextClass} mt-1`}>Start with reusable scenes when they fit, then refine the project&apos;s room-by-room requests.</p>
        </div>
      {activeSection === "scene-templates" || sceneApplications.length > 0 ? <PersistentDetails storageKey={`job:${id}:scene-templates`} className={`${sectionCardClass} group scroll-mt-6`} id="scene-templates" open={detailsOpen(activeSection, "scene-templates")}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <SectionHeader
            title="Scene Templates"
            countLabel={buildCountLabel(sceneApplications.length, "scene")}
            description="Use reusable room recipes to generate grouped pack requests from staging patterns you repeat often."
          />
          <SectionChevron />
        </summary>

        <div className="mt-5 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#20322a]">Applied Scenes</h3>
            <p className={`mt-2 ${mutedTextClass}`}>These are the reusable scenes already feeding this project&apos;s pack list.</p>
            <div className="mt-4 space-y-3">
              {sceneApplications.length === 0 ? (
                <p className={mutedTextClass}>No reusable scenes applied yet.</p>
              ) : (
                sceneApplications.map((application) => (
                  <div key={application.id} className="rounded-2xl border border-[#ecdcc7] bg-[#fff8ef] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[#20322a]">
                          {application.scene_template_name} for {application.room_label}
                        </p>
                        <p className={`${mutedTextClass} mt-2`}>
                          {application.pack_request_count} requests • {application.fulfilled_request_count} fully covered
                        </p>
                        {application.notes ? <p className={`${mutedTextClass} mt-2`}>Notes: {application.notes}</p> : null}
                      </div>
                      <form action={deleteSceneApplicationAction}>
                        <input name="job_id" type="hidden" value={id} />
                        <input name="scene_application_id" type="hidden" value={application.id} />
                        <input name="scene_name" type="hidden" value={application.scene_template_name} />
                        <PendingSubmitButton className={secondaryButtonClass} pendingLabel="Removing…">
                          Remove Scene
                        </PendingSubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#20322a]">Available Templates</h3>
            <div className="mt-4 space-y-4">
              {sceneTemplates.length === 0 ? (
                <p className={mutedTextClass}>No reusable templates are available yet.</p>
              ) : (
                sceneTemplates.map((template) => (
                  <form key={template.id} action={applySceneTemplateAction} className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
                    <input name="job_id" type="hidden" value={id} />
                    <input name="scene_template_id" type="hidden" value={template.id} />
                    <div className="space-y-3">
                      <div>
                        <p className="text-lg font-semibold text-[#20322a]">{template.name}</p>
                        <p className={mutedTextClass}>
                          {template.room_type ?? "Room"} • {template.style_label ?? "General"} • {template.item_count} template item{template.item_count === 1 ? "" : "s"}
                        </p>
                        {template.summary ? <p className={`${mutedTextClass} mt-2`}>{template.summary}</p> : null}
                        {(appliedSceneCountByTemplateId[template.id] ?? 0) > 0 ? (
                          <p className={`${mutedTextClass} mt-2`}>
                            Applied {appliedSceneCountByTemplateId[template.id]} time{appliedSceneCountByTemplateId[template.id] === 1 ? "" : "s"} on this project.
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border border-[#f0e4d3] bg-[#fffaf4] p-3">
                        <div className="space-y-1">
                          {template.items.map((item) => (
                            <p key={item.id} className="text-sm text-[#4e584f]">
                              {item.quantity} x {item.request_text}
                              {item.category ? ` • ${item.category}` : ""}
                              {item.color ? ` • ${item.color}` : ""}
                              {item.optional ? " • optional" : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#33413b]">Apply as room</label>
                          <input defaultValue={template.room_type ?? template.name} name="room_label" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#33413b]">Scene notes</label>
                          <input name="notes" placeholder="Optional note for this scene application" />
                        </div>
                      </div>
                      <div>
                        <PendingSubmitButton className={primaryButtonClass} pendingLabel="Applying…">
                          Apply Scene to Project
                        </PendingSubmitButton>
                      </div>
                    </div>
                  </form>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
            <h3 className="text-lg font-semibold text-[#20322a]">Save a Room as a Reusable Template</h3>
            <p className={`mt-2 ${mutedTextClass}`}>
              This copies a room&apos;s current pack requests into a reusable recipe for future projects. It does not change, merge, or remove this project&apos;s room requests.
            </p>
            {authorableRooms.length === 0 ? (
              <p className={`mt-4 ${mutedTextClass}`}>Add pack requests to a named room first, then save that room as a reusable scene.</p>
            ) : (
              <form action={createSceneTemplateAction} className="mt-5 grid gap-4 md:grid-cols-2">
                <input name="job_id" type="hidden" value={id} />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Room to copy</label>
                  <select defaultValue={defaultSceneSourceRoom} name="source_room">
                    {authorableRooms.map(([roomLabel]) => (
                      <option key={roomLabel} value={roomLabel}>{roomLabel}</option>
                    ))}
                  </select>
                  <p className={`${mutedTextClass} mt-2`}>Room labels are grouped without regard to capitalization.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Scene template name</label>
                  <input name="name" placeholder="Organic primary bedroom" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Room type</label>
                  <input defaultValue={defaultSceneSourceRoom} name="room_type" placeholder="Primary Bedroom" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Style label</label>
                  <input name="style_label" placeholder="Soft organic" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Summary</label>
                  <textarea name="summary" placeholder="Short note about what defines this setup." />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Template notes</label>
                  <textarea name="notes" placeholder="Anything worth remembering when this scene is reused." />
                </div>
                <div className="md:col-span-2">
                  <PendingSubmitButton className={primaryButtonClass} pendingLabel="Saving…">
                    Save Room as New Scene
                  </PendingSubmitButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </PersistentDetails> : null}

      <PersistentDetails storageKey={`job:${id}:pack-requests`} className={`${sectionCardClass} group scroll-mt-6`} id="pack-requests" open={detailsOpen(activeSection, "pack-requests", true)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <SectionHeader
            title="2. Build Pack List"
            countLabel={buildCountLabel(openPackRequests.length, "request")}
            description="Turn what you saw into room-by-room staging requests."
          />
          <SectionChevron />
        </summary>
        <PersistentDetails
          storageKey={`job:${id}:add-pack-list`}
          className="mt-4 scroll-mt-6"
          id="add-pack-list"
          open={detailsOpen(activeSection, "add-pack-list") || Boolean(editingPackRequest)}
        >
          <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-xl border border-[#e3d0ba] bg-white px-4 py-2.5 text-sm font-semibold text-[#33413b] transition hover:bg-[#fffaf4] [&::-webkit-details-marker]:hidden">
            {editingPackRequest ? "Edit Request" : "Add Request"}
          </summary>
          <div className="mt-5 border-t border-[#ecdcc7] pt-5">
            <div className="flex items-start justify-between gap-3">
              <SectionHeader
                title={editingPackRequest ? "Edit Pack Request" : "New Pack Request"}
                description={
                  editingPackRequest
                    ? "Update this request here, then save or cancel the edit state."
                    : "Create a room request and, when you choose an item, add that exact piece to it."
                }
              />
              {editingPackRequest ? (
                <Link className={secondaryButtonClass} href={buildJobUrl(id)}>
                  Cancel
                </Link>
              ) : (
                <CloseDetailsButton className={secondaryButtonClass}>Cancel</CloseDetailsButton>
              )}
            </div>

            <form action={savePackRequestAction} className="mt-5 grid gap-4 md:grid-cols-2">
              <input name="job_id" type="hidden" value={id} />
              {editingPackRequest ? <input name="pack_request_id" type="hidden" value={editingPackRequest.id} /> : null}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[#33413b]">Request</label>
                <input defaultValue={editingPackRequest?.request_text ?? ""} name="request_text" placeholder="4 blue pillows, 1 ladder, dining table art..." />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#33413b]">Quantity</label>
                <input defaultValue={String(editingPackRequest?.quantity ?? 1)} min={1} name="quantity" type="number" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#33413b]">Room</label>
                <input defaultValue={editingPackRequest?.room ?? ""} name="room" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#33413b]">Category</label>
                <input defaultValue={editingPackRequest?.category ?? ""} name="category" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#33413b]">Color</label>
                <input defaultValue={editingPackRequest?.color ?? ""} name="color" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[#33413b]">Notes</label>
                <textarea defaultValue={editingPackRequest?.notes ?? ""} name="notes" placeholder="Optional styling notes, alternates, or client preferences." />
              </div>
              <label className="flex items-center gap-3 text-sm font-medium text-[#33413b] md:col-span-2">
                <input defaultChecked={editingPackRequest?.optional ?? false} name="optional" type="checkbox" />
                Mark as optional
              </label>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[#33413b]">Exact Inventory Item (optional)</label>
                <JobExactItemPicker
                  defaultValue={editingPackRequest?.requested_item_id ?? ""}
                  initialSearch={editingPackRequest?.requested_item_name ?? editingPackRequest?.request_text ?? ""}
                  inputName="requested_item_id"
                  items={packCandidates.map((item) => ({
                    id: item.id,
                    name: item.name,
                    item_code: item.item_code,
                    status: item.status,
                    category: item.category,
                    color: item.color,
                    current_location_name: item.current_location_name,
                  }))}
                />
                <p className={`mt-2 ${mutedTextClass}`}>
                  Select the item you plan to use. Saving a new request adds it as the exact item; it is not checked out until you choose Check Out to Project.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:col-span-2">
                <PendingSubmitButton className={primaryButtonClass} pendingLabel="Saving…">
                  {editingPackRequest ? "Save Pack Request" : "Add Pack Request"}
                </PendingSubmitButton>
                {editingPackRequest ? (
                  <Link className={secondaryButtonClass} href={buildJobUrl(id)}>
                    Cancel Edit
                  </Link>
                ) : (
                  <CloseDetailsButton className={secondaryButtonClass}>Cancel</CloseDetailsButton>
                )}
              </div>
            </form>

            {editingPackRequest ? (
              <form action={createExactInventoryItemForPackRequestAction} className="mt-6 grid gap-4 rounded-2xl border border-[#ecdcc7] bg-white p-5 md:grid-cols-2">
                <input name="job_id" type="hidden" value={id} />
                <input name="pack_request_id" type="hidden" value={editingPackRequest.id} />
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-[#20322a]">Create Exact Inventory Item</h3>
                  <p className={`mt-2 ${mutedTextClass}`}>
                    Use this when the request describes a real piece that never got entered into inventory. The new item will be added as this request&apos;s exact item automatically.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Item Name</label>
                  <input defaultValue={editingPackRequest.request_text} name="name" placeholder="Walnut dining table with black metal legs" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">SKU</label>
                  <input name="sku" placeholder="Optional SKU" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Room</label>
                  <input defaultValue={editingPackRequest.room ?? ""} name="room" placeholder="Dining room" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Category</label>
                  <input defaultValue={editingPackRequest.category ?? ""} name="category" placeholder="Tables / Dining" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Color</label>
                  <input defaultValue={editingPackRequest.color ?? ""} name="color" placeholder="Walnut/Brown" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Condition</label>
                  <select defaultValue="good" name="condition">
                    {inventoryConditionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#33413b]">Inventory Notes</label>
                  <textarea
                    defaultValue={editingPackRequest.notes ?? ""}
                    name="notes"
                    placeholder="Add any identifying details that will help the team recognize this exact piece later."
                  />
                </div>
                <div className="md:col-span-2">
                  <PendingSubmitButton className={quietButtonClass} pendingLabel="Creating…">
                    Create and Add Exact Item
                  </PendingSubmitButton>
                </div>
              </form>
            ) : null}
          </div>
        </PersistentDetails>
        <div className="mt-5 space-y-6">
          {openPackRequests.length === 0 ? (
            <p className={mutedTextClass}>No pack requests yet.</p>
          ) : (
            openPackRequestsByRoom.map(([roomLabel, requests]) => (
              <PersistentDetails storageKey={`job:${id}:room:${roomLabel}`} key={roomLabel} className="group space-y-4" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-1 text-left hover:bg-[#fff8ef] [&::-webkit-details-marker]:hidden">
                  <h3 className="text-lg font-semibold text-[#20322a]">
                    {roomLabel} ({requests.length})
                  </h3>
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-[#6f756c] transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                {requests.map((request) => {
                  return (
                    <PersistentDetails
                      key={request.id}
                      storageKey={`job:${id}:pack-request:${request.id}`}
                      className="group/packRequest rounded-2xl border border-[#ecdcc7] bg-white p-4"
                      lazyRender
                      open={activePickRequest?.id === request.id || editingPackRequest?.id === request.id}
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-xl font-semibold text-[#20322a]">
                            {request.quantity} x {request.request_text}
                          </p>
                          <p className={`${mutedTextClass} mt-2`}>
                            {request.room ?? "No room"} • {request.category ?? "No category"} • {request.color ?? "No color"}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className={request.picked_count >= request.quantity ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-[#6f756c]"}>
                              {request.picked_count}/{request.quantity} exact
                            </span>
                            {request.optional ? <span className="rounded-full border border-[#e3d0ba] px-2 py-0.5 text-xs font-semibold text-[#6f756c]">Optional</span> : null}
                            {request.active_job_names.length > 0 ? <span className="rounded-full border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-700">Active elsewhere</span> : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="rounded-full bg-[#17352c] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#d8e6dd]">
                            {request.status === "packed" ? "legacy packed" : request.status}
                          </span>
                          <SectionChevron groupName="packRequest" />
                        </div>
                      </summary>

                      <div className="mt-4 space-y-2 border-t border-[#ecdcc7] pt-4">
                        {request.scene_template_name ? (
                          <p className={mutedTextClass}>
                            Scene: {request.scene_template_name}
                            {request.scene_room_label ? ` • ${request.scene_room_label}` : ""}
                          </p>
                        ) : null}
                        <p className={request.picked_count >= request.quantity ? "text-sm leading-6 text-emerald-700" : mutedTextClass}>
                          Exact items added to this request: {request.picked_count}
                        </p>
                        {request.requested_item_id && request.picked_count === 0 ? (
                          <p className={mutedTextClass}>
                            This selected item has not been added to the request yet. Use Add as Exact Item below to include it. It will not check the item out.
                          </p>
                        ) : null}
                        {request.active_job_names.length > 0 ? (
                          <p className="text-sm leading-6 text-rose-700">Also on active jobs: {request.active_job_names.join(", ")}</p>
                        ) : null}
                        {request.notes ? <p className={mutedTextClass}>Notes: {request.notes}</p> : null}
                        <p className={mutedTextClass}>
                          {request.picked_count === 0
                            ? "Next: open Select Exact Item Options and choose inventory for this request."
                            : "Next: use Check Out to Project on the chosen item when it is ready to leave inventory. Adding exact options does not check them out."}
                        </p>
                      </div>

                      {request.picked_items.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {request.picked_items.map((pickedItem) => (
                            <div key={pickedItem.id} className="rounded-2xl border border-[#efe2d0] bg-[#fff8ef] p-3">
                              <div className="flex items-start gap-3">
                                {pickedItem.thumbnail_url ? (
                                  <ItemThumbnail
                                    alt={`${pickedItem.item_name} thumbnail`}
                                    href={`/inventory/${pickedItem.item_id}`}
                                    src={pickedItem.thumbnail_url}
                                  />
                                ) : null}
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-[#20322a]">
                                    {pickedItem.item_name} ({pickedItem.item_code})
                                  </p>
                                  <p className={`${mutedTextClass} mt-2`}>
                                    {pickedItem.item_category ?? "No category"} • {pickedItem.item_color ?? "No color"} • {pickedItem.item_room ?? "No room"}
                                  </p>
                                  {pickedItem.notes ? <p className={`${mutedTextClass} mt-2`}>Pick notes: {pickedItem.notes}</p> : null}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <PendingLink className={secondaryButtonClass} href={`/inventory/${pickedItem.item_id}`} pendingLabel="Opening…">
                                  Open Picked Item
                                </PendingLink>
                                <form action={assignItemAction}>
                                  <input name="job_id" type="hidden" value={id} />
                                  <input name="item_id" type="hidden" value={pickedItem.item_id} />
                                  <PendingSubmitButton className={secondaryButtonClass} disabled={pickedItem.item_status !== "available"} pendingLabel="Checking out…">
                                    {getCheckoutButtonLabel(pickedItem.item_status, activeAssignedItemIds.has(pickedItem.item_id))}
                                  </PendingSubmitButton>
                                </form>
                                <form action={deletePickedItemAction}>
                                  <input name="job_id" type="hidden" value={id} />
                                  <input name="job_pick_item_id" type="hidden" value={pickedItem.id} />
                                  <PendingSubmitButton pendingLabel="Removing…" className={secondaryButtonClass} type="submit">
                                    Remove Pick
                                  </PendingSubmitButton>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link className={secondaryButtonClass} href={buildJobUrl(id, { editRequestId: request.id })}>
                          Edit
                        </Link>
                        <form action={toggleOptionalAction}>
                          <input name="job_id" type="hidden" value={id} />
                          <input name="pack_request_id" type="hidden" value={request.id} />
                          <PendingSubmitButton className={secondaryButtonClass} pendingLabel="Saving…">
                            {request.optional ? "Mark Required" : "Mark Optional"}
                          </PendingSubmitButton>
                        </form>
                        {request.requested_item_id ? (
                          <PendingLink className={secondaryButtonClass} href={`/inventory/${request.requested_item_id}`} pendingLabel="Opening…">
                            Open Exact Item
                          </PendingLink>
                        ) : null}
                        <PersistentDetails storageKey={`job:${id}:pick-options:${request.id}`}
                          resetToken={activePickRequest?.id === request.id && tone === "success" && message ? request.picked_items.map((item) => item.id).join(",") : undefined}
                          forceOpen={activePickRequest?.id === request.id && tone === "error"} className="w-full rounded-xl border border-[#ecdcc7] bg-[#fffaf4] p-3" open={activePickRequest?.id === request.id && tone === "error"}>
                          <summary className="cursor-pointer list-none text-sm font-semibold text-[#33413b] [&::-webkit-details-marker]:hidden">
                            Select Exact Item Options
                          </summary>
                          <form action={quickSelectAction} className="mt-4 grid gap-4">
                            <input name="job_id" type="hidden" value={id} />
                            <input name="pack_request_id" type="hidden" value={request.id} />
                            <div>
                              <p className="font-semibold text-[#20322a]">Choose items for: {request.request_text}</p>
                              <p className={`${mutedTextClass} mt-2`}>
                                Select one or more inventory items to add as exact options for this request. Selecting them does not check anything out.
                              </p>
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-[#33413b]">Pick notes</label>
                              <textarea name="notes" placeholder="Optional notes about why these items fit this request." />
                            </div>
                            <div>
                              <JobQuickSelectPicker
                                items={packCandidates.map((item) => ({
                                  id: item.id,
                                  name: item.name,
                                  item_code: item.item_code,
                                  status: item.status,
                                  category: item.category,
                                  color: item.color,
                                  current_location_name: item.current_location_name,
                                }))}
                              />
                            </div>
                            <div>
                              <PendingSubmitButton className={primaryButtonClass} pendingLabel="Saving…">Pick Selected for Request</PendingSubmitButton>
                            </div>
                          </form>
                        </PersistentDetails>
                        {request.requested_item_id && request.picked_count === 0 ? (
                          <form action={logPickedItemAction}>
                            <input name="job_id" type="hidden" value={id} />
                            <input name="item_id" type="hidden" value={request.requested_item_id} />
                            <input name="pack_request_id" type="hidden" value={request.id} />
                            <PendingSubmitButton className={secondaryButtonClass} pendingLabel="Adding…">
                              Add as Exact Item
                            </PendingSubmitButton>
                          </form>
                        ) : null}
                        <form action={cancelPackRequestAction}>
                          <input name="job_id" type="hidden" value={id} />
                          <input name="pack_request_id" type="hidden" value={request.id} />
                          <PendingSubmitButton className={secondaryButtonClass} pendingLabel="Cancelling…">
                            Cancel
                          </PendingSubmitButton>
                        </form>
                        <form action={deletePackRequestAction}>
                          <input name="job_id" type="hidden" value={id} />
                          <input name="pack_request_id" type="hidden" value={request.id} />
                          <PendingSubmitButton className={secondaryButtonClass} pendingLabel="Deleting…">
                            Delete
                          </PendingSubmitButton>
                        </form>
                      </div>
                    </PersistentDetails>
                  );
                })}
              </PersistentDetails>
            ))
          )}
        </div>
      </PersistentDetails>

      </section>

      <section className="space-y-4 rounded-[2rem] border border-[#cfe0d4] bg-[#f4f8f5] p-3 sm:p-5">
        <div className="px-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60766a]">Step 3</p>
          <h2 className="mt-1 text-xl font-semibold text-[#20322a]">Pull, deliver & return</h2>
          <p className={`${mutedTextClass} mt-1`}>Move chosen pieces through the load queue, checkout, and return without leaving the workflow.</p>
        </div>
      {extraPickedItems.length > 0 ? (
        <PersistentDetails storageKey={`job:${id}:extra-items`} className={`${sectionCardClass} group scroll-mt-6`} id="extra-items" open={detailsOpen(activeSection, "extra-items", true)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <SectionHeader
              title="Legacy Unlinked Items"
              countLabel={buildCountLabel(extraPickedItems.length, "item")}
              description="Older exact-item logs without a matching pack request still live here until they are cleaned up."
            />
            <SectionChevron />
          </summary>
          <div className="mt-5 space-y-4">
            {extraPickedItems.map((pickedItem) => (
              <article key={pickedItem.id} className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
                <p className="text-lg font-semibold text-[#20322a]">
                  {pickedItem.item_name} ({pickedItem.item_code})
                </p>
                <p className={`${mutedTextClass} mt-2`}>
                  {pickedItem.item_category ?? "No category"} • {pickedItem.item_color ?? "No color"} • {pickedItem.item_room ?? "No room"}
                </p>
                {pickedItem.notes ? <p className={`${mutedTextClass} mt-2`}>Pick notes: {pickedItem.notes}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <PendingLink className={secondaryButtonClass} href={`/inventory/${pickedItem.item_id}`} pendingLabel="Opening…">
                    Open Item
                  </PendingLink>
                  <form action={assignItemAction}>
                    <input name="job_id" type="hidden" value={id} />
                    <input name="item_id" type="hidden" value={pickedItem.item_id} />
                    <input name="section" type="hidden" value="extra-items" />
                    <PendingSubmitButton className={secondaryButtonClass} disabled={pickedItem.item_status !== "available"} pendingLabel="Checking out…">
                      {getCheckoutButtonLabel(pickedItem.item_status, activeAssignedItemIds.has(pickedItem.item_id))}
                    </PendingSubmitButton>
                  </form>
                  <form action={deletePickedItemAction}>
                    <input name="job_id" type="hidden" value={id} />
                    <input name="job_pick_item_id" type="hidden" value={pickedItem.id} />
                    <input name="section" type="hidden" value="extra-items" />
                    <PendingSubmitButton pendingLabel="Removing…" className={secondaryButtonClass} type="submit">
                      Remove Pick
                    </PendingSubmitButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </PersistentDetails>
      ) : null}

      {pickedQueueItems.length > 0 ? <PersistentDetails storageKey={`job:${id}:picked-queue`} className={`${sectionCardClass} group scroll-mt-6`} id="picked-queue" open={detailsOpen(activeSection, "picked-queue", true)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <SectionHeader
            title="Picked Queue"
            countLabel={buildCountLabel(pickedQueueItems.length, "item")}
            description="These exact picks are logged for this project but not yet checked out. Use this as the trailer/load queue. As items are checked out, they disappear from here and move into Checked Out to Project."
          />
          <SectionChevron />
        </summary>
        <div className="mt-5 space-y-4">
          {pickedQueueItems.length === 0 ? (
            <p className={mutedTextClass}>No picked items are waiting for checkout.</p>
          ) : (
            pickedQueueItems.map((pickedItem) => {
              const linkedRequest = pickedItem.pack_request_id ? openPackRequestById.get(pickedItem.pack_request_id) ?? null : null;

              return (
                <article key={pickedItem.id} className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
                  <div className="flex items-start gap-3">
                    {pickedItem.thumbnail_url ? (
                      <ItemThumbnail alt={`${pickedItem.item_name} thumbnail`} href={`/inventory/${pickedItem.item_id}`} src={pickedItem.thumbnail_url} />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-[#20322a]">
                        {pickedItem.item_name} ({pickedItem.item_code})
                      </p>
                      <p className={`${mutedTextClass} mt-2`}>
                        {pickedItem.item_category ?? "No category"} • {pickedItem.item_color ?? "No color"} • {pickedItem.item_room ?? "No room"}
                      </p>
                      <p className={`${mutedTextClass} mt-2`}>
                        Source request: {linkedRequest ? `${linkedRequest.request_text}${linkedRequest.room ? ` • ${linkedRequest.room}` : ""}` : "Legacy unlinked pick"}
                      </p>
                      {pickedItem.notes ? <p className={`${mutedTextClass} mt-2`}>Pick notes: {pickedItem.notes}</p> : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <PendingLink className={secondaryButtonClass} href={`/inventory/${pickedItem.item_id}`} pendingLabel="Opening…">
                      Open Picked Item
                    </PendingLink>
                    <form action={assignItemAction}>
                      <input name="job_id" type="hidden" value={id} />
                      <input name="item_id" type="hidden" value={pickedItem.item_id} />
                      <input name="section" type="hidden" value="assignments" />
                      <PendingSubmitButton className={primaryButtonClass} disabled={pickedItem.item_status !== "available"} pendingLabel="Checking out…">
                        {getCheckoutButtonLabel(pickedItem.item_status, activeAssignedItemIds.has(pickedItem.item_id))}
                      </PendingSubmitButton>
                    </form>
                    <form action={deletePickedItemAction}>
                      <input name="job_id" type="hidden" value={id} />
                      <input name="job_pick_item_id" type="hidden" value={pickedItem.id} />
                      <input name="section" type="hidden" value="picked-queue" />
                      <PendingSubmitButton pendingLabel="Removing…" className={secondaryButtonClass} type="submit">
                        Remove Pick
                      </PendingSubmitButton>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </PersistentDetails> : null}

      {activeAssignments.length > 0 ? <PersistentDetails storageKey={`job:${id}:assignments`} className={`${sectionCardClass} group scroll-mt-6`} id="assignments" open={detailsOpen(activeSection, "assignments", true)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <SectionHeader
            title="Checked Out to Project"
            countLabel={buildCountLabel(activeAssignments.length, "item")}
            description="These items are currently checked out to this project. Treat this as the on-trailer / at-house list. Use Check In when the item physically returns from the house or stage."
          />
          <SectionChevron />
        </summary>
        <div className="mt-4">
          <CheckInAllItemsForm action={checkInAllItemsAction} itemCount={activeAssignments.length} jobId={id} />
        </div>
        <div className="mt-5 space-y-4">
          {activeAssignments.length === 0 ? (
            <p className={mutedTextClass}>No active assignments.</p>
          ) : (
            activeAssignments.map((assignment) => (
              <article key={assignment.id} className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
                <p className="text-lg font-semibold text-[#20322a]">
                  {assignment.item_name} ({assignment.item_code})
                </p>
                <p className={`${mutedTextClass} mt-2`}>Category: {assignment.item_category ?? "Uncategorized"}</p>
                <p className={mutedTextClass}>Room: {assignment.item_room ?? "Not assigned"}</p>
                <p className={mutedTextClass}>Checked out: {formatTimestamp(assignment.checked_out_at)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PendingLink className={secondaryButtonClass} href={`/inventory/${assignment.item_id}`} pendingLabel="Opening…">
                    Open Item
                  </PendingLink>
                  <form action={checkInItemAction}>
                    <input name="job_id" type="hidden" value={id} />
                    <input name="job_item_id" type="hidden" value={assignment.id} />
                    <PendingSubmitButton className={primaryButtonClass} pendingLabel="Checking in…">
                      Check In
                    </PendingSubmitButton>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </PersistentDetails> : null}

      {completedAssignments.length > 0 ? <PersistentDetails storageKey={`job:${id}:checked-in`} className={`${sectionCardClass} group`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <SectionHeader
            title="Checked In"
            countLabel={buildCountLabel(completedAssignments.length, "item")}
            description="Check-in closes the assignment and puts the inventory item back into available status."
          />
          <SectionChevron />
        </summary>
        <div className="mt-5 space-y-3">
          {completedAssignments.length === 0 ? (
            <p className={mutedTextClass}>No completed check-ins yet.</p>
          ) : (
            completedAssignments.map((assignment) => (
              <article key={assignment.id} className="rounded-2xl border border-[#ecdcc7] bg-white p-4">
                <p className="font-semibold text-[#20322a]">
                  {assignment.item_name} ({assignment.item_code})
                </p>
                <p className={`${mutedTextClass} mt-2`}>Checked in: {formatTimestamp(assignment.checked_in_at)}</p>
              </article>
            ))
          )}
        </div>
      </PersistentDetails> : null}
      </section>
    </section>
  );
}
