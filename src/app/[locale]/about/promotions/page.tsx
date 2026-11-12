import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getPromotions } from "@/lib/promotions";
import { loc } from "@/lib/shop/queries";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/about/promotions">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "aboutPromotions", href: "/about/promotions" });
}

export default async function Page({ params }: PageProps<"/[locale]/about/promotions">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.promotions" });
  const promos = await getPromotions(MAIN_CLUB_SLUG);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="promotions" />
      <AboutHeader title={t("title")} lead={t("lead")} />
      {promos.length === 0 ? (
        <p className="mt-10 text-lg text-neutral-400">
          {t("empty")}{" "}
          <Link href="/contacts" className="underline underline-offset-4 hover:text-white">{t("emptyLink")}</Link>
        </p>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {promos.map((p) => {
            const body = loc(p.body, locale);
            return (
              <li key={p.id} className="rounded-lg border border-red-500/40 bg-neutral-950/60 p-6">
                <h2 className="font-display text-3xl font-extrabold uppercase">{loc(p.title, locale)}</h2>
                {body && <p className="mt-3 whitespace-pre-line text-lg text-neutral-300">{body}</p>}
                {p.validUntil && <p className="mt-4 text-sm text-neutral-400">{t("until", { date: date.format(new Date(`${p.validUntil}T12:00:00Z`)) })}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
