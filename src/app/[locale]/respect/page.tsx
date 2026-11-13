import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SectionPage } from "@/components/SectionPage";
import { RespectAmount, RespectCoin } from "@/components/respect/RespectAmount";
import { CZK_PER_RESPECT, RESPECT_EARN, RESPECT_MANUAL, RESPECT_SHARE } from "@/lib/respect";
import { redeemRespectCode } from "@/lib/respect-actions";
import { getRespectBalance } from "@/lib/respect-queries";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = PageProps<"/[locale]/respect">;

export async function generateMetadata({ params }: Props) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "respect", href: "/respect" });
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "respect" });
  const h2 = "font-display text-3xl font-extrabold uppercase";
  const row = "flex items-baseline justify-between gap-4 py-2.5";

  const earn: [string, number][] = [
    [t("earn.game"), RESPECT_EARN.game],
    [t("earn.tournament"), RESPECT_EARN.tournament],
    [t("earn.final"), RESPECT_EARN.final],
    [t("earn.firstGame"), RESPECT_EARN.firstGame],
    [t("earn.eveningWin"), RESPECT_EARN.eveningWin],
    [t("earn.bestMove3"), RESPECT_EARN.bestMove3],
    [t("earn.streak", { n: 4 }), RESPECT_EARN.streak4],
    [t("earn.streak", { n: 10 }), RESPECT_EARN.streak10],
    ...RESPECT_EARN.milestones.map((m) => [t("earn.milestone", { n: m.games }), m.bonus] as [string, number]),
    [t("earn.birthday"), RESPECT_EARN.birthday],
    [t("earn.referral"), RESPECT_MANUAL.referral],
    [t("earn.blog"), RESPECT_MANUAL.blog],
  ];

  return (
    <SectionPage locale={locale} pageKey="respect">
      <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-yellow-500/50 bg-yellow-500/10 px-5 py-2 text-lg font-bold text-yellow-200">
        <RespectCoin className="h-6 w-6" /> {t("rate", { czk: CZK_PER_RESPECT })}
      </p>

      <Suspense fallback={null}>
        <Redeem locale={locale} searchParams={searchParams} />
      </Suspense>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="earn">
          <h2 id="earn" className={h2}>{t("earnTitle")}</h2>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {earn.map(([label, n]) => (
              <li key={label} className={row}>
                <span>{label}</span>
                <RespectAmount n={n} sign className="font-bold text-yellow-200" />
              </li>
            ))}
            <li className={row}>
              <span>{t("earn.coin")}</span>
              <span className="text-sm text-neutral-400">{t("earn.coinValue")}</span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-neutral-400">{t("earnNote")}</p>
        </section>

        <section aria-labelledby="spend">
          <h2 id="spend" className={h2}>{t("spendTitle")}</h2>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            <li className={row}>
              <span>{t("spend.evening")}</span>
              <span className="text-right text-sm text-neutral-300">{t("spend.eveningValue")}</span>
            </li>
            <li className={row}>
              <span>{t("spend.merch")}</span>
              <span className="text-right text-sm text-neutral-300">{t("spend.upTo", { pct: RESPECT_SHARE.merch * 100 })}</span>
            </li>
            <li className={row}>
              <span>{t("spend.membership")}</span>
              <span className="text-right text-sm text-neutral-300">{t("spend.upTo", { pct: RESPECT_SHARE.membership * 100 })}</span>
            </li>
          </ul>
          <h3 className="mt-8 text-lg font-bold">{t("rulesTitle")}</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-300">
            {(["verified", "expire", "noCash", "noTransfer", "change"] as const).map((k) => (
              <li key={k}>{t(`rules.${k}`)}</li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-12">
        <Link href="/play" className="inline-flex min-h-12 items-center rounded-full bg-red-600 px-6 font-bold text-white hover:bg-red-500">{t("cta")}</Link>
      </p>
    </SectionPage>
  );
}

/** Баланс и активация кода с монеты — читает сессию и адрес, поэтому внутри Suspense. */
async function Redeem({ locale, searchParams }: { locale: Locale; searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "respect" });
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const code = typeof sp.code === "string" ? sp.code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) : "";
  const redeemed = typeof sp.redeemed === "string" && /^\d{1,5}$/.test(sp.redeemed) ? Number(sp.redeemed) : 0;
  const error = typeof sp.error === "string" && ["used", "notFound", "unverified", "save"].includes(sp.error) ? sp.error : null;
  const balance = userId ? await getRespectBalance(userId) : 0;

  return (
    <section aria-labelledby="redeem" className="mt-8 max-w-xl rounded-lg border border-white/15 bg-neutral-950/60 p-6">
      {userId && (
        <p className="text-neutral-300">
          {t("balance")}: <RespectAmount n={balance} className="text-2xl font-black text-yellow-200" />
          <span className="ml-2 text-sm text-neutral-400">≈ {balance * CZK_PER_RESPECT} Kč</span>
        </p>
      )}
      <h2 id="redeem" className={`text-lg font-bold ${userId ? "mt-5" : ""}`}>{t("redeemTitle")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("redeemHint")}</p>
      {redeemed > 0 && (
        <p role="status" className="mt-3 rounded border border-green-500/40 bg-green-500/10 p-3 text-green-300">
          {t("redeemed")} <RespectAmount n={redeemed} sign className="font-bold" />
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{t(`errors.${error as "used" | "notFound" | "unverified" | "save"}`)}</p>}
      {userId ? (
        <form action={redeemRespectCode} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="respect-code" className="sr-only">{t("code")}</label>
          <input
            id="respect-code"
            name="code"
            defaultValue={code}
            required
            minLength={6}
            maxLength={14}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder={t("code")}
            className="min-h-11 flex-1 rounded border border-white/20 bg-neutral-900 px-3 font-mono uppercase tracking-widest outline-none focus:border-red-500"
          />
          <button type="submit" className="min-h-11 rounded bg-red-600 px-5 font-semibold hover:bg-red-500">{t("redeem")}</button>
        </form>
      ) : (
        <p className="mt-4">
          <Link href="/account" className="font-semibold text-red-400 underline hover:text-red-300">{t("signInToRedeem")}</Link>
          {code && <span className="ml-2 text-sm text-neutral-400">{t("keepCode", { code })}</span>}
        </p>
      )}
    </section>
  );
}
