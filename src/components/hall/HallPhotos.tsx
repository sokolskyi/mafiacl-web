"use client";

import { useTranslations } from "next-intl";
import { usePhotoLightbox } from "./usePhotoLightbox";

/** Фото записи зала славы: главное крупно, остальные «полароидами» поверх угла; клик — просмотр на странице. */
export function HallPhotos({ photos, alt, caption }: { photos: string[]; alt: string; caption: string }) {
  const t = useTranslations("hall");
  const { open, element } = usePhotoLightbox(photos, alt, caption);
  const [first, ...rest] = photos;

  return (
    <>
      <div className="hall-photos">
        <button type="button" onClick={() => open(0)} className="hall-main" aria-label={`${t("photoOpen")}: ${alt}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={first} alt={alt} loading="lazy" />
        </button>
        {rest.length > 0 && (
          <div className="hall-polaroids">
            {rest.slice(0, 3).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => open(i + 1)}
                className="hall-polaroid"
                style={{ "--i": i } as React.CSSProperties}
                aria-label={`${t("photoOpen")}: ${alt} · ${i + 2}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <span className="hall-count" aria-hidden="true">
            {photos.length} {t("photosShort")}
          </span>
        )}
      </div>
      {element}
    </>
  );
}
