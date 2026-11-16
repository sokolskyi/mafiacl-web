import { Suspense } from "react";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { ArchiveSeasonView, archiveSeasonMetadata } from "@/components/rating/ArchiveSeasonView";

type Props = PageProps<"/[locale]/ratings/prague/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  return archiveSeasonMetadata(locale, "prague", slug);
}

export default function Page({ params }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} />
      </Suspense>
    </main>
  );
}

async function Inner({ params }: Pick<Props, "params">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  return <ArchiveSeasonView locale={locale} city="prague" slug={slug} />;
}
