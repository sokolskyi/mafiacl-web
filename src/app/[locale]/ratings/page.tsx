import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { RatingTable } from "@/components/rating/RatingTable";

export async function generateMetadata({ params }: PageProps<"/[locale]/ratings">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "ratings", href: "/ratings" });
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/ratings">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "pages" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("ratings.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-300">{t("ratings.description")}</p>
      <Suspense fallback={<p className="mt-10 text-neutral-500">…</p>}>
        <Filtered locale={locale} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Filtered({ locale, searchParams }: { locale: Locale; searchParams: PageProps<"/[locale]/ratings">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const season = Number(one(sp.season));
  const rating = Number(one(sp.rating));
  return (
    <RatingTable
      locale={locale}
      season={Number.isInteger(season) && season > 0 ? season : null}
      rating={Number.isInteger(rating) && rating > 0 ? rating : null}
    />
  );
}
