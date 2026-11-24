import { getKnownPlayers } from "@/lib/playerNames";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { getNicknames } from "@/lib/match/queries";
import { FunSheet } from "@/components/match/FunSheet";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "funGame" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function Page({ params }: Props) {
  return (
    <main className="px-4 py-6">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} />
      </Suspense>
    </main>
  );
}

/** Fun-игра: электронный бланк для своей игры — только для вошедших, результат никуда не сохраняется. */
async function Inner({ params }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "funGame" });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const intro = (
    <div className="mx-auto mb-6 max-w-xl">
      <h1 className="text-3xl font-black tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-neutral-300">{t("lead")}</p>
    </div>
  );
  if (!data?.claims.sub) {
    return (
      <>
        {intro}
        <p className="mx-auto max-w-xl">
          <Link href="/account" className="inline-flex rounded-full bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500">{t("signIn")}</Link>
        </p>
      </>
    );
  }
  const [nicknames, known] = await Promise.all([getNicknames(), getKnownPlayers()]);
  const knownNames = [...new Set(Object.values(known))];
  return (
    <>
      {intro}
      <FunSheet nicknames={nicknames} knownNames={knownNames} backHref={getPathname({ href: "/play", locale })} />
    </>
  );
}
