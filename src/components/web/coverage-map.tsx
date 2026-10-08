"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { PublicCoverageCommunity, PublicCoverageSummary } from "@/lib/db/jobs";

type Position = { lat: number; lng: number };

type GoogleMap = {
  fitBounds: (bounds: { extend: (position: Position) => void }) => void;
  setCenter: (position: Position) => void;
  setZoom: (zoom: number) => void;
};

type GoogleMapsApi = {
  Geocoder: new () => { geocode: (request: { address: string }, callback: (results: Array<{ geometry: { location: { lat: () => number; lng: () => number } } }> | null, status: string) => void) => void };
  LatLngBounds: new () => { extend: (position: Position) => void };
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: { label?: string; map: GoogleMap; position: Position; title: string }) => { addListener: (event: string, listener: () => void) => void };
};

function mapsApiIsReady(value: { maps?: GoogleMapsApi } | undefined): value is { maps: GoogleMapsApi } {
  return typeof value?.maps?.Map === "function";
}

const twinCities = { lat: 44.9778, lng: -93.265 };

function CommunityDetail({ community }: { community: PublicCoverageCommunity }) {
  return (
    <div aria-live="polite" className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-[#fffdf8]/95 p-4 shadow-lg backdrop-blur-sm sm:right-auto sm:max-w-xs">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9e7b39]">City coverage</p>
      <p className="mt-1 font-serif text-2xl text-[#26332c]">{community.name}</p>
      <p className="mt-1 text-sm leading-6 text-[#4f5d55]">{community.projectCount} completed project{community.projectCount === 1 ? "" : "s"} in this city.</p>
    </div>
  );
}

export function CoverageMap({ apiKey, coverage }: { apiKey: string | undefined; coverage: PublicCoverageSummary }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<PublicCoverageCommunity | null>(null);

  useEffect(() => {
    const markReady = () => setReady(true);
    if (mapsApiIsReady((window as unknown as { google?: { maps: GoogleMapsApi } }).google)) markReady();
    window.addEventListener("google-maps-ready", markReady);
    return () => window.removeEventListener("google-maps-ready", markReady);
  }, []);

  useEffect(() => {
    const browserWindow = window as unknown as { google?: { maps: GoogleMapsApi } };
    if (!ready || !mapElement.current || !mapsApiIsReady(browserWindow.google)) return;

    const maps = browserWindow.google.maps;
    const map = new maps.Map(mapElement.current, {
      center: twinCities,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      zoom: 9,
    });
    if (coverage.communities.length === 0) return;

    const geocoder = new maps.Geocoder();
    const bounds = new maps.LatLngBounds();
    let resolvedCommunityCount = 0;
    coverage.communities.forEach((community) => {
      // Geocode the city name only. No saved project coordinate ever reaches this map.
      geocoder.geocode({ address: `${community.name}, Minnesota` }, (results, status) => {
        const location = results?.[0]?.geometry.location;
        if (status !== "OK" || !location) return;
        const position = { lat: location.lat(), lng: location.lng() };
        bounds.extend(position);
        resolvedCommunityCount += 1;
        new maps.Marker({
          label: community.projectCount > 1 ? String(community.projectCount) : undefined,
          map,
          position,
          title: `${community.name}: ${community.projectCount} completed project${community.projectCount === 1 ? "" : "s"}`,
        }).addListener("click", () => setSelectedCommunity(community));
        if (resolvedCommunityCount === coverage.communities.length) {
          if (coverage.communities.length === 1) {
            map.setCenter(position);
            map.setZoom(11);
          } else {
            map.fitBounds(bounds);
          }
        }
      });
    });
  }, [coverage.communities, ready]);

  const hasProjects = coverage.mappedProjectCount > 0;
  if (!apiKey) {
    return <p className="rounded-2xl border border-[#dfd4bc] bg-[#f8f3e8] px-5 py-4 text-sm leading-6 text-[#4f5d55]">Our coverage includes {coverage.communityCount} Twin Cities communities. Add the browser Google Maps key to display the interactive map.</p>;
  }

  return (
    <div className="relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-[#d8d0bd] bg-[#dfe8dd] shadow-[0_18px_45px_rgba(39,55,45,0.12)]">
      <Script id="public-google-maps-javascript" onError={() => setLoadError(true)} onReady={() => { setReady(true); window.dispatchEvent(new Event("google-maps-ready")); }} src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`} strategy="afterInteractive" />
      {loadError ? <p className="m-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">The map could not load. Please check the Google Maps browser-key settings.</p> : <div aria-label="Interactive Twin Cities service-area map" className="absolute inset-0" ref={mapElement} />}
      {selectedCommunity ? <CommunityDetail community={selectedCommunity} /> : <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-[#fffdf8]/95 p-4 shadow-lg backdrop-blur-sm sm:right-auto sm:max-w-xs"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9e7b39]">Twin Cities coverage</p><p className="mt-2 text-sm leading-6 text-[#4f5d55]">{hasProjects ? "Select a city marker to see completed projects there. Markers are placed at city level, never at a home or address." : "Project coverage will appear here as we add completed work."}</p></div>}
    </div>
  );
}
