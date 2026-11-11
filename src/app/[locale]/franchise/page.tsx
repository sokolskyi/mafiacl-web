import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { FranchiseForm } from "@/components/franchise/FranchiseForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/franchise">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "franchise", href: "/franchise" });
}

const GET = ["0", "1", "2", "3", "4", "5"] as const;
const INCOME = ["0", "1", "2", "3", "4"] as const;
const NEED = ["0", "1", "2", "3"] as const;
const STEPS = ["0", "1", "2", "3", "4"] as const;
const FAQ = ["0", "1", "2", "3", "4"] as const;

export default async function Page({ params }: PageProps<"/[locale]/franchise">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "franchise" });
  const h2 = "font-display text-4xl font-extrabold uppercase sm:text-5xl";

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <section>
        <h1 className="text-5xl sm:text-7xl">{t("kicker")}</h1>
        <p className="mt-6 max-w-2xl text-xl text-neutral-200">{t("lead")}</p>
        <a href="#request" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-red-600 px-7 font-bold text-white hover:bg-red-500">
          {t("cta")}
        </a>
      </section>

      <section className="mt-20" aria-labelledby="get">
        <h2 id="get" className={h2}>{t("getTitle")}</h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GET.map((k) => (
            <li key={k} className="rounded-lg border border-white/15 bg-neutral-950/50 p-6">
              <h3 className="text-xl font-bold">{t(`get.${k}.title`)}</h3>
              <p className="mt-2 text-neutral-300">{t(`get.${k}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className={h2}>{t("incomeTitle")}</h2>
          <ul className="mt-8 space-y-3">
            {INCOME.map((k) => (
              <li key={k} className="flex gap-3 text-lg">
                <span aria-hidden="true" className="text-red-400">✦</span>
                {t(`income.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={h2}>{t("needTitle")}</h2>
          <ul className="mt-8 space-y-3">
            {NEED.map((k) => (
              <li key={k} className="flex gap-3 text-lg">
                <span aria-hidden="true" className="text-red-400">✦</span>
                {t(`need.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="steps">
        <h2 id="steps" className={h2}>{t("stepsTitle")}</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((k, i) => (
            <li key={k} className="rounded-lg border border-white/15 bg-neutral-950/50 p-5">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-display text-2xl font-extrabold text-black">
                {i + 1}
              </span>
              <h3 className="mt-3 font-bold">{t(`steps.${k}.title`)}</h3>
              <p className="mt-1 text-sm text-neutral-300">{t(`steps.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20" aria-labelledby="price">
        <h2 id="price" className={h2}>{t("priceTitle")}</h2>
        <p className="mt-4 max-w-prose text-lg text-neutral-300">{t("price")}</p>
      </section>

      <section className="mt-20" aria-labelledby="faq">
        <h2 id="faq" className={h2}>{t("faqTitle")}</h2>
        <div className="mt-8 divide-y divide-white/15 border-y border-white/15">
          {FAQ.map((k) => (
            <details key={k} className="group py-4">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-lg font-bold">
                {t(`faq.${k}.q`)}
                <span aria-hidden="true" className="text-2xl transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 max-w-prose text-neutral-300">{t(`faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="request" className="relative mt-20 scroll-mt-24 rounded-2xl border border-white/15 bg-neutral-950/70 p-6 sm:p-10" aria-labelledby="request-title">
        <h2 id="request-title" className={h2}>{t("form.title")}</h2>
        <p className="mt-3 text-neutral-300">{t("form.lead")}</p>
        <div className="mt-8">
          <FranchiseForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
