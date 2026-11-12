import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "faq", href: "/faq" });
}

const GROUPS = [
  { key: "start", items: ["rules", "alone", "players", "duration", "age"] },
  { key: "games", items: ["when", "signup", "price", "season", "language"] },
  { key: "other", items: ["corporate", "kids", "contact"] },
] as const;

export default async function Page({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });
  const p = await getTranslations({ locale, namespace: "pages" });

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-5xl sm:text-7xl">{p("faq.title")}</h1>
      <p className="mt-6 max-w-2xl text-xl text-neutral-200">{t("lead")}</p>

      {GROUPS.map((g) => (
        <section key={g.key} className="mt-14" aria-labelledby={`faq-${g.key}`}>
          <h2 id={`faq-${g.key}`} className="font-display text-3xl font-extrabold uppercase sm:text-4xl">{t(`groups.${g.key}`)}</h2>
          <div className="mt-6 divide-y divide-white/15 border-y border-white/15">
            {g.items.map((k) => (
              <details key={k} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-lg font-bold">
                  {t(`items.${k}.q`)}
                  <span aria-hidden="true" className="text-2xl transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-prose text-neutral-300">{t(`items.${k}.a`)}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-16 rounded-2xl border border-white/15 bg-neutral-950/70 p-6 sm:p-8">
        <p className="text-lg text-neutral-200">{t("still")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/learn" className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 font-bold hover:bg-white/10">{t("toLearn")}</Link>
          <Link href="/play" className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 font-bold hover:bg-white/10">{t("toPlay")}</Link>
          <a href="https://t.me/Yes1911" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-5 font-bold text-white hover:bg-red-500">{t("ask")} ↗</a>
        </div>
      </section>
    </main>
  );
}
