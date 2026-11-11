import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { AdminShop } from "@/components/admin/AdminShop";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/shop">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "adminShop" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/admin/shop">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "adminShop" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-black tracking-tight">{t("title")}</h1>
      <Suspense fallback={<p className="mt-10 text-neutral-500">…</p>}>
        <Inner searchParams={searchParams} locale={locale} />
      </Suspense>
    </main>
  );
}

async function Inner({ searchParams, locale }: { searchParams: PageProps<"/[locale]/admin/shop">["searchParams"]; locale: Locale }) {
  const sp = await searchParams;
  return <AdminShop locale={locale} saved={sp.saved === "1"} orderPaid={sp.orderPaid === "1"} error={typeof sp.error === "string" ? sp.error : undefined} />;
}
