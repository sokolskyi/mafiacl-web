"use client";

import { useTranslations } from "next-intl";
import { usePhotoLightbox } from "./usePhotoLightbox";

/** Фотомозаика события: первое фото крупно, остальные плитками разного размера; клик — просмотр на странице. */
export function PhotoMosaic({ photos, alt, caption, max = 12 }: { photos: string[]; alt: string; caption: string; max?: number }) {
  const t = useTranslations("hall");
  const { open, element } = usePhotoLightbox(photos, alt, caption);
  const shown = photos.slice(0, max);
  const more = photos.length - shown.length;

  return (
    <>
      <ul className="mosaic">
        {shown.map((src, i) => (
          <li key={src} className={`mosaic-tile mosaic-${i} ${i === shown.length - 1 && (shown.length - 1) % 2 === 1 ? "mosaic-fill" : ""}`}>
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
