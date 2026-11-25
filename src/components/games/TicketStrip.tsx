"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

export type StripSeries = { id: string; label: string };
export type StripDay = { key: string; weekday: string; day: number; month: string | null; gameId: number | null; series: string | null; tone: "red" | "cream" | null; aria: string };

/**
 * Лента билетов «Играть»: фильтр по серии, полоска дней и сами билеты.
 * Телефон — билеты столбиком (полоска дней ведёт к билету якорем);
 * компьютер — лентой вбок со snap-прокруткой, кнопками «назад/дальше» и полоской дней.
 */
export function TicketStrip({ series, days, children }: { series: StripSeries[]; days: StripDay[]; children: ReactNode }) {
  const t = useTranslations("games");
  const [filter, setFilter] = useState("all");
  const trackRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");

  /** Лента идёт вбок (компьютер)? Тогда листаем саму ленту, а не страницу. */
  const horizontal = () => {
    const el = trackRef.current;
    return !!el && el.scrollWidth > el.clientWidth + 4 && getComputedStyle(el).overflowX !== "visible";
  };
  const step = () => {
    const first = trackRef.current?.querySelector<HTMLElement>("article:not([hidden])");
    return first ? first.offsetWidth + 28 : 480;
  };
  const scrollBy = (dir: 1 | -1) => trackRef.current?.scrollBy({ left: dir * step(), behavior: smooth() });

  function goTo(e: React.MouseEvent<HTMLAnchorElement>, gameId: number) {
    const track = trackRef.current;
    const card = document.getElementById(`game-${gameId}`);
    if (!track || !card || !horizontal()) return; // на телефоне — обычный переход по якорю
    e.preventDefault();
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft - 8, behavior: smooth() });
    card.focus({ preventScroll: true });
  }

  const shown = (s: string | null) => filter === "all" || s === filter;

  return (
    <section aria-label={t("track")} className="mt-8">
      {series.length > 1 && (
        <div role="group" aria-label={t("filterLabel")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {[{ id: "all", label: t("filterAll") }, ...series].map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={filter === s.id}
              onClick={() => setFilter(s.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${filter === s.id ? "bg-white text-neutral-950" : "border border-white/30 hover:bg-white/10"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <nav aria-label={t("days")} className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none]">
        <ol className="flex min-w-max gap-1">
          {days.map((d) => {
            const active = d.gameId !== null && shown(d.series);
            const inner = (
              <>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">{d.weekday}</span>
                <span className="font-display text-lg font-extrabold leading-none">{d.day}</span>
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${active ? (d.tone === "red" ? "bg-red-600" : "bg-white") : "bg-transparent"}`}
                />
              </>
            );
            return (
              <li key={d.key} className={d.month ? "ml-3 first:ml-0" : ""}>
                {d.month && <span className="block h-4 text-[10px] uppercase tracking-wide text-neutral-400">{d.month}</span>}
                {!d.month && <span aria-hidden="true" className="block h-4" />}
                {active ? (
                  <a
                    href={`#game-${d.gameId}`}
                    onClick={(e) => goTo(e, d.gameId!)}
                    aria-label={d.aria}
                    className="flex min-h-14 w-10 flex-col items-center justify-center gap-1 rounded-lg hover:bg-white/10"
                  >
                    {inner}
                  </a>
                ) : (
                  <span className="flex min-h-14 w-10 flex-col items-center justify-center gap-1 text-neutral-700">{inner}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-4 hidden justify-end gap-2 md:flex">
        <button type="button" onClick={() => scrollBy(-1)} aria-label={t("prev")} className="flex size-11 items-center justify-center rounded-full border border-white/30 hover:bg-white/10">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" onClick={() => scrollBy(1)} aria-label={t("next")} className="flex size-11 items-center justify-center rounded-full border border-white/30 hover:bg-white/10">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      {/* Фильтр прячет чужие билеты стилем: сами билеты рендерит сервер (в них формы записи). */}
      {filter !== "all" && <style>{`#tk-${id} > article:not([data-series="${filter.replace(/[^\w-]/g, "")}"]){display:none}`}</style>}
      <div
        id={`tk-${id}`}
        ref={trackRef}
        tabIndex={0}
        aria-label={t("track")}
        className="mt-4 flex flex-col gap-6 md:-mx-2 md:flex-row md:snap-x md:snap-mandatory md:overflow-x-auto md:overscroll-x-contain md:px-2 md:pb-6 md:pt-2 md:[scrollbar-color:var(--color-neutral-800)_transparent]"
      >
        {children}
      </div>
    </section>
  );
}

function smooth(): ScrollBehavior {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches ? "smooth" : "auto";
}
