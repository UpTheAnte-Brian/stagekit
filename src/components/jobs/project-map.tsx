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
      const marker = new maps.Marker({ map, position, title: `Open ${project.name}` });
      marker.addListener("click", () => router.push(`/jobs/${project.id}`));
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
      <Script id="google-maps-javascript" onError={() => setLoadError(true)} onLoad={() => setReady(true)} src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`} strategy="afterInteractive" />
      {loadError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Google Maps could not load. Check the browser-key restrictions and that the Maps JavaScript API is enabled.</p> : <div aria-label="Project map" className="h-[32rem] overflow-hidden rounded-2xl border border-border bg-slate-100" ref={mapElement} />}
    </>
  );
}
