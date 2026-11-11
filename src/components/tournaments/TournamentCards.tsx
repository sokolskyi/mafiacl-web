import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Tournament } from "@/lib/tournaments";

export function tournamentDates(t: Tournament, locale: Locale) {
  const f = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const start = new Date(`${t.startsOn}T00:00:00Z`);
  if (!t.endsOn || t.endsOn === t.startsOn) return f.format(start);
  return f.formatRange(start, new Date(`${t.endsOn}T00:00:00Z`));
}

/** Карточки турниров: обложка, даты, город, свой/чужой турнир. */
export async function TournamentCards({ items, locale }: { items: Tournament[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "tournaments" });
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((x) => (
        <li key={x.id} className="relative flex flex-col overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 focus-within:outline focus-within:outline-2 focus-within:outline-white">
          {x.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.coverUrl} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden="true" className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-red-800 to-neutral-950 font-display text-5xl font-extrabold uppercase text-white/80">
              {x.series === "kings" ? "Kings" : "MafiaCL"}
            </span>
          )}
          <div className="flex flex-1 flex-col p-5">
            <p className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
              <span className="rounded bg-white/10 px-2 py-0.5">{t(`series.${x.series}`)}</span>
              {x.organizer ? <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-200">{t("weTakePart")}</span> : <span className="rounded bg-red-500/25 px-2 py-0.5 text-red-200">{t("ours")}</span>}
              {x.status === "cancelled" && <span className="rounded bg-neutral-700 px-2 py-0.5">{t("status.cancelled")}</span>}
            </p>
            <h3 className="mt-3 text-xl font-bold">
              <Link href={{ pathname: "/tournaments/[slug]", params: { slug: x.slug } }} className="after:absolute after:inset-0 hover:underline">
                {x.name}
              </Link>
            </h3>
            <p className="mt-1 text-neutral-300">{tournamentDates(x, locale)}</p>
            {(x.city || x.venueName) && <p className="mt-1 text-sm text-neutral-400">📍 {[x.venueName, x.city].filter(Boolean).join(", ")}</p>}
            {x.winners[0] && <p className="mt-auto pt-3 text-sm font-semibold">🥇 {x.winners[0]}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
