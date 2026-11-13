import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { RulesDoc } from "@/components/documents/RulesDoc";

const SOURCE = "https://rd.emotion.games/pravila-igry?lang=ru";
const MORE = [
  { key: "documents", href: "https://emotion.games/ru/documents" },
  { key: "tournaments", href: "https://rd.emotion.games/reglament-provedeniya-turnirov/" },
  { key: "comments", href: "https://rd.emotion.games/kommentarii-k-pravilam/" },
  { key: "ci", href: "https://rd.emotion.games/kompensaciya-ci/" },
  { key: "online", href: "https://rd.emotion.games/dopolneniya-k-pravilam-dlya-onlain-mafii/" },
] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/documents/emotion-games-rules">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "emotionRules", href: "/documents/emotion-games-rules" });
}

/** Официальные правила Emotion Games — краткое изложение по разделам со ссылкой на официальный текст. */
export default async function Page({ params }: PageProps<"/[locale]/documents/emotion-games-rules">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <RulesDoc locale={locale} namespace="rulesEmotion" source={SOURCE} more={MORE} />;
}
