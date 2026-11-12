import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";

type Part = { title: string; intro?: string; items: string[] };
type Value = { name: string; text: string };

export async function generateMetadata({ params }: PageProps<"/[locale]/about/code">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "aboutCode", href: "/about/code" });
}

export default async function Page({ params }: PageProps<"/[locale]/about/code">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.code" });
  const values = t.raw("values") as Value[];
  const parts = t.raw("parts") as Part[];
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="code" />
      <AboutHeader title={t("title")} lead={t("lead")} />

      <section aria-labelledby="values" className="mt-12">
        <h2 id="values" className="font-display text-3xl font-extrabold uppercase">{t("valuesTitle")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <li key={v.name} className="rounded-lg border border-white/15 bg-neutral-950/60 p-5">
              <p className="font-display text-2xl font-extrabold uppercase text-red-400">{v.name}</p>
              <p className="mt-2 text-neutral-300">{v.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {parts.map((p, i) => (
        <section key={i} aria-labelledby={`part-${i}`} className="mt-14 max-w-3xl">
          <h2 id={`part-${i}`} className="font-display text-3xl font-extrabold uppercase">{p.title}</h2>
          {p.intro && <p className="mt-3 text-lg text-neutral-300">{p.intro}</p>}
          <ul className="mt-5 space-y-3">
            {p.items.map((it, k) => (
              <li key={k} className="flex gap-3 text-lg">
                <span aria-hidden="true" className="text-red-400">✦</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
