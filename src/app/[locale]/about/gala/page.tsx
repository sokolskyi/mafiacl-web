import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";
import { GALA_NIGHTS, GALA_NOMINATIONS } from "@/lib/gala";

export async function generateMetadata({ params }: PageProps<"/[locale]/about/gala">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "aboutGala", href: "/about/gala" });
}

export default async function Page({ params }: PageProps<"/[locale]/about/gala">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.gala" });
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
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-widest text-neutral-400">{t("nominationsTitle")}</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GALA_NOMINATIONS.filter((n) => g.winners[n]).map((n) => (
              <li key={n} className="rounded-lg border border-white/15 bg-neutral-950/60 p-4">
                <p className="text-sm text-neutral-400">{t(`nominations.${n}`)}</p>
                <p className="mt-1 text-xl font-bold">🏆 {g.winners[n]}</p>
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
