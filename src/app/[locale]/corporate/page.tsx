import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getHosts } from "@/lib/hosts";
import { HostCards } from "@/components/HostCards";
import { CorporateForm } from "@/components/corporate/CorporateForm";
import { Testimonials } from "@/components/corporate/Testimonials";
import { getTestimonials } from "@/lib/testimonials";

export async function generateMetadata({ params }: PageProps<"/[locale]/corporate">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "corporate", href: "/corporate" });
}

const WHY = ["0", "1", "2", "3"] as const;
const FORMATS = ["teambuilding", "party", "birthday", "office", "club"] as const;
const INCLUDED = ["0", "1", "2", "3", "5"] as const;
const STEPS = ["0", "1", "2", "3"] as const;
const FAQ = ["0", "1", "2", "3", "4", "5"] as const;

export default async function Page({ params }: PageProps<"/[locale]/corporate">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "corporate" });
  const p = await getTranslations({ locale, namespace: "pages" });
  const [hosts, reviews] = await Promise.all([getHosts(MAIN_CLUB_SLUG), getTestimonials(MAIN_CLUB_SLUG)]);
  const h2 = "font-display text-4xl font-extrabold uppercase sm:text-5xl";

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <section>
        <h1 className="text-5xl sm:text-7xl">{p("corporate.title")}</h1>
        <p className="mt-6 max-w-2xl text-xl text-neutral-200">{t("lead")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#request" className="inline-flex min-h-12 items-center rounded-full bg-red-600 px-7 font-bold text-white hover:bg-red-500">
            {t("ctaRequest")}
          </a>
          <a href="#hosts" className="inline-flex min-h-12 items-center rounded-full border border-white/55 px-7 font-bold hover:bg-white/10">
            {t("ctaHosts")}
          </a>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="why">
        <h2 id="why" className={h2}>{t("whyTitle")}</h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((k) => (
            <li key={k} className="rounded-lg border border-white/15 bg-neutral-950/50 p-5">
              <h3 className="text-lg font-bold">{t(`why.${k}.title`)}</h3>
              <p className="mt-2 text-sm text-neutral-300">{t(`why.${k}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20" aria-labelledby="formats">
        <h2 id="formats" className={h2}>{t("formatsTitle")}</h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map((k) => (
            <li key={k} className="rounded-lg border border-white/15 bg-neutral-950/50 p-6">
              <h3 className="text-xl font-bold">{t(`formats.${k}.title`)}</h3>
              <p className="mt-2 text-neutral-300">{t(`formats.${k}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 rounded-2xl border border-white/15 bg-neutral-950/50 p-6 sm:p-10" aria-labelledby="geo">
        <h2 id="geo" className={h2}>
          <span aria-hidden="true" className="mr-3">🌍</span>
          {t("geoTitle")}
        </h2>
        <p className="mt-4 max-w-3xl text-lg text-neutral-200">{t("geo")}</p>
      </section>

      <section className="mt-20 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className={h2}>{t("includedTitle")}</h2>
          <ul className="mt-8 space-y-3">
            {INCLUDED.map((k) => (
              <li key={k} className="flex gap-3 text-lg">
                <span aria-hidden="true" className="text-red-400">✦</span>
                <span>{t(`included.${k}`)}</span>
              </li>
            ))}
          </ul>
          <h2 className={`${h2} mt-14`}>{t("priceTitle")}</h2>
          <p className="mt-4 max-w-prose text-lg text-neutral-300">{t("price")}</p>
        </div>
        <div>
          <h2 className={h2}>{t("stepsTitle")}</h2>
          <ol className="mt-8 space-y-6">
            {STEPS.map((k, i) => (
              <li key={k} className="flex gap-4">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white font-display text-2xl font-extrabold text-black">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{t(`steps.${k}.title`)}</h3>
                  <p className="text-neutral-300">{t(`steps.${k}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {reviews.length > 0 && (
        <section id="reviews" className="mt-20 scroll-mt-24" aria-labelledby="reviews-title">
          <h2 id="reviews-title" className={h2}>{t("reviewsTitle")}</h2>
          <Testimonials items={reviews} locale={locale} />
        </section>
      )}

      <section id="hosts" className="mt-20 scroll-mt-24" aria-labelledby="hosts-title">
        <h2 id="hosts-title" className={h2}>{t("hostsTitle")}</h2>
        <p className="mt-3 text-neutral-300">{t("hostsLead")}</p>
        <HostCards hosts={hosts} locale={locale} />
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
          <CorporateForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
