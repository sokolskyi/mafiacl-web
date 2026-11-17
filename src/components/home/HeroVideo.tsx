"use client";

import { useEffect, useRef } from "react";

/** Фоновое видео первого экрана: без звука, по кругу; при «уменьшить движение» стоит на первом кадре. */
export function HeroVideo({ label, className }: { label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (mq.matches) v.pause();
      else void v.play().catch(() => {});
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src="/home/hero.mp4"
      poster="/home/hero-poster.webp"
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-label={label}
    />
  );
}
