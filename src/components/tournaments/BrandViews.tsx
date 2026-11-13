import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/tournaments";
import { BRANDS, editionsOf, isActiveBrand, isUpcoming, regionOf, type Brand, type Edition } from "@/lib/tournamentBrands";
import type { Tournament } from "@/lib/tournaments";
import type { HallEntry } from "@/lib/hallArchive";
import { tournamentDates } from "./TournamentCards";
import { VideoLink } from "@/components/VideoLink";

const MEDALS = ["🥇", "🥈", "🥉"];

function EditionLink({ e, children, className }: { e: Edition; children: React.ReactNode; className?: string }) {
  const t = e.tournament;
  if (!t) return <span className={className}>{children}</span>;
  if (t.infoUrl?.startsWith("/")) {
    return (
       
      <a href={t.infoUrl} className={`${className ?? ""} hover:underline`}>{children}</a>
    );
  }
  return (
    <Link href={{ pathname: "/tournaments/[slug]", params: { slug: t.slug } }} className={`${className ?? ""} hover:underline`}>
      {children}
    </Link>
  );
}

function RegionBadge({ e, show }: { e: Edition; show: boolean }) {
  const r = show ? regionOf(e) : null;
  if (!r) return null;
  return (
    <span className={`ml-1.5 inline-block rounded px-1.5 py-px align-middle text-[10px] font-bold leading-4 ${r === "EU" ? "bg-blue-500/25 text-blue-200" : "bg-yellow-400/20 text-yellow-200"}`}>
      {r}
    </span>
  );
}

