import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ARCHIVE, getArchiveTournament } from "@/lib/fiimArchive";
import { ArchiveTournamentView } from "@/components/tournaments/ArchiveViews";

type Props = PageProps<"/[locale]/tournaments/archive/[key]">;

export function generateStaticParams() {
  return ARCHIVE.map((x) => ({ key: x.key }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, key } = (await params) as { locale: Locale; key: string };
  const data = await getArchiveTournament(key);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "tournaments" });
  return { title: data.name, description: `${data.name} — ${data.city}, ${data.date.slice(0, 4)}. ${t("archive.results")}.` };
}

export default async function Page({ params }: Props) {
  const { locale, key } = (await params) as { locale: Locale; key: string };
  setRequestLocale(locale);
  const data = await getArchiveTournament(key);
  if (!data) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <ArchiveTournamentView data={data} locale={locale} />
    </main>
  );
}
