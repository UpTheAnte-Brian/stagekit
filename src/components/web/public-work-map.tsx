"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import type { PublicWorkPlace } from "@/lib/db/photo-releases";

type GoogleMap = { fitBounds: (bounds: { extend: (position: { lat: number; lng: number }) => void }) => void; setCenter: (position: { lat: number; lng: number }) => void; setZoom: (zoom: number) => void };
type GoogleMapsApi = { Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap; Marker: new (options: { map: GoogleMap; position: { lat: number; lng: number }; title: string }) => { addListener: (event: string, listener: () => void) => void }; LatLngBounds: new () => { extend: (position: { lat: number; lng: number }) => void } };

declare global { interface Window { google?: { maps: GoogleMapsApi } } }

export function PublicWorkMap({ apiKey, places }: { apiKey: string | undefined; places: PublicWorkPlace[] }) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PublicWorkPlace | null>(places[0] ?? null);

  useEffect(() => {
    if (!ready || !element.current || !window.google?.maps) return;
    const maps = window.google.maps;
    const map = new maps.Map(element.current, { center: { lat: 44.98, lng: -93.27 }, zoom: 9, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
    if (!places.length) return;
    const bounds = new maps.LatLngBounds();
    places.forEach((place) => {
      const position = { lat: place.latitude, lng: place.longitude };
      bounds.extend(position);
      const marker = new maps.Marker({ map, position, title: `View ${place.label}` });
      marker.addListener("click", () => setSelectedPlace(place));
    });
    if (places.length === 1) { map.setCenter({ lat: places[0].latitude, lng: places[0].longitude }); map.setZoom(11); } else map.fitBounds(bounds);
  }, [places, ready]);

  if (!places.length) return <div className="rounded-[1.5rem] border border-[#e1d9c9] bg-white p-8 text-center text-[#657067]"><p className="font-serif text-2xl text-[#26332c]">More transformations are on the way.</p><p className="mt-3 text-sm leading-6">We’ll add before-and-after stories here as homeowners approve them for sharing.</p></div>;

  return <>
    {apiKey ? <Script id="public-google-maps" onError={() => setLoadError(true)} onReady={() => setReady(true)} src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`} strategy="afterInteractive" /> : null}
    {apiKey && !loadError ? <div aria-label="Map of AJ Home Staging work" className="h-[26rem] overflow-hidden rounded-[1.5rem] border border-[#d8d0bd] bg-[#e6ece1]" ref={element} /> : <div className="rounded-[1.5rem] border border-[#e1d9c9] bg-white p-8 text-center text-[#657067]"><p className="font-serif text-2xl text-[#26332c]">Our Twin Cities transformations</p><p className="mt-3 text-sm">Choose a place below to see its before and after.</p></div>}
    <div className="mt-5 flex flex-wrap gap-2">{places.map((place) => <button className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selectedPlace?.id === place.id ? "border-[#283a31] bg-[#283a31] text-white" : "border-[#c9b58a] text-[#665021] hover:bg-[#efe7d5]"}`} key={place.id} onClick={() => setSelectedPlace(place)} type="button">{place.label}</button>)}</div>
    {selectedPlace ? <section aria-live="polite" className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#e1d9c9] bg-white p-4 sm:p-6"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9e7b39]">Selected place</p><h2 className="mt-2 font-serif text-3xl text-[#26332c]">{selectedPlace.label}</h2><p className="mt-2 text-sm text-[#657067]">An approximate community marker, shown to protect homeowner privacy.</p></div><div className="grid gap-4 sm:grid-cols-2"><figure><div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#e6e1d8]"><img alt={`${selectedPlace.label} before staging`} className="h-full w-full object-cover" src={selectedPlace.beforeUrl} /></div><figcaption className="mt-2 text-sm font-semibold text-[#59635c]">Before</figcaption></figure><figure><div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#e6e1d8]"><img alt={`${selectedPlace.label} after staging`} className="h-full w-full object-cover" src={selectedPlace.afterUrl} /></div><figcaption className="mt-2 text-sm font-semibold text-[#59635c]">After</figcaption></figure></div></section> : null}
  </>;
}
