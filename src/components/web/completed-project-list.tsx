"use client";

import { PendingBlockLink } from "@/components/web/pending-block-link";
import type { JobWithStats } from "@/lib/db/jobs";

type CompletedProjectListProps = {
  description: string;
  jobs: JobWithStats[];
  title?: string;
};

function addressFor(job: JobWithStats) {
  return job.address_label ?? ([job.address1, job.address2, job.city, job.state, job.postal].filter(Boolean).join(", ") || "No address yet");
}

export function CompletedProjectList({ description, jobs, title = "Completed Projects" }: CompletedProjectListProps) {
  if (jobs.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{jobs.length}</span>
      </div>
      <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-slate-50">
        {jobs.map((job) => (
          <PendingBlockLink
            key={job.id}
            aria-label={`Open ${job.name}`}
            className="block px-4 py-3 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
            href={`/jobs/${job.id}`}
            pendingLabel={`Opening ${job.name}…`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground">{job.name}</span>
                <span className="block truncate text-sm text-muted">{addressFor(job)}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{job.status}</span>
            </span>
          </PendingBlockLink>
        ))}
      </div>
    </section>
  );
}
