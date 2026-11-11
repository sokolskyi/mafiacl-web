"use client";

import { useState } from "react";

/** Фото товара: большое + миниатюры для переключения. */
export function Gallery({ images, alt, label }: { images: string[]; alt: string; label: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return (
      <span aria-hidden="true" className="flex aspect-square w-full items-center justify-center rounded-lg bg-neutral-800 font-display text-7xl font-extrabold uppercase text-neutral-500">
        {alt.slice(0, 1)}
      </span>
    );
  }
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[i]} alt={alt} className="aspect-[4/5] w-full rounded-lg bg-neutral-900 object-contain" />
      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={label}>
          {images.map((src, n) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(n)}
              aria-label={`${label} ${n + 1}`}
              aria-pressed={n === i}
              className={`h-16 w-16 overflow-hidden rounded border-2 ${n === i ? "border-white" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
