import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";
import { GALA_NIGHTS, GALA_NOMINATIONS } from "@/lib/gala";
import { getKnownPlayers } from "@/lib/playerNames";
import { playerLinks } from "@/components/players/PlayerNameLink";
import { PhotoMosaic } from "@/components/hall/PhotoMosaic";

export async function generateMetadata({ params }: PageProps<"/[locale]/about/gala">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "aboutGala", href: "/about/gala" });
}

export default async function Page({ params }: PageProps<"/[locale]/about/gala">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.gala" });
  const known = await getKnownPlayers();
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const program = t.raw("program") as string[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="gala" />
      <AboutHeader title={t("title")} lead={t("lead")} />

      <section className="mt-10 rounded-2xl border border-amber-400/40 bg-neutral-950/60 p-6 sm:p-8" aria-labelledby="gala-program">
        <h2 id="gala-program" className="font-display text-3xl font-extrabold uppercase">{t("programTitle")}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {program.map((p) => (
            <li key={p} className="flex gap-3 text-lg">
              <span aria-hidden="true" className="text-amber-300">✦</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {GALA_NIGHTS.map((g) => (
        <section key={g.year} className="mt-14 border-t border-white/10 pt-10" aria-labelledby={`gala-${g.year}`}>
          <h2 id={`gala-${g.year}`} className="font-display text-4xl font-extrabold uppercase sm:text-5xl">
            Gala Night <span className="text-amber-300">{g.year}</span>
          </h2>
          <p className="mt-3 text-neutral-300">{date.format(new Date(`${g.date}T12:00:00Z`))}</p>
          {g.photos && g.photos.length > 0 && (
            <div className="mt-6">
              <PhotoMosaic photos={g.photos} alt={`Gala Night ${g.year}`} caption={`Gala Night ${g.year} · ${date.format(new Date(`${g.date}T12:00:00Z`))}`} />
            </div>
          )}
          <h3 className="mt-8 text-sm font-semibold uppercase tracking-widest text-neutral-400">{t("nominationsTitle")}</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GALA_NOMINATIONS.filter((n) => g.winners[n]).map((n) => (
              <li key={n} className="gala-nom">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/70">{t(`nominations.${n}`)}</p>
                <p className="gala-winner">{playerLinks(g.winners[n] ?? "", known)}</p>
                <span className="gala-trophy" aria-hidden="true">🏆</span>
              </li>
            ))}
          </ul>
          {(g.albumUrl || g.postUrl) && (
            <p className="mt-6 flex flex-wrap gap-3">
              {g.albumUrl && (
                <a href={g.albumUrl} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 text-sm font-bold hover:bg-white/10">
                  📸 {t("album")} ↗
                </a>
              )}
              {g.postUrl && (
                <a href={g.postUrl} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-neutral-300 hover:border-white/50">
                  {t("post")} ↗
                </a>
              )}
            </p>
          )}
        </section>
      ))}
    </main>
  );
}
