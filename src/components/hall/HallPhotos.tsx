"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Фото записи зала славы: главное крупно, остальные «полароидами» поверх угла.
 * Клик открывает просмотр прямо на странице: листание свайпом (scroll-snap), стрелками и кнопками.
 */
export function HallPhotos({ photos, alt, caption }: { photos: string[]; alt: string; caption: string }) {
  const t = useTranslations("hall");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [first, ...rest] = photos;

  const open = (i: number) => {
    const d = dialogRef.current;
    const track = trackRef.current;
    if (!d || !track) return;
    d.showModal();
    setCurrent(i);
    // Сразу к нужному фото, без прокрутки через предыдущие.
    track.scrollTo({ left: i * track.clientWidth, behavior: "instant" });
  };

  const go = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const n = Math.max(0, Math.min(photos.length - 1, i));
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: n * track.clientWidth, behavior: still ? "instant" : "smooth" });
  }, [photos.length]);

  // Номер текущего фото: события scroll snap там, где они есть, иначе — по прокрутке.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const closest = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const items = () => [...track.children];
    const onSnap = (e: Event) => {
      const target = (e as Event & { snapTargetInline?: Element | null }).snapTargetInline;
      const i = target ? items().indexOf(target) : -1;
      if (i >= 0) setCurrent(i);
    };
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setCurrent(closest());
      });
    };
    if ("onscrollsnapchanging" in HTMLElement.prototype) {
      track.addEventListener("scrollsnapchanging", onSnap);
      track.addEventListener("scrollsnapchange", onSnap);
    } else {
      track.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scrollsnapchanging", onSnap);
      track.removeEventListener("scrollsnapchange", onSnap);
      track.removeEventListener("scroll", onScroll);
    };
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(current - 1);
    }
  };

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

      <dialog ref={dialogRef} className="hall-lightbox" aria-label={caption} onKeyDown={onKey} {...{ closedby: "any" }}>
        <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
          <p className="truncate font-semibold text-neutral-200">{caption}</p>
          <div className="flex shrink-0 items-center gap-3">
            {photos.length > 1 && (
              <span className="font-mono text-neutral-400" aria-live="polite">
                {t("photoCounter", { n: current + 1, total: photos.length })}
              </span>
            )}
            <form method="dialog">
              <button className="hall-lb-btn" aria-label={t("photoClose")} autoFocus>
                ✕
              </button>
            </form>
          </div>
        </div>
        <div ref={trackRef} className="hall-track" tabIndex={0} role="region" aria-label={caption}>
          {photos.map((src, i) => (
            <figure key={src} className="hall-slide">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={i === 0 ? alt : `${alt} · ${i + 1}`} loading="lazy" />
            </figure>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" className="hall-lb-btn hall-lb-prev" onClick={() => go(current - 1)} disabled={current === 0} aria-label={t("photoPrev")}>
              ‹
            </button>
            <button type="button" className="hall-lb-btn hall-lb-next" onClick={() => go(current + 1)} disabled={current === photos.length - 1} aria-label={t("photoNext")}>
              ›
            </button>
            <div className="flex justify-center gap-2 px-4 pb-4 pt-3">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => go(i)}
                  className="hall-thumb"
                  aria-current={i === current ? "true" : undefined}
                  aria-label={t("photoCounter", { n: i + 1, total: photos.length })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
