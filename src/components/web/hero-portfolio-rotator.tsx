"use client";

import { useEffect, useState } from "react";

type HeroPortfolioRotatorProps = {
  images: string[];
};

export function HeroPortfolioRotator({ images }: HeroPortfolioRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % images.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.82),transparent_20%),linear-gradient(145deg,#c5b69c_0%,#e8e1d4_46%,#9eae9d_100%)]" />;
  }

  return (
    <div aria-hidden="true" className="absolute inset-0 bg-[#d8d1c2]">
      {images.map((image, index) => (
        <img
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          key={image}
          src={image}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(31,42,34,0.1),rgba(248,246,241,0.26)_48%,rgba(28,43,34,0.28))]" />
    </div>
  );
}
