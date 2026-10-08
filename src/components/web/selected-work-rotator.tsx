"use client";

import { useEffect, useMemo, useState } from "react";

const PANEL_COUNT = 3;
const ROTATION_INTERVAL = 6_000;
const PANEL_OFFSET = 2_000;

function imageOrder(image: string) {
  return image.split("").reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0);
}

function startingIndexes(imageCount: number) {
  return Array.from({ length: PANEL_COUNT }, (_, panelIndex) => Math.floor(panelIndex * imageCount / PANEL_COUNT) % imageCount);
}

export function SelectedWorkRotator({ images }: { images: string[] }) {
  const panelCount = Math.min(PANEL_COUNT, images.length);
  const shuffledImages = useMemo(() => [...images].sort((left, right) => imageOrder(left) - imageOrder(right)), [images]);
  const [activeIndexes, setActiveIndexes] = useState(() => startingIndexes(images.length));

  useEffect(() => {
    setActiveIndexes(startingIndexes(images.length));
    if (images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers = Array.from({ length: panelCount }, (_, panelIndex) => {
      let interval: number | undefined;
      const advance = () => setActiveIndexes((current) => current.map((imageIndex, index) => index === panelIndex ? (imageIndex + 1) % images.length : imageIndex));
      const timeout = window.setTimeout(() => {
        advance();
        interval = window.setInterval(advance, ROTATION_INTERVAL);
      }, ROTATION_INTERVAL + panelIndex * PANEL_OFFSET);

      return { timeout, getInterval: () => interval };
    });

    return () => timers.forEach(({ timeout, getInterval }) => {
      window.clearTimeout(timeout);
      const interval = getInterval();
      if (interval) window.clearInterval(interval);
    });
  }, [images.length, panelCount]);

  return (
    <div className="mt-10 grid gap-5 md:grid-cols-3">
      {Array.from({ length: panelCount }, (_, panelIndex) => (
        <div className={`relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#d9d4ca] ${panelIndex === 1 ? "md:mt-10" : ""}`} key={panelIndex}>
          {shuffledImages.map((image, imageIndex) => (
            <img alt="AJ Home Staging finished project" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${imageIndex === activeIndexes[panelIndex] ? "opacity-100" : "opacity-0"}`} key={image} src={image} />
          ))}
        </div>
      ))}
    </div>
  );
}
