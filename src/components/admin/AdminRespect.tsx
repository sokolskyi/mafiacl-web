import { connection } from "next/server";
import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { CZK_PER_RESPECT, RESPECT_MANUAL } from "@/lib/respect";
import { adjustRespect, createRespectCodes } from "@/lib/respect-actions";
import { getBatchCodes, getClubLedger, getCodeBatches, getOutstanding } from "@/lib/respect-queries";
import { SITE_URL } from "@/lib/site";
import { RespectAmount } from "@/components/respect/RespectAmount";

type Flags = { saved?: boolean; error?: string; batch?: string };

/** Respect для владельца: ручные начисления, коды физических монет, журнал. Читает сессию — только внутри <Suspense>. */
export async function AdminRespect({ locale, flags }: { locale: Locale; flags: Flags }) {
  await connection();
  const t = await getTranslations({ locale, namespace: "adminRespect" });
  const tr = await getTranslations({ locale, namespace: "respect" });
  const ctx = await getStaffContext();
  const clubs = (ctx?.clubs ?? []).filter((c) => c.roles.includes("owner") || c.roles.includes("admin"));
  if (!ctx || clubs.length === 0) return <p className="mt-10 text-neutral-400">{t("noAccess")}</p>;
  const clubIds = clubs.map((c) => c.id);

  const [batches, ledger, outstanding, codes] = await Promise.all([
    getCodeBatches(clubIds),
    getClubLedger(clubIds),
    getOutstanding(clubIds),
    flags.batch ? getBatchCodes(clubIds, flags.batch) : Promise.resolve([]),
  ]);
  // Адрес на монете ведёт на страницу Respect с подставленным кодом; активация — только кнопкой после входа.
  const redeemUrl = (code: string) => `${SITE_URL}${getPathname({ href: "/respect", locale })}?code=${code}`;
  const qr = await Promise.all(
    codes.filter((c) => !c.redeemedAt).map(async (c) => ({ ...c, svg: await QRCode.toString(redeemUrl(c.code), { type: "svg", margin: 1, errorCorrectionLevel: "M" }) })),
  );
  const input = "rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" });
  const errorKey = flags.error && ["invalid", "noPlayer", "insufficient", "blogYear"].includes(flags.error) ? flags.error : flags.error ? "save" : null;

  return (
    <div className="mt-6 space-y-12">
      <p className="print:hidden"><Link href="/admin" className="text-sm text-neutral-400 hover:text-white">← {t("back")}</Link></p>
      {flags.saved && <p role="status" className="text-green-400 print:hidden">{t("saved")}</p>}
      {errorKey && <p role="alert" className="text-red-400 print:hidden">{t(`errors.${errorKey as "invalid" | "noPlayer" | "insufficient" | "blogYear" | "save"}`)}</p>}

      <p className="text-neutral-300 print:hidden">
        {t("outstanding")}: <RespectAmount n={outstanding} className="text-2xl font-black text-yellow-200" />
        <span className="ml-2 text-sm text-neutral-400">≈ {outstanding * CZK_PER_RESPECT} Kč</span>
      </p>

      <section className="print:hidden" aria-labelledby="adjust">
        <h2 id="adjust" className="text-xl font-bold">{t("adjustTitle")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-neutral-400">{t("adjustHint")}</p>
        <form action={adjustRespect} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="grid gap-1 text-sm">{t("nickname")}<input name="nickname" required maxLength={32} className={input} /></label>
          <label className="grid gap-1 text-sm">
            {t("reasonField")}
            <select name="reason" defaultValue="bonus" className={input}>
              {(Object.keys(RESPECT_MANUAL) as (keyof typeof RESPECT_MANUAL)[]).map((k) => (
                <option key={k} value={k}>{tr(`reason.${k}`)}{RESPECT_MANUAL[k] ? ` (+${RESPECT_MANUAL[k]})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">{t("amount")}<input name="amount" type="number" required min={-10000} max={10000} step={1} className={`${input} w-28`} /></label>
          <label className="grid flex-1 gap-1 text-sm">{t("note")}<input name="note" maxLength={200} className={input} /></label>
          <button type="submit" className="min-h-11 rounded bg-red-600 px-4 font-semibold hover:bg-red-500">{t("apply")}</button>
        </form>
      </section>

      <section aria-labelledby="codes">
        <h2 id="codes" className="text-xl font-bold print:hidden">{t("codesTitle")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-neutral-400 print:hidden">{t("codesHint")}</p>
        <form action={createRespectCodes} className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
          <input type="hidden" name="locale" value={locale} />
          <label className="grid gap-1 text-sm">{t("batch")}<input name="batch" required maxLength={60} placeholder={t("batchPlaceholder")} className={input} /></label>
          <label className="grid gap-1 text-sm">{t("count")}<input name="count" type="number" required min={1} max={300} defaultValue={20} className={`${input} w-24`} /></label>
          <label className="grid gap-1 text-sm">{t("faceValue")}<input name="amount" type="number" required min={1} max={10000} defaultValue={100} className={`${input} w-28`} /></label>
          <button type="submit" className="min-h-11 rounded bg-red-600 px-4 font-semibold hover:bg-red-500">{t("create")}</button>
        </form>

        {batches.length > 0 && (
          <ul className="mt-5 divide-y divide-white/10 rounded border border-white/10 print:hidden">
            {batches.map((b) => (
              <li key={b.batch} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                <span className="flex-1 font-semibold">{b.batch}</span>
                <RespectAmount n={b.amount} />
                <span className="text-neutral-400">{t("batchUsed", { used: b.redeemed, total: b.total })}</span>
                <Link href={{ pathname: "/admin/respect", query: { batch: b.batch } }} className="font-semibold text-red-400 hover:text-red-300">{t("open")}</Link>
              </li>
            ))}
          </ul>
        )}

        {flags.batch && codes.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold print:hidden">{t("batchTitle", { batch: flags.batch })}</h3>
            <p className="mt-1 text-sm text-neutral-400 print:hidden">{t("printHint")}</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4 print:gap-2">
              {qr.map((c) => (
                <li key={c.code} className="break-inside-avoid rounded border border-neutral-300 bg-white p-3 text-center text-black">
                  <div className="mx-auto w-full max-w-[9rem]" dangerouslySetInnerHTML={{ __html: c.svg }} />
                  <p className="mt-1 font-mono text-sm font-bold tracking-widest">{c.code}</p>
                  <p className="text-xs font-semibold">{c.amount} Respect · MafiaCL</p>
                </li>
              ))}
            </ul>
            {codes.some((c) => c.redeemedAt) && (
              <ul className="mt-6 divide-y divide-white/10 rounded border border-white/10 text-sm print:hidden">
                {codes.filter((c) => c.redeemedAt).map((c) => (
                  <li key={c.code} className="flex gap-3 px-4 py-2">
                    <span className="font-mono text-neutral-500 line-through">{c.code}</span>
                    <span className="flex-1">{c.redeemedBy ?? "—"}</span>
                    <span className="text-neutral-400">{date.format(new Date(c.redeemedAt!))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="print:hidden" aria-labelledby="ledger">
        <h2 id="ledger" className="text-xl font-bold">{t("ledgerTitle")}</h2>
        {ledger.length === 0 ? (
          <p className="mt-3 text-neutral-400">{t("ledgerEmpty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10 text-sm">
            {ledger.map((l) => (
              <li key={l.id} className="flex flex-wrap items-baseline gap-3 px-4 py-2">
                <span className="w-28 shrink-0 text-neutral-500">{date.format(new Date(l.createdAt))}</span>
                <span className="w-32 shrink-0 font-semibold">{l.nickname ?? "—"}</span>
                <span className="flex-1">{tr(`reason.${l.reason}`)}{l.note && <span className="text-neutral-400"> · {l.note}</span>}</span>
                <RespectAmount n={l.amount} sign className={l.amount > 0 ? "text-green-400" : "text-neutral-300"} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
