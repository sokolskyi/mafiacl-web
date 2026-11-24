"use client";

import { useTranslations } from "next-intl";
import { usePhotoLightbox } from "./usePhotoLightbox";

/** Фотомозаика события: первое фото крупно, остальные плитками разного размера; клик — просмотр на странице. */
export function PhotoMosaic({ photos, alt, caption, max = 12 }: { photos: string[]; alt: string; caption: string; max?: number }) {
  const t = useTranslations("hall");
  const { open, element } = usePhotoLightbox(photos, alt, caption);
  const shown = photos.slice(0, max);
  const more = photos.length - shown.length;
  // На широком экране (4 колонки) подбираем широкие плитки так, чтобы сетка закрывалась без дырок.
  const n = shown.length;
  const wide = new Set([3, 7].filter((i) => i < n));
  const cells = () => (n ? 4 + (n - 1) + wide.size + (n > 4 ? 1 : 0) : 0);
  for (let i = n - 1; i > 0 && cells() % 4 !== 0; i--) if (i !== 4 && !wide.has(i)) wide.add(i);

  return (
    <>
      <ul className="mosaic">
        {shown.map((src, i) => (
          <li key={src} className={`mosaic-tile mosaic-${i} ${wide.has(i) ? "mosaic-wide" : ""} ${i === n - 1 && (n - 1) % 2 === 1 ? "mosaic-fill" : ""}`}>
            <button type="button" onClick={() => open(i)} aria-label={`${t("photoOpen")}: ${alt} · ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
              {i === shown.length - 1 && more > 0 && <span className="mosaic-more">+{more}</span>}
            </button>
          </li>
        ))}
      </ul>
      {element}
    </>
  );
}
