import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getArchiveSeasons } from "@/lib/ratingArchive";
import { MAIN_CLUB_SLUG } from "@/lib/site";

/** Карточки сезонов Premier League в Праге (архив рейтингов). */
export async function ArchiveSeasons({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "ratingArchive" });
  const seasons = await getArchiveSeasons(MAIN_CLUB_SLUG);
  if (seasons.length === 0) return null;
  return (
    <section className="mt-16" aria-labelledby="archive-seasons">
      <h2 id="archive-seasons" className="font-display text-3xl font-extrabold uppercase sm:text-4xl">{t("listTitle")}</h2>
      <p className="mt-2 max-w-3xl text-neutral-300">{t("listLead")}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seasons.map((s) => (
          <li key={s.id} className="relative rounded-lg border border-white/15 bg-neutral-950/60 p-5 focus-within:outline focus-within:outline-2 focus-within:outline-white">
            <p className="flex items-center gap-2 text-sm text-neutral-400">
              {s.year}
              {s.isCurrent && <span className="rounded bg-red-500/25 px-1.5 text-xs font-semibold uppercase text-red-200">{t("current")}</span>}
            </p>
            <h3 className="mt-1 text-2xl font-bold">
              <Link href={{ pathname: "/ratings/prague/[slug]", params: { slug: s.slug } }} className="after:absolute after:inset-0 hover:underline">
                {s.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-neutral-400">{t("gamesCount", { count: s.games })}</p>
            {s.leaders.length > 0 && (
              <ol className="mt-3 space-y-0.5 text-sm">
                {s.leaders.map((n, i) => (
                  <li key={n}>
                    <span aria-hidden="true">{["🥇", "🥈", "🥉"][i]}</span> <span className="font-semibold">{n}</span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
