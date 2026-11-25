import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ArchiveIndex } from "@/components/tournaments/ArchiveViews";

export async function generateMetadata({ params }: PageProps<"/[locale]/tournaments/archive">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "tournaments" });
  return { title: t("archive.title"), description: t("archive.lead") };
}

export default async function Page({ params }: PageProps<"/[locale]/tournaments/archive">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <ArchiveIndex locale={locale} />
    </main>
  );
}
