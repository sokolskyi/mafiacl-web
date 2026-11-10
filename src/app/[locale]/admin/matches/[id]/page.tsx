import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MatchApp } from "@/components/match/MatchApp";
import { getStaffContext } from "@/lib/admin/queries";
import { getMatch, getNicknames } from "@/lib/match/queries";

export const metadata: Metadata = { title: "Game", robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string; id: string }> };

export default function Page({ params }: Props) {
  return (
    <main className="px-4 py-4">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} />
      </Suspense>
    </main>
  );
}

async function Inner({ params }: Pick<Props, "params">) {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  setRequestLocale(locale);
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n < 1) notFound();

  const ctx = await getStaffContext();
  if (!ctx) return <p className="mt-10"><Link href="/account" className="text-red-400 underline">→</Link></p>;
  const match = await getMatch(n);
  if (!match || !ctx.clubs.some((c) => c.id === match.clubId)) notFound();
  const nicknames = await getNicknames();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const overlayUrl = `${proto}://${host}/stream/${match.clubSlug}/${match.tableNo}`;
  const backHref = match.gameId
    ? getPathname({ href: { pathname: "/admin/games/[id]", params: { id: String(match.gameId) } }, locale })
    : getPathname({ href: "/admin", locale });

  return (
    <MatchApp
      key={`${match.id}-${match.version}`}
      id={match.id}
      number={match.number}
      tableNo={match.tableNo}
      status={match.status}
      initialVersion={match.version}
      initialLog={match.log}
      initialSeats={match.seats}
      initialShowRoles={match.showRoles}
      initialRated={match.rated}
      initialAdjustments={match.adjustments}
      nicknames={nicknames}
      overlayUrl={overlayUrl}
      backHref={backHref}
    />
  );
}
