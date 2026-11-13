import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { gameTitle } from "@/lib/games";
import { addGuest, changeSignup, recordGamePayment, undoPayment, updateGame } from "@/lib/admin/actions";
import { announceGame } from "@/lib/telegram/actions";
import { payGameWithRespect } from "@/lib/respect-actions";
import { respectForCzk } from "@/lib/respect";
import { RespectAmount } from "@/components/respect/RespectAmount";
import { createMatch } from "@/lib/match/actions";
import { getGameMatches } from "@/lib/match/queries";
import { getEveningStandings } from "@/lib/rating";
import { getBadges, withBadge } from "@/lib/badges";
import { getAdminGame, getStaffContext } from "@/lib/admin/queries";
import { isoToLocalInput } from "@/lib/admin/time";

type Flags = { saved?: string; created?: string; error?: string; announced?: string };

/** Читает сессию — только внутри <Suspense>. */
export async function AdminGame({ locale, id, flags }: { locale: Locale; id: number; flags: Flags }) {
  const t = await getTranslations({ locale, namespace: "admin" });
  const tg = await getTranslations({ locale, namespace: "games" });
  const ctx = await getStaffContext();
  if (!ctx) return <p className="mt-10"><Link href="/account" className="text-red-400 underline">{t("signIn")}</Link></p>;

  const data = await getAdminGame(id);
  if (!data || !ctx.clubs.some((c) => c.id === data.game.club_id)) notFound();
  const { game, signups, venues, ratings } = data;
  const matches = await getGameMatches(game.id);
  const badges = await getBadges(ctx.clubs.find((c) => c.id === game.club_id)?.slug ?? "");
  const standings = matches.some((m) => m.status === "finished") ? await getEveningStandings(game.id) : [];
  const tm = await getTranslations({ locale, namespace: "match" });

  const tpl = game.title?.[locale] ?? game.title?.cs;
  const title = tpl ? gameTitle(tpl, game.number, game.numberStyle) : tg(`kind.${game.kind}`);
  const confirmed = signups.filter((s) => s.status === "confirmed");
  const waitlist = signups.filter((s) => s.status === "waitlist");
  // Очередь в том порядке, в каком её разберёт база: абонементы, потом время записи.
  const queued = signups
    .filter((s) => s.status === "queued")
    .sort((a, b) => Number(b.hasMembership) - Number(a.hasMembership));
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: game.timezone, weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const queueOpen = !!game.priority_until && !game.allocated_at;
  const money = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(n);
  const input = "mt-1 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";

  const Row = ({ s, n }: { s: (typeof signups)[number]; n: number }) => (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2">
      <span className="w-6 text-right text-sm text-neutral-500">{n}</span>
      <span className="flex-1">
        {withBadge(badges, s.profileId, s.name)}
        {s.isGuest && <span className="ml-2 rounded bg-white/10 px-1.5 text-xs text-neutral-400">{t("guest")}</span>}
        {s.hasMembership && <span className="ml-2 rounded bg-sky-500/20 px-1.5 text-xs text-sky-300">{t("membershipBadge")}</span>}
      </span>
      {s.status === "confirmed" && !s.hasMembership && (
        s.payment ? (
          <form action={undoPayment} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="gameId" value={game.id} />
            <input type="hidden" name="paymentId" value={s.payment.id} />
            <span className="text-green-400">
              ✓ {s.payment.respect ? <RespectAmount n={respectForCzk(s.payment.amount)} /> : <>{money(s.payment.amount)} · {t(`pay.${s.payment.method}`)}</>}
            </span>
            {s.payment.method !== "gopay" && (
              <button aria-label={t("pay.undo")} title={t("pay.undo")} className="text-neutral-500 hover:text-red-400">×</button>
            )}
          </form>
        ) : (
          <form action={recordGamePayment} className="flex gap-2 text-sm">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="gameId" value={game.id} />
            <input type="hidden" name="signupId" value={s.id} />
            <button name="method" value="cash" className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">{t("pay.cash")}</button>
            <button name="method" value="card" className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">{t("pay.card")}</button>
            {s.profileId && Number(game.price_czk ?? 0) > 0 && (
              <button formAction={payGameWithRespect} title={t("pay.respectHint")} className="rounded bg-yellow-500/20 px-2 py-0.5 text-yellow-200 hover:bg-yellow-500/30">
                <RespectAmount n={respectForCzk(Number(game.price_czk))} />
              </button>
            )}
          </form>
        )
      )}
      <form action={changeSignup} className="flex gap-3 text-sm">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="gameId" value={game.id} />
        <input type="hidden" name="signupId" value={s.id} />
        {(s.status === "waitlist" || s.status === "queued") && (
          <button name="op" value="confirm" className="text-green-400 hover:underline">{t("confirm")}</button>
        )}
        {s.status === "confirmed" && (
          <button name="op" value={s.checkedIn ? "uncheck" : "checkin"} className={s.checkedIn ? "text-green-400" : "text-neutral-300 hover:underline"}>
            {s.checkedIn ? `✓ ${t("checkedIn")}` : t("checkIn")}
          </button>
        )}
        <button name="op" value="remove" className="text-neutral-500 hover:text-red-400">{t("remove")}</button>
      </form>
    </li>
  );

  return (
    <div className="mt-6 space-y-10">
      <p><Link href="/admin" className="text-sm text-neutral-400 hover:text-white">← {t("back")}</Link></p>
      <h2 className="text-3xl font-black">{title}</h2>
      {flags.saved && <p role="status" className="text-green-400">{t("saved")}</p>}
      {flags.created && <p role="status" className="text-green-400">{t("created")}</p>}
      {flags.announced && <p role="status" className="text-green-400">{t("announced")}</p>}
      {flags.error && (
        <p role="alert" className="text-red-400">
          {t(`errors.${["invalid", "full", "bot", "channel", "matchNumber", "respect"].includes(flags.error) ? flags.error : "save"}`)}
        </p>
      )}
      <form action={announceGame}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="gameId" value={game.id} />
        <button className="rounded bg-[#229ED9] px-4 py-2 text-sm font-semibold hover:bg-[#1f91c7]">{t("announce")}</button>
      </form>

      <section>
        <h3 className="text-lg font-bold">{tm("matches")}</h3>
        {matches.length > 0 && (
          <ul className="mt-3 divide-y divide-white/10 rounded border border-white/10">
            {matches.map((m) => (
              <li key={m.id}>
                <Link
                  href={{ pathname: "/admin/matches/[id]", params: { id: String(m.id) } }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/5"
                >
                  <span className="font-semibold">{tm("header", { number: m.number, table: m.tableNo })}</span>
                  <span className="flex-1 text-sm text-neutral-400">
                    {m.status === "live" ? tm("statusLive") : m.result ? tm(`result.${m.result}`) : tm("statusVoid")}
                  </span>
                  <span className="text-sm text-red-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <form action={createMatch} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="gameId" value={game.id} />
          <label className="text-sm">{tm("table")}
            <select name="tableNo" defaultValue="1" className="mt-1 block rounded border border-white/20 bg-neutral-900 px-3 py-2">
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="text-sm">{tm("numberField")}
            <input type="number" name="number" min={1} placeholder={tm("numberAuto")} className="mt-1 block w-32 rounded border border-white/20 bg-neutral-900 px-3 py-2" />
          </label>
          <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500">{tm("newMatch")}</button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">{tm("newMatchHint")}</p>
        {standings.length > 0 && (
          <div className="mt-6">
            <h4 className="font-bold">{tm("standings")}</h4>
            <ol className="mt-2 max-w-md divide-y divide-white/10 rounded border border-white/10 text-sm">
              {standings.map((r) => (
                <li key={`${r.profileId ?? r.name}`} className={`flex items-center gap-3 px-3 py-1.5 ${r.place === 1 ? "bg-yellow-500/10 font-bold" : ""}`}>
                  <span className="w-6 font-mono text-neutral-400">{r.place}</span>
                  <span className="flex-1">{r.place === 1 && "⚜️ "}{withBadge(badges, r.profileId, r.nickname ?? r.name)}</span>
                  <span className="text-neutral-400">{r.wins}/{r.games}</span>
                  <span className="w-12 text-right font-mono">{r.points}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {game.priority_until && (
        <p className="max-w-2xl rounded border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
          {t("queueRules", {
            until: `${new Intl.DateTimeFormat(locale, { timeZone: game.timezone, weekday: "short", day: "numeric", month: "numeric" }).format(
              new Date(new Date(game.priority_until).getTime() - 60_000),
            )} 24:00`,
            final: game.final_at ? fmt(game.final_at) : "—",
          })}
          {game.finalized_at && <span className="block text-neutral-400">{t("queueFinalized")}</span>}
        </p>
      )}

      {(queueOpen || queued.length > 0) && (
        <section>
          <h3 className="text-lg font-bold text-sky-400">{t("queue", { count: queued.length })}</h3>
          <ol className="mt-3 divide-y divide-white/10 rounded border border-white/10">
            {queued.map((s, i) => <Row key={s.id} s={s} n={i + 1} />)}
            {queued.length === 0 && <li className="px-4 py-3 text-neutral-500">{t("nobody")}</li>}
          </ol>
        </section>
      )}

      <section>
        <h3 className="text-lg font-bold">{t("players", { confirmed: confirmed.length, capacity: game.capacity })}</h3>
        <ol className="mt-3 divide-y divide-white/10 rounded border border-white/10">
          {confirmed.map((s, i) => <Row key={s.id} s={s} n={i + 1} />)}
          {confirmed.length === 0 && <li className="px-4 py-3 text-neutral-500">{t("nobody")}</li>}
        </ol>
        {waitlist.length > 0 && (
          <>
            <h3 className="mt-6 text-lg font-bold text-amber-400">{t("waitlist", { count: waitlist.length })}</h3>
            <ol className="mt-3 divide-y divide-white/10 rounded border border-white/10">
              {waitlist.map((s, i) => <Row key={s.id} s={s} n={i + 1} />)}
            </ol>
          </>
        )}
        <form action={addGuest} className="mt-4 flex max-w-md gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="gameId" value={game.id} />
          <label htmlFor="guestName" className="sr-only">{t("guestName")}</label>
          <input id="guestName" name="guestName" required maxLength={80} placeholder={t("guestName")} className="flex-1 rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500" />
          <button className="rounded bg-neutral-800 px-4 py-2 font-semibold hover:bg-neutral-700">{t("addGuest")}</button>
        </form>
      </section>

      <section>
        <h3 className="text-lg font-bold">{t("settings")}</h3>
        <form action={updateGame} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="gameId" value={game.id} />
          <input type="hidden" name="timezone" value={game.timezone} />
          <label className="text-sm">{t("fields.startsAt")}
            <input type="datetime-local" name="startsAt" required defaultValue={isoToLocalInput(game.starts_at, game.timezone)} className={input} />
          </label>
          <label className="text-sm">{t("fields.status")}
            <select name="status" defaultValue={game.status} className={input}>
              {(["draft", "open", "closed", "finished", "cancelled"] as const).map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">{t("fields.venue")}
            <select name="venueId" defaultValue={game.venue_id ?? ""} className={input}>
              <option value="">—</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <label className="text-sm">{t("fields.finalRating")}
            <select name="finalRatingId" defaultValue={game.final_rating_id ?? ""} className={input}>
              <option value="">{t("fields.notFinal")}</option>
              {ratings.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="text-sm">{t("fields.number")}
            <input type="number" name="number" min={1} defaultValue={game.number ?? ""} className={input} />
          </label>
          <label className="text-sm">{t("fields.capacity")}
            <input type="number" name="capacity" min={1} max={40} required defaultValue={game.capacity} className={input} />
          </label>
          <label className="text-sm">{t("fields.price")}
            <input type="number" name="price" min={0} step="1" defaultValue={game.price_czk ?? ""} className={input} />
          </label>
          <label className="text-sm sm:col-span-2">{t("fields.streamUrl")}
            <input type="url" name="streamUrl" placeholder="https://youtube.com/live/…" defaultValue={game.stream_url ?? ""} className={input} />
          </label>
          <label className="text-sm sm:col-span-2">{t("fields.infoUrl")}
            <input type="url" name="infoUrl" placeholder="https://mafgame.org/tournaments/…" defaultValue={game.info_url ?? ""} className={input} />
          </label>
          <button type="submit" className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-2">{t("save")}</button>
        </form>
      </section>
    </div>
  );
}
