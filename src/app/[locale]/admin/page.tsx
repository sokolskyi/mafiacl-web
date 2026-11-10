import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { AdminHome } from "@/components/admin/AdminHome";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/admin">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-black tracking-tight">{t("title")}</h1>
      <Suspense fallback={<p className="mt-10 text-neutral-500">{t("loading")}</p>}>
        <WithParams searchParams={searchParams} locale={locale} />
      </Suspense>
    </main>
  );
}

async function WithParams({ searchParams, locale }: { searchParams: PageProps<"/[locale]/admin">["searchParams"]; locale: Locale }) {
  const sp = await searchParams;
  return <AdminHome locale={locale} error={typeof sp.error === "string" ? sp.error : undefined} />;
}
