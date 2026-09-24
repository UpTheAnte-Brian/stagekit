import Link from "next/link";

import { ProjectMap } from "@/components/jobs/project-map";
import { listJobsWithStats } from "@/lib/db/jobs";

export default async function ProjectMapPage() {
  const jobs = await listJobsWithStats();
  const mappedProjects = jobs
    .filter((job) => job.latitude != null && job.longitude != null)
    .map((job) => ({
      id: job.id,
      name: job.name,
      address: job.address_label ?? ([job.address1, job.address2, job.city, job.state, job.postal].filter(Boolean).join(", ") || null),
      latitude: job.latitude as number,
      longitude: job.longitude as number,
    }));
  const unmappedProjects = jobs.filter((job) => job.latitude == null || job.longitude == null);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Projects</p>
          <h1 className="text-2xl font-semibold tracking-tight">Project map</h1>
          <p className="text-sm text-muted">{mappedProjects.length} project{mappedProjects.length === 1 ? "" : "s"} pinned from saved Google Maps coordinates.</p>
        </div>
        <Link className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:border-accent/40" href="/jobs">Back to Projects</Link>
      </div>

      <ProjectMap apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY} projects={mappedProjects} />

      {unmappedProjects.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-950">Projects still missing coordinates</h2>
          <p className="mt-1 text-sm text-amber-900">Open a project, enter its street address, city, and state, then save it after the Google Maps server key is configured.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unmappedProjects.map((project) => <Link className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-950" href={`/jobs/${project.id}`} key={project.id}>{project.name}</Link>)}
          </div>
        </section>
      ) : null}
    </section>
  );
}
