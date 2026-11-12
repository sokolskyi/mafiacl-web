import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getHosts, TEAM_ROLES } from "@/lib/hosts";
import { HostCards } from "@/components/HostCards";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";

export async function generateMetadata({ params }: PageProps<"/[locale]/about/team">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "aboutTeam", href: "/about/team" });
}

export default async function Page({ params }: PageProps<"/[locale]/about/team">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.team" });
  const people = await getHosts(MAIN_CLUB_SLUG);
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="team" />
      <AboutHeader title={t("title")} lead={t("lead")} />
      {TEAM_ROLES.map((role) => {
        const group = people.filter((p) => p.teamRoles.includes(role));
        if (group.length === 0) return null;
        return (
          <section key={role} aria-labelledby={`role-${role}`} className="mt-14">
            <h2 id={`role-${role}`} className="font-display text-3xl font-extrabold uppercase">{t(`roles.${role}`)}</h2>
            <p className="mt-2 max-w-3xl text-neutral-300">{t(`roleText.${role}`)}</p>
            <HostCards hosts={group} locale={locale} showLanguages={role === "host"} />
          </section>
        );
      })}
    </main>
  );
}
