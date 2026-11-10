import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { gameTitle } from "@/lib/games";
import { addGuest, changeSignup, updateGame } from "@/lib/admin/actions";
import { announceGame } from "@/lib/telegram/actions";
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
  const { game, signups, venues } = data;

  const tpl = game.title?.[locale] ?? game.title?.cs;
  const title = tpl ? gameTitle(tpl, game.number, game.numberStyle) : tg(`kind.${game.kind}`);
  const confirmed = signups.filter((s) => s.status === "confirmed");
  const waitlist = signups.filter((s) => s.status === "waitlist");
  const input = "mt-1 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";

  const Row = ({ s, n }: { s: (typeof signups)[number]; n: number }) => (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2">
      <span className="w-6 text-right text-sm text-neutral-500">{n}</span>
      <span className="flex-1">
        {s.name}
        {s.isGuest && <span className="ml-2 rounded bg-white/10 px-1.5 text-xs text-neutral-400">{t("guest")}</span>}
      </span>
      <form action={changeSignup} className="flex gap-3 text-sm">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="gameId" value={game.id} />
        <input type="hidden" name="signupId" value={s.id} />
        {s.status === "waitlist" && (
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
          {t(`errors.${["invalid", "full", "bot", "channel"].includes(flags.error) ? flags.error : "save"}`)}
        </p>
      )}
      <form action={announceGame}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="gameId" value={game.id} />
        <button className="rounded bg-[#229ED9] px-4 py-2 text-sm font-semibold hover:bg-[#1f91c7]">{t("announce")}</button>
      </form>

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
