import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { getPlayersDirectory } from "@/lib/playersDirectory";
import { PlayersDirectory } from "@/components/players/PlayersDirectory";

export async function generateMetadata({ params }: PageProps<"/[locale]/players">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "players", href: "/players" });
}

export default async function Page({ params }: PageProps<"/[locale]/players">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const tp = await getTranslations({ locale, namespace: "pages" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{tp("players.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-300">{tp("players.description")}</p>
      <Suspense fallback={<p className="mt-10 text-neutral-500">…</p>}>
        <Directory locale={locale} />
      </Suspense>
    </main>
  );
}

async function Directory({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "playersPage" });
  const d = await getPlayersDirectory();
  const nf = new Intl.NumberFormat(locale);
  const stats: [string, number][] = [
    [t("total"), d.total],
    [t("club"), d.club],
    [t("tournaments"), d.tournaments],
    [t("both"), d.both],
  ];
  return (
    <>
      <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-lg border border-white/15 bg-neutral-950/60 p-5">
            <dt className="text-sm text-neutral-400">{label}</dt>
            <dd className="mt-1 font-display text-4xl font-extrabold">{nf.format(n)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 max-w-3xl text-xs text-neutral-500">{t("note")}</p>
      <PlayersDirectory
        players={d.players}
        locale={locale}
        labels={{
          search: t("search"), sort: t("sort"), alpha: t("alpha"), games: t("byGames"), medals: t("byMedals"), place: t("byPlace"),
          player: t("player"), gamesCol: t("games"), seasons: t("seasons"), bestPlace: t("bestPlace"), medalsCol: t("medals"), minis: t("minis"),
          notRegistered: t("notRegistered"), nothing: t("nothing"), shown: t("shown"),
        }}
      />
    </>
  );
}
