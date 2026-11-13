import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { RulesDoc } from "@/components/documents/RulesDoc";

const SOURCE = "https://mafgame.org/pages/rules";
const MORE = [
  { key: "tournaments", href: "https://mafgame.org/pages/tournaments_rules" },
  { key: "conduct", href: "https://mafgame.org/pages/code_of_conduct" },
  { key: "points", href: "https://mafgame.org/pages/mafgame_points" },
] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/documents/mafgame-rules">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "mafgameRules", href: "/documents/mafgame-rules" });
}

/** Правила игры федерации Mafgame — краткое изложение по разделам со ссылкой на официальный текст. */
export default async function Page({ params }: PageProps<"/[locale]/documents/mafgame-rules">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <RulesDoc locale={locale} namespace="rules" source={SOURCE} more={MORE} />;
}
