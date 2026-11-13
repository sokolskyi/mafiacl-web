import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { AdminRespect } from "@/components/admin/AdminRespect";

type Props = PageProps<"/[locale]/admin/respect">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "adminRespect" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "adminRespect" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 print:py-0">
      <h1 className="text-4xl font-black tracking-tight print:hidden">{t("title")}</h1>
      <Suspense fallback={<p className="mt-10 text-neutral-500">…</p>}>
        <Inner searchParams={searchParams} locale={locale} />
      </Suspense>
    </main>
  );
}

async function Inner({ searchParams, locale }: { searchParams: Props["searchParams"]; locale: Locale }) {
  const sp = await searchParams;
  return (
    <AdminRespect
      locale={locale}
      flags={{
        saved: sp.saved === "1",
        error: typeof sp.error === "string" ? sp.error : undefined,
        batch: typeof sp.batch === "string" ? sp.batch.slice(0, 60) : undefined,
      }}
    />
  );
}
