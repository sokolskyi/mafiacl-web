import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { topWinners, type HallEntry } from "@/lib/hallArchive";
import { getKnownPlayers } from "@/lib/playerNames";
import { playerLinks } from "@/components/players/PlayerNameLink";
import { VideoLink } from "./VideoLink";
import { HallPhotos } from "./hall/HallPhotos";

const MEDAL = ["🥇", "🥈", "🥉"];

/** Архив клуба по годам: финалы сезонов, турниры, мини-турниры, достижения. */
export async function HallArchive({ entries, locale }: { entries: HallEntry[]; locale: Locale }) {
  const known = await getKnownPlayers();
  if (entries.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "hall" });
  const years = [...new Set(entries.map((e) => e.year))].sort((a, b) => b - a);
  const top = topWinners(entries);
  // Карточки сезонов чередуют сторону фото по всему архиву, а не внутри года.
  const flip = new Map(years.flatMap((y) => entries.filter((e) => e.year === y && e.category === "season")).map((e, i) => [e.id, i % 2 === 1]));
  const h3 = "mt-6 text-sm font-semibold uppercase tracking-widest text-neutral-400";

  return (
    <section aria-labelledby="archive" className="mt-16">
      <h2 id="archive" className="font-display text-3xl font-extrabold uppercase">{t("archiveTitle")}</h2>
      <p className="mt-2 max-w-3xl text-neutral-300">{t("archiveLead")}</p>

      <div className="mt-8 rounded-lg border border-red-500/40 bg-neutral-950/60 p-6">
        <h3 className="font-display text-2xl font-extrabold uppercase">{t("topTitle")}</h3>
        {/* Столбцами: 1, 2, 3… сверху вниз в первой колонке, дальше — во второй. */}
        <ol className="mt-4 gap-x-8 sm:columns-2">
          {top.map((r, i) => (
            <li key={r.name} className="mb-2 flex break-inside-avoid items-baseline gap-3">
              <span className="w-6 text-right font-mono text-neutral-400">{i + 1}</span>
              <span className="font-semibold">
                {playerLinks(r.name, known)}
                {r.seasons > 0 && (
                  <span className="ml-1" role="img" aria-label={t("seasonStars", { count: r.seasons })} title={t("seasonStars", { count: r.seasons })}>
                    {"⭐".repeat(r.seasons)}
                  </span>
                )}
              </span>
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
                <div className="mt-4 space-y-8">
                  {seasons.map((e) => {
                    const name = e.season ? t("seasonTitle", { n: e.season }) : e.title;
                    const league = e.title.includes("·") ? e.title.split("·").slice(1).join("·").trim() : null;
                    return (
                      <article
                        key={e.id}
                        className={`hall-season ${e.photos.length ? "has-photos" : ""} ${flip.get(e.id) ? "is-flipped" : ""}`}
                        aria-labelledby={`hs${e.id}`}
                      >
                        {e.photos.length > 0 && (
                          <HallPhotos photos={e.photos} alt={`${name} · ${e.places[0] ?? ""}`} caption={`${name} · ${e.city} ${e.year}`} />
                        )}
                        <div className="hall-text">
                          {e.season && (
                            <span className="hall-numeral" aria-hidden="true">
                              {e.season}
                            </span>
                          )}
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">
                            {e.city} · {e.year}
                            {league ? ` · ${league}` : ""}
                          </p>
                          <h4 id={`hs${e.id}`} className="mt-1 font-display text-3xl font-extrabold uppercase">{name}</h4>
                          {e.places.length > 0 ? (
                            <>
                              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">👑 {t("championShort")}</p>
                              <p className="hall-champion">{playerLinks(e.places[0], known)}</p>
                              {e.places.length > 1 && (
                                <ol className="mt-4 flex flex-wrap gap-2">
                                  {e.places.slice(1).map((p, i) => (
                                    <li key={i} className="hall-place">
                                      <span aria-hidden="true">{MEDAL[i + 1]}</span>
                                      <span className="sr-only">{i + 2}.</span> {playerLinks(p, known)}
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </>
                          ) : (
                            <p className="mt-4 text-lg text-neutral-300">{t("noFinal")}</p>
                          )}
                          {e.note && (
                            <ul className="mt-5 flex flex-wrap gap-1.5">
                              {noteChips(e.note).map((c, i) => (
                                <li key={i} className="hall-chip">{c}</li>
                              ))}
                            </ul>
                          )}
                          <VideoLink url={e.videoUrl} videos={e.videos} locale={locale} className="mt-4" />
                        </div>
                      </article>
                    );
                  })}
                </div>
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
                          <span key={i} className="mr-4 inline-block">{MEDAL[i]} {playerLinks(p, known)}</span>
                        ))}
                      </p>
                      {e.note && <p className="mt-1 text-sm text-neutral-400">{e.note}</p>}
                      <VideoLink url={e.videoUrl} videos={e.videos} locale={locale} />
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
                      <span className="font-semibold">{playerLinks(e.places[0] ?? "", known)}</span> — {e.title}
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
                        <span className="font-mono text-neutral-400">{m.title}</span> {playerLinks(m.places[0] ?? "", known)}
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

/** Пояснение к сезону «финал 16.12.2025, 303 рейтинговые игры; MVP — Рауль» → отдельные плашки. */
function noteChips(note: string): string[] {
  const [head, ...tail] = note.split(/;\s*/);
  return [...head.split(/,\s*/), ...tail].map((x) => x.trim()).filter(Boolean);
}
