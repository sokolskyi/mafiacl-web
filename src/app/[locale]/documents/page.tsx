import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/documents">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "documents", href: "/documents" });
}

export default async function Page({ params }: PageProps<"/[locale]/documents">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "documents" });
  const p = await getTranslations({ locale, namespace: "pages" });
  const cards = [
    { href: "/documents/mafgame-rules" as const, title: p("mafgameRules.title"), text: t("rulesText"), source: "mafgame.org" },
    { href: "/documents/emotion-games-rules" as const, title: p("emotionRules.title"), text: t("emotionText"), source: "emotion.games" },
    { href: "/about/code" as const, title: t("codeTitle"), text: t("codeText") },
    { href: "/learn" as const, title: t("learnTitle"), text: t("learnText") },
  ];
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{p("documents.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-300">{t("lead")}</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href} className="relative rounded-lg border border-white/15 bg-neutral-950/60 p-5 focus-within:outline focus-within:outline-2 focus-within:outline-white">
            <h2 className="text-xl font-bold">
              <Link href={c.href} className="after:absolute after:inset-0 hover:underline">{c.title}</Link>
            </h2>
            <p className="mt-2 text-neutral-300">{c.text}</p>
            {c.source && <p className="mt-3 text-sm text-neutral-500">{t("source", { source: c.source })}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
