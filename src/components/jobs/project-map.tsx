"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MapProject = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
  activeItemCount: number;
  packRequestCount: number;
  thumbnailUrl: string | null;
};

type GoogleMap = {
  fitBounds: (bounds: { extend: (position: { lat: number; lng: number }) => void }) => void;
  setCenter: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: { map: GoogleMap; position: { lat: number; lng: number }; title: string }) => { addListener: (event: string, listener: () => void) => void };
  LatLngBounds: new () => { extend: (position: { lat: number; lng: number }) => void };
};

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
  }
}

export function ProjectMap({ apiKey, projects }: { apiKey: string | undefined; projects: MapProject[] }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(null);

  useEffect(() => {
    if (!ready || !mapElement.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const map = new maps.Map(mapElement.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
      zoom: 4,
    });

    if (projects.length === 0) return;
    const bounds = new maps.LatLngBounds();
    projects.forEach((project) => {
      const position = { lat: project.latitude, lng: project.longitude };
      bounds.extend(position);
      const marker = new maps.Marker({ map, position, title: `View ${project.name}` });
      marker.addListener("click", () => setSelectedProject(project));
    });
    if (projects.length === 1) {
      map.setCenter({ lat: projects[0].latitude, lng: projects[0].longitude });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds);
    }
  }, [projects, ready, router]);

  if (!apiKey) {
    return <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Add <code>NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY</code> to enable the interactive map.</p>;
  }

  return (
    <>
      <Script id="google-maps-javascript" onError={() => setLoadError(true)} onReady={() => setReady(true)} src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`} strategy="afterInteractive" />
      {loadError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Google Maps could not load. Check the browser-key restrictions and that the Maps JavaScript API is enabled.</p> : <div aria-label="Project map" className="h-[32rem] overflow-hidden rounded-2xl border border-border bg-slate-100" ref={mapElement} />}
      {selectedProject ? (
        <div aria-label={`${selectedProject.name} preview`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog">
          <button aria-label="Close project preview" className="absolute inset-0" onClick={() => setSelectedProject(null)} type="button" />
          <section className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex h-44 items-center justify-center bg-slate-100">
              {selectedProject.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={`${selectedProject.name} consult`} className="h-full w-full object-cover" src={selectedProject.thumbnailUrl} />
              ) : (
                <span className="text-sm font-medium text-slate-500">No project photo yet</span>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{selectedProject.status}</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{selectedProject.name}</h2>
                </div>
                <button aria-label="Close project preview" className="rounded-lg px-2 py-1 text-lg text-muted hover:bg-slate-100" onClick={() => setSelectedProject(null)} type="button">×</button>
              </div>
              <p className="mt-2 text-sm leading-5 text-muted">{selectedProject.address ?? "No address saved."}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs text-muted">Active items</p><p className="font-semibold">{selectedProject.activeItemCount}</p></div>
                <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs text-muted">Pack requests</p><p className="font-semibold">{selectedProject.packRequestCount}</p></div>
              </div>
              <button className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90" onClick={() => router.push(`/jobs/${selectedProject.id}`)} type="button">Open project</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