/** Карточки турниров клуба «без года» для страницы «Турниры». */
export async function BrandGrid({ tournaments, hall, locale }: { tournaments: Tournament[]; hall: HallEntry[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const rows = BRANDS.map((b) => ({ b, eds: editionsOf(b, tournaments, hall) })).filter((r) => r.eds.length > 0);
  const active = rows.filter((r) => isActiveBrand(r.eds)).sort((a, z) => z.eds[0].year - a.eds[0].year);
  const archive = rows.filter((r) => !isActiveBrand(r.eds)).sort((a, z) => z.eds[0].year - a.eds[0].year);

  const card = ({ b, eds }: { b: Brand; eds: Edition[] }) => {
    const next = eds.find(isUpcoming);
    const winners = eds.filter((e) => !isUpcoming(e) && e.places[0]);
    const first = eds[eds.length - 1].year;
    return (
      <li key={b.key} className="relative flex flex-col rounded-lg border border-white/15 bg-neutral-950/60 p-5 focus-within:outline focus-within:outline-2 focus-within:outline-white">
        <h3 className="text-2xl font-bold">
          <Link href={{ pathname: "/tournaments/[slug]", params: { slug: b.slug } }} className="after:absolute after:inset-0 hover:underline">
            {t(`brands.${b.key}.name`)}
          </Link>
        </h3>
        {winners.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-sm">
            {winners.map((e) => (
              <li key={e.key}>
                <span className="text-neutral-400">{e.year}</span> 🥇 <span className="font-semibold">{e.places[0]}</span>
                <RegionBadge e={e} show={b.key === "mcl"} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-neutral-300">{t(`brands.${b.key}.about`)}</p>
        <p className="mt-3 text-sm text-neutral-400">{t("brandStats", { count: eds.length, year: first })}</p>
        <div className="mt-auto pt-3 text-sm">
          {next ? (
            <p className="font-semibold text-red-300">{t("nextOn", { date: tournamentDates(next.tournament!, locale) })}</p>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <>
      <section className="mt-16" aria-labelledby="club-tournaments">
        <h2 id="club-tournaments" className="font-display text-4xl font-extrabold uppercase">{t("clubTournaments")}</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{active.map(card)}</ul>
      </section>
      {archive.length > 0 && (
        <section className="mt-16" aria-labelledby="archive-tournaments">
          <h2 id="archive-tournaments" className="font-display text-4xl font-extrabold uppercase">{t("archiveTitle")}</h2>
          <p className="mt-2 max-w-3xl text-neutral-300">{t("archiveLead")}</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{archive.map(card)}</ul>
        </section>
      )}
    </>
  );
}

/** Страница турнира «без года»: ближайший розыгрыш сверху, ниже все прошлые годы. */
export async function BrandPage({ brand, tournaments, hall, locale }: { brand: Brand; tournaments: Tournament[]; hall: HallEntry[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const eds = editionsOf(brand, tournaments, hall);
  const upcoming = eds.filter(isUpcoming).sort((a, z) => a.tournament!.startsOn.localeCompare(z.tournament!.startsOn));
  const past = eds.filter((e) => !isUpcoming(e));
  const name = t(`brands.${brand.key}.name`);
  const nextYear = (eds[0]?.year ?? 0) + 1;
  const project = "project" in brand ? brand.project : null;

  return (
    <article>
      <p>
        <Link href="/tournaments" className="inline-flex min-h-11 items-center text-sm text-neutral-300 hover:underline">← {t("all")}</Link>
      </p>
      <h1 className="mt-2 text-5xl sm:text-6xl">{name}</h1>
      <p className="mt-4 max-w-3xl text-lg text-neutral-200">{t(`brands.${brand.key}.about`)}</p>
      {project && (
        <p className="mt-4">
          { }
          <a href={project} className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 text-sm font-bold hover:bg-white/10">{t("projectPage")} →</a>
        </p>
      )}

      {upcoming.length > 0
        ? upcoming.map((e) => {
            const x = e.tournament!;
            return (
              <section key={e.key} className="mt-10 rounded-2xl border border-red-500/50 bg-neutral-950/70 p-6 sm:p-8" aria-label={e.title}>
                <p className="text-sm font-semibold uppercase tracking-widest text-red-300">{t(`status.${x.status}`)}</p>
                <h2 className="mt-2 font-display text-4xl font-extrabold uppercase">{e.title}</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-neutral-400">{t("when")}</dt>
                    <dd className="text-lg font-semibold">{tournamentDates(x, locale)}</dd>
                  </div>
                  {(x.venueName || x.city) && (
                    <div>
                      <dt className="text-sm text-neutral-400">{t("where")}</dt>
                      <dd className="text-lg font-semibold">{[x.venueName, x.city].filter(Boolean).join(", ")}</dd>
                    </div>
                  )}
                  {x.prizeFund !== null && (
                    <div>
                      <dt className="text-sm text-neutral-400">{t("prizeFund")}</dt>
                      <dd className="text-lg font-semibold">{formatMoney(locale, x.prizeFund, x.currency)}</dd>
                    </div>
                  )}
                </dl>
                <p className="mt-6">
                  <EditionLink e={e} className="inline-flex min-h-12 items-center rounded-full bg-red-600 px-7 font-bold text-white hover:bg-red-500">
                    {t("detailsAndRegistration")} →
                  </EditionLink>
                </p>
              </section>
            );
          })
        : isActiveBrand(eds) && (
            <section className="mt-10 rounded-2xl border border-white/15 bg-neutral-950/60 p-6 sm:p-8" aria-label={`${name} ${nextYear}`}>
              <h2 className="font-display text-4xl font-extrabold uppercase">{name} {nextYear}</h2>
              <p className="mt-3 text-lg text-neutral-300">{t("notAnnounced")}</p>
            </section>
          )}

      {past.length > 0 && (
        <section className="mt-12" aria-labelledby="previous">
          <h2 id="previous" className="font-display text-3xl font-extrabold uppercase">{t("previousYears")}</h2>
          <ul className="mt-6 divide-y divide-white/10 rounded-lg border border-white/15">
            {past.map((e) => (
              <li key={e.key} className="grid gap-2 px-4 py-4 sm:grid-cols-[5rem_1fr]">
                <span className="font-display text-3xl font-extrabold text-red-400">{e.year}</span>
                <div>
                  <p className="text-lg font-bold">
                    <EditionLink e={e} className={e.tournament ? "underline decoration-white/30 underline-offset-4" : undefined}>{e.title}</EditionLink>
                    <RegionBadge e={e} show={brand.key === "mcl"} />
                    {e.city && <span className="ml-2 text-sm font-normal text-neutral-400">· {e.city}</span>}
                  </p>
                  {e.places.length > 0 && (
                    <p className="mt-1 text-neutral-200">
                      {e.places.slice(0, 3).map((p, i) => (
                        <span key={i} className="mr-4 inline-block">{MEDALS[i]} {p}</span>
                      ))}
                    </p>
                  )}
                  {e.note && <p className="mt-1 text-sm text-neutral-400">{e.note}</p>}
                  <VideoLink url={e.videoUrl} videos={e.videos} locale={locale} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
