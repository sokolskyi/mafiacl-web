import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { topWinners, type HallEntry } from "@/lib/hallArchive";

const MEDAL = ["🥇", "🥈", "🥉"];

/** Архив клуба по годам: финалы сезонов, турниры, мини-турниры, достижения. */
export async function HallArchive({ entries, locale }: { entries: HallEntry[]; locale: Locale }) {
  if (entries.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "hall" });
  const years = [...new Set(entries.map((e) => e.year))].sort((a, b) => b - a);
  const top = topWinners(entries);
  const h3 = "mt-6 text-sm font-semibold uppercase tracking-widest text-neutral-400";

  return (
    <section aria-labelledby="archive" className="mt-16">
      <h2 id="archive" className="font-display text-3xl font-extrabold uppercase">{t("archiveTitle")}</h2>
      <p className="mt-2 max-w-3xl text-neutral-300">{t("archiveLead")}</p>

      <div className="mt-8 rounded-lg border border-red-500/40 bg-neutral-950/60 p-6">
        <h3 className="font-display text-2xl font-extrabold uppercase">{t("topTitle")}</h3>
        <ol className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {top.map((r, i) => (
            <li key={r.name} className="flex items-baseline gap-3">
              <span className="w-6 text-right font-mono text-neutral-400">{i + 1}</span>
              <span className="font-semibold">{r.name}</span>
              <span className="text-sm text-neutral-400">{t("topLine", { seasons: r.seasons, tournaments: r.tournaments, minis: r.minis })}</span>
            </li>
          ))}
        </ol>
      </div>

      <nav aria-label={t("yearsNav")} className="mt-8 flex flex-wrap gap-2">
        {years.map((y) => (
          <a key={y} href={`#y${y}`} className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-sm font-semibold hover:border-white/50">
            {y}
          </a>
        ))}
      </nav>

      {years.map((y) => {
        const list = entries.filter((e) => e.year === y);
        const seasons = list.filter((e) => e.category === "season");
        const tournaments = list.filter((e) => e.category === "tournament");
        const achievements = list.filter((e) => e.category === "achievement");
        const minis = list.filter((e) => e.category === "mini");
        const miniSeasons = [...new Set(minis.map((m) => m.season ?? ""))];
        return (
          <section key={y} id={`y${y}`} aria-labelledby={`yh${y}`} className="mt-12 scroll-mt-24 border-t border-white/10 pt-8">
            <h3 id={`yh${y}`} className="font-display text-4xl font-extrabold text-red-400">
              {y} <span className="text-base font-normal uppercase tracking-widest text-neutral-400">· {[...new Set(list.map((e) => e.city))].join(" · ")}</span>
            </h3>

            {seasons.length > 0 && (
              <>
                <p className={h3}>{t("catSeason")}</p>
                <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                  {seasons.map((e) => (
                    <li key={e.id} className="overflow-hidden rounded-lg border border-amber-400/40 bg-neutral-950/60">
                      {e.photos.length > 0 && <Photos photos={e.photos} alt={`${t("seasonTitle", { n: e.season ?? "" })} · ${e.places[0] ?? ""}`} />}
                      <div className="p-5">
                      <p className="font-display text-2xl font-extrabold uppercase">{t("seasonTitle", { n: e.season ?? "" })}</p>
                      <ol className="mt-2 space-y-1">
                        {e.places.map((p, i) => (
                          <li key={i} className={i === 0 ? "text-lg font-bold" : "text-neutral-200"}>{MEDAL[i]} {p}</li>
                        ))}
                      </ol>
                      {e.note && <p className="mt-2 text-sm text-neutral-400">{e.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tournaments.length > 0 && (
              <>
                <p className={h3}>{t("catTournament")}</p>
                <ul className="mt-3 divide-y divide-white/10 rounded border border-white/15">
                  {tournaments.map((e) => (
                    <li key={e.id} className="px-4 py-3">
                      <p className="font-semibold">{e.title}</p>
                      <p className="mt-1 text-neutral-200">
                        {e.places.map((p, i) => (
                          <span key={i} className="mr-4 inline-block">{MEDAL[i]} {p}</span>
                        ))}
                      </p>
                      {e.note && <p className="mt-1 text-sm text-neutral-400">{e.note}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {achievements.length > 0 && (
              <>
                <p className={h3}>{t("catAchievement")}</p>
                <ul className="mt-3 space-y-1">
                  {achievements.map((e) => (
                    <li key={e.id}>
                      <span className="font-semibold">{e.places[0]}</span> — {e.title}
                      {e.note && <span className="text-neutral-400"> ({e.note})</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {miniSeasons.map((s) => (
              <div key={s}>
                <p className={h3}>{t("catMini", { n: s })}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {minis
                    .filter((m) => (m.season ?? "") === s)
                    .map((m) => (
                      <li key={m.id} className="rounded border border-white/15 px-3 py-1 text-sm">
                        <span className="font-mono text-neutral-400">{m.title}</span> {m.places[0]}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
      <p className="mt-10 text-sm text-neutral-500">{t("archiveSource")}</p>
    </section>
  );
}

/** Фото к записи архива: первое крупно, остальные — миниатюры; клик открывает оригинал. */
function Photos({ photos, alt }: { photos: string[]; alt: string }) {
  const [first, ...rest] = photos;
  return (
    <div>
      <a href={first} target="_blank" rel="noopener" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={first} alt={alt} loading="lazy" className="aspect-[3/2] w-full object-cover object-[50%_25%]" />
      </a>
      {rest.length > 0 && (
        <div className="flex gap-1 bg-black/40 p-1">
          {rest.map((src, i) => (
            <a key={src} href={src} target="_blank" rel="noopener" className="block flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt} · ${i + 2}`} loading="lazy" className="aspect-[3/2] w-full object-cover object-[50%_25%]" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
