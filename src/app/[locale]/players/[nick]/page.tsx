import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { alternatesFor, absoluteUrl } from "@/lib/seo";
import { NOINDEX, SITE_NAME } from "@/lib/site";
import { getPlayer } from "@/lib/players";
import { PlayerProfile } from "@/components/players/PlayerProfile";

type Props = { params: Promise<{ locale: string; nick: string }> };

function decode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, nick } = (await params) as { locale: Locale; nick: string };
  const player = await getPlayer(decode(nick));
  if (!player) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "player" });
  const href = { pathname: "/players/[nick]" as const, params: { nick: player.nickname } };
  const title = t("metaTitle", { nick: player.nickname });
  const description = t("metaDescription", { nick: player.nickname, games: player.stats.games, wins: player.stats.wins });
  return {
    title,
    description,
    alternates: alternatesFor(href, locale),
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteUrl(href, locale),
      images: [
        {
          url: `/api/share/player?${new URLSearchParams({ nick: player.nickname, f: "post", l: locale, v: String(player.stats.games) })}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    // Пока у игрока нет партий, страница пустая — не отдаём её в поиск.
    ...(NOINDEX || player.stats.games === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function Page({ params }: Props) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} />
      </Suspense>
    </main>
  );
}

async function Inner({ params }: Props) {
  const { locale, nick } = (await params) as { locale: Locale; nick: string };
  setRequestLocale(locale);
  const player = await getPlayer(decode(nick));
  if (!player) notFound();
  return <PlayerProfile locale={locale} player={player} />;
}
