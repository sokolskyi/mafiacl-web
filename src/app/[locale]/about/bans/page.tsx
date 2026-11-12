import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getPublicBans } from "@/lib/bans";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";

export async function generateMetadata({ params }: PageProps<"/[locale]/about/bans">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "aboutBans", href: "/about/bans" });
}

export default async function Page({ params }: PageProps<"/[locale]/about/bans">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.bans" });
  const bans = await getPublicBans(MAIN_CLUB_SLUG);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="bans" />
      <AboutHeader title={t("title")} lead={t("lead")} />
      <p className="mt-4 max-w-3xl text-neutral-400">
        {t("codeNote")}{" "}
        <Link href="/about/code" className="underline underline-offset-4 hover:text-white">{t("codeLink")}</Link>
      </p>
      {bans.length === 0 ? (
        <p className="mt-10 text-lg text-neutral-400">{t("empty")}</p>
      ) : (
        <ul className="mt-10 max-w-xl divide-y divide-white/10 rounded border border-white/15">
          {bans.map((b) => (
            <li key={b.nickname} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <span className="text-lg font-semibold">{b.nickname}</span>
              <span className="text-sm text-neutral-400">{t("since", { date: date.format(new Date(b.since)) })}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
