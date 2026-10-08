"use client";

import { useMemo, useState } from "react";

import { CompletedProjectList } from "@/components/web/completed-project-list";
import { PendingBlockLink } from "@/components/web/pending-block-link";
import type { JobWithStats } from "@/lib/db/jobs";

function addressFor(job: JobWithStats) {
  return job.address_label ?? ([job.address1, job.address2, job.city, job.state, job.postal].filter(Boolean).join(", ") || "No address yet");
}

function matchesSearch(job: JobWithStats, query: string) {
  return `${job.name} ${addressFor(job)}`.toLocaleLowerCase().includes(query);
}

export function ProjectsList({ jobs }: { jobs: JobWithStats[] }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const filteredJobs = useMemo(() => query ? jobs.filter((job) => matchesSearch(job, query)) : jobs, [jobs, query]);
  const activeJobs = filteredJobs.filter((job) => job.status === "active");
  const completedJobs = filteredJobs.filter((job) => job.status === "completed");
  const historicalJobs = filteredJobs.filter((job) => job.status !== "active" && job.status !== "completed");

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="sr-only">Search projects</span>
        <input className="w-full" onChange={(event) => setSearch(event.target.value)} placeholder="Search by address or project name" type="search" value={search} />
      </label>

      {filteredJobs.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">No projects match “{search.trim()}”.</div> : null}

      {activeJobs.length > 0 ? (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Active Projects</h2><p className="text-sm text-muted">Live staging work and upcoming assignments.</p></div>
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{activeJobs.length}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {activeJobs.map((job) => (
              <PendingBlockLink key={job.id} aria-label={`Open ${job.name}`} className="group block rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30" href={`/jobs/${job.id}`} pendingLabel={`Opening ${job.name}…`}>
                <span className="flex items-start justify-between gap-3">
                  <span><span className="block text-xl font-semibold tracking-tight text-foreground transition group-hover:text-accent">{job.name}</span><span className="mt-1 block text-sm text-muted">{addressFor(job)}</span></span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Active</span>
                </span>
                <span className="mt-3 block space-y-1 text-sm text-muted"><span className="block">{job.latitude != null && job.longitude != null ? "Map pin ready" : "Missing map coordinates"}</span><span className="block">Dates: {job.start_date ?? "—"} to {job.end_date ?? "—"}</span></span>
                <span className="mt-4 grid gap-3 sm:grid-cols-2"><span className="rounded-xl bg-slate-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Assigned</span><span className="mt-1 block text-base font-semibold text-foreground">{job.activeItemCount}</span></span><span className="rounded-xl bg-slate-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Pack Requests</span><span className="mt-1 block text-base font-semibold text-foreground">{job.packRequestCount}</span></span></span>
              </PendingBlockLink>
            ))}
          </div>
        </section>
      ) : null}

      <CompletedProjectList description="A compact record of finished staging work." jobs={completedJobs} />
      <CompletedProjectList description="Cancelled and archived project records." jobs={historicalJobs} title="Other Project History" />
    </div>
  );
}
