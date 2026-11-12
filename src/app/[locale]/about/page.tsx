import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { ABOUT_PAGES, AboutHeader } from "@/components/about/AboutNav";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "about", href: "/about" });
}

export default async function Page({ params }: PageProps<"/[locale]/about">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutHeader title={t("title")} lead={t("lead")} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ABOUT_PAGES.map((p) => (
          <li key={p.key}>
            <Link href={p.href} className="block h-full rounded-lg border border-white/15 bg-neutral-950/60 p-6 hover:border-red-500/70">
              <p className="font-display text-2xl font-extrabold uppercase">{t(`tabs.${p.key}`)}</p>
              <p className="mt-2 text-neutral-300">{t(`cards.${p.key}`)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
