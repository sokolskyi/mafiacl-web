import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { gameTitle } from "@/lib/games";
import { addPrize, addStaff, banPlayer, unbanPlayer, savePartner, removePartner, saveHost, removeHost, setRequestStatus, addTitle, removePrize, createGame, grantMembership, linkMembership, removeMembership, removeStaff, removeTitle } from "@/lib/admin/actions";
import { getPrizes, getTitles } from "@/lib/badges";
import { setupBot } from "@/lib/telegram/actions";
import { getAdminGames, getClubBans, getClubPartners, getClubHosts, getCorporateRequests, getClubMemberships, getClubStaff, getStaffContext } from "@/lib/admin/queries";
import { MEMBERSHIP_PLANS } from "@/lib/memberships";
import { isoToLocalInput } from "@/lib/admin/time";
import { PhotoField } from "./PhotoUpload";

/** Читает сессию — только внутри <Suspense>. */
export async function AdminHome({
  locale, error, team, bot, membership,
}: { locale: Locale; error?: string; team?: boolean; bot?: boolean; membership?: string }) {
  await connection(); // админка всегда по запросу: дата, сессия
  const t = await getTranslations({ locale, namespace: "admin" });
  const tg = await getTranslations({ locale, namespace: "games" });
  const ctx = await getStaffContext();

  if (!ctx) {
    return (
      <p className="mt-10">
        <Link href="/account" className="text-red-400 underline">{t("signIn")}</Link>
      </p>
    );
  }
  if (ctx.clubs.length === 0) return <p className="mt-10 text-neutral-400">{t("noAccess")}</p>;

  const games = await getAdminGames(ctx.clubs.map((c) => c.id));
  const tzOf = new Map(ctx.clubs.map((c) => [c.id, c.timezone]));
  const input = "rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";

  return (
    <div className="mt-10 space-y-12">
      {error && (
        <p role="alert" className="text-red-400">
          {t(`errors.${error === "invalid" || error === "noPlayer" || error === "bot" ? error : "save"}`)}
        </p>
      )}
      {team && <p role="status" className="text-green-400">{t("teamAdded")}</p>}
      {bot && <p role="status" className="text-green-400">{t("botReady")}</p>}
      {membership && (
        <p role="status" className="text-green-400">
          {t(membership === "unlinked" ? "membershipUnlinked" : membership === "linked" ? "membershipLinked" : "membershipAdded")}
        </p>
      )}

      <p>
        <Link href="/admin/shop" className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 font-semibold hover:bg-white/10">
          {t("shopLink")}
        </Link>
      </p>

      <section>
        <h2 className="text-xl font-bold">{t("games")}</h2>
        <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
          {games.map((g) => {
            const tz = tzOf.get(g.clubId) ?? "Europe/Prague";
            const when = new Intl.DateTimeFormat(locale, {
              timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            }).format(new Date(g.startsAt));
            const tpl = g.title?.[locale] ?? g.title?.cs;
            const title = tpl ? gameTitle(tpl, g.number, g.numberStyle) : tg(`kind.${g.kind}`);
            return (
              <li key={g.id}>
                <Link
                  href={{ pathname: "/admin/games/[id]", params: { id: String(g.id) } }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-white/5"
                >
                  <span className="w-40 shrink-0 text-sm text-neutral-400">{when}</span>
                  <span className="flex-1 font-semibold">{title}</span>
                  <span className="text-sm text-neutral-400">{g.venueName}</span>
                  <span className="text-sm">
                    {g.confirmed}/{g.capacity}
                    {g.waitlist > 0 && <span className="text-amber-400"> +{g.waitlist}</span>}
                    {g.queued > 0 && <span className="text-sky-400"> · {t("queuedShort", { count: g.queued })}</span>}
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs">{t(`status.${g.status}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {ctx.clubs.map((club) => (
        <section key={club.id}>
          <h2 className="text-xl font-bold">{t("newGame", { club: club.name })}</h2>
          <p className="mt-1 text-sm text-neutral-400">{t("newGameHint")}</p>
          <form action={createGame} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="clubId" value={club.id} />
            <input type="hidden" name="timezone" value={club.timezone} />
            <label className="text-sm">
              {t("fields.startsAt")}
              <input type="datetime-local" name="startsAt" required defaultValue={isoToLocalInput(new Date().toISOString(), club.timezone).slice(0, 11) + "19:00"} className={`mt-1 w-full ${input}`} />
            </label>
            <label className="text-sm">
              {t("fields.kind")}
              <select name="kind" defaultValue="rating" className={`mt-1 w-full ${input}`}>
                {(["rating", "fun", "tournament", "corporate", "kids"] as const).map((k) => (
                  <option key={k} value={k}>{tg(`kind.${k}`)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t("fields.title")}
              <input name="title" maxLength={80} placeholder={t("fields.titlePlaceholder")} className={`mt-1 w-full ${input}`} />
            </label>
            <label className="text-sm">
              {t("fields.capacity")}
              <input type="number" name="capacity" min={1} max={40} defaultValue={10} required className={`mt-1 w-full ${input}`} />
            </label>
            <button type="submit" className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-2">
              {t("create")}
            </button>
          </form>
        </section>
      ))}

      {await Promise.all(
        ctx.clubs
          .filter((club) => club.roles.includes("owner") || club.roles.includes("admin"))
          .map(async (club) => {
            const list = await getClubMemberships(club.id, club.timezone);
            const today = new Intl.DateTimeFormat("en-CA", { timeZone: club.timezone }).format(new Date());
            const date = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(d));
            return (
              <section key={`m-${club.id}`} id="memberships">
                <h2 className="text-xl font-bold">{t("memberships", { club: club.name })}</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("membershipsHint")}</p>
                <ul className="mt-4 max-w-3xl divide-y divide-white/10 rounded border border-white/10">
                  {list.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
                      <span className="flex-1 font-semibold">
                        {m.name}
                        {!m.linked && <span className="ml-2 rounded bg-amber-500/20 px-1.5 text-xs font-normal text-amber-300">{t("notLinked")}</span>}
                      </span>
                      <span className="text-sm text-neutral-400">{t(`plans.${m.plan}`)}</span>
                      <span className="text-sm">{date(m.validFrom)} – {date(m.validUntil)}</span>
                      <span className="text-sm">
                        {m.paid ? <span className="text-green-400">✓ {m.paid.amount} Kč{m.paid.method !== "other" && ` · ${t(`pay.${m.paid.method}`)}`}</span> : <span className="text-amber-400">{t("pay.unpaid")}</span>}
                      </span>
                      {!m.linked && (
                        <form action={linkMembership} className="flex gap-1">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="membershipId" value={m.id} />
                          <input name="nickname" required minLength={2} maxLength={32} defaultValue={m.name} aria-label={t("fields.siteNickname")} className="w-32 rounded border border-white/20 bg-neutral-900 px-2 py-0.5 text-sm" />
                          <button className="text-sm text-sky-400 hover:underline">{t("link")}</button>
                        </form>
                      )}
                      <form action={removeMembership}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="membershipId" value={m.id} />
                        <button className="text-sm text-neutral-500 hover:text-red-400">{t("remove")}</button>
                      </form>
                    </li>
                  ))}
                  {list.length === 0 && <li className="px-4 py-3 text-neutral-500">{t("noMemberships")}</li>}
                </ul>
                <form action={grantMembership} className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="clubId" value={club.id} />
                  <label className="text-sm">{t("fields.nickname")}
                    <input name="nickname" required minLength={2} maxLength={32} className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.plan")}
                    <select name="plan" defaultValue="month" className={`mt-1 w-full ${input}`}>
                      {(Object.keys(MEMBERSHIP_PLANS) as (keyof typeof MEMBERSHIP_PLANS)[]).map((p) => (
                        <option key={p} value={p}>
                          {t(`plans.${p}`)}{MEMBERSHIP_PLANS[p].priceCzk ? ` · ${MEMBERSHIP_PLANS[p].priceCzk} Kč` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">{t("fields.validFrom")}
                    <input type="date" name="validFrom" required defaultValue={today} className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.paidHow")}
                    <select name="method" defaultValue="cash" className={`mt-1 w-full ${input}`}>
                      {(["cash", "card", "transfer", "none"] as const).map((p) => (
                        <option key={p} value={p}>{t(p === "none" ? "pay.unpaid" : `pay.${p}`)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">{t("fields.amount")}
                    <input type="number" name="amount" min={0} step="1" placeholder={t("fields.amountHint")} className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.validUntil")}
                    <input type="date" name="validUntil" className={`mt-1 w-full ${input}`} />
                    <span className="mt-1 block text-xs text-neutral-500">{t("fields.validUntilHint")}</span>
                  </label>
                  <label className="text-sm sm:col-span-3">{t("fields.note")}
                    <input name="note" maxLength={200} className={`mt-1 w-full ${input}`} />
                  </label>
                  <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-3">{t("grantMembership")}</button>
                </form>
              </section>
            );
          }),
      )}

      {await Promise.all(
        ctx.clubs
          .filter((club) => club.roles.includes("owner") || club.roles.includes("admin"))
          .map(async (club) => {
            const titles = await getTitles(club.slug);
            return (
              <section key={`t-${club.id}`} id="titles">
                <h2 className="text-xl font-bold">{t("titles", { club: club.name })}</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("titlesHint")}</p>
                {titles.length > 0 && (
                  <ul className="mt-4 max-w-2xl divide-y divide-white/10 rounded border border-white/10">
                    {titles.map((x) => (
                      <li key={x.id} className="flex items-center gap-3 px-4 py-2">
                        <span aria-hidden="true">{x.kind === "season_champion" ? "⭐" : "👑"}</span>
                        <span className="flex-1 font-semibold">{x.nickname ?? x.holderName}</span>
                        <span className="text-sm text-neutral-400">{x.label}</span>
                        <form action={removeTitle}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="titleId" value={x.id} />
                          <button className="text-sm text-neutral-500 hover:text-red-400">{t("remove")}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addTitle} className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-4">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="clubId" value={club.id} />
                  <label className="text-sm">{t("fields.nickname")}
                    <input name="nickname" required maxLength={32} className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.titleKind")}
                    <select name="kind" className={`mt-1 w-full ${input}`}>
                      <option value="season_champion">⭐ {t("titleKinds.season_champion")}</option>
                      <option value="kings_winner">👑 {t("titleKinds.kings_winner")}</option>
                    </select>
                  </label>
                  <label className="text-sm">{t("fields.titleLabel")}
                    <input name="label" required maxLength={60} placeholder={t("fields.titleLabelHint")} className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.wonOn")}
                    <input type="date" name="wonOn" className={`mt-1 w-full ${input}`} />
                  </label>
                  <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-4">{t("addTitle")}</button>
                </form>
              </section>
            );
          }),
      )}

      {await Promise.all(
        ctx.clubs
          .filter((club) => club.roles.includes("owner") || club.roles.includes("admin"))
          .map(async (club) => {
            const prizes = (await getPrizes(club.slug)).slice(0, 30);
            const today = new Intl.DateTimeFormat("en-CA", { timeZone: club.timezone }).format(new Date());
            return (
              <section key={`p-${club.id}`} id="prizes">
                <h2 className="text-xl font-bold">{t("prizes", { club: club.name })}</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("prizesHint")}</p>
                {prizes.length > 0 && (
                  <ul className="mt-4 max-w-2xl divide-y divide-white/10 rounded border border-white/10">
                    {prizes.map((x) => (
                      <li key={x.id} className="flex items-center gap-3 px-4 py-2">
                        <span className="flex-1 font-semibold">{x.nickname ?? x.holderName}</span>
                        <span className="text-sm text-neutral-400">{x.label}</span>
                        <span className="font-mono">{x.amount} Kč</span>
                        <form action={removePrize}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="prizeId" value={x.id} />
                          <button className="text-sm text-neutral-500 hover:text-red-400">{t("remove")}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addPrize} className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-4">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="clubId" value={club.id} />
                  <label className="text-sm">{t("fields.nickname")}
                    <input name="nickname" required maxLength={32} className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.amount")}
                    <input type="number" name="amount" min={1} required className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.titleLabel")}
                    <input name="label" required maxLength={80} placeholder={t("fields.prizeLabelHint")} className={`mt-1 w-full ${input}`} />
                  </label>
                  <label className="text-sm">{t("fields.wonOn")}
                    <input type="date" name="wonOn" defaultValue={today} className={`mt-1 w-full ${input}`} />
                  </label>
                  <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-4">{t("addPrize")}</button>
                </form>
              </section>
            );
          }),
      )}

      {ctx.clubs.some((c) => c.roles.includes("owner")) && (
        <section>
          <h2 className="text-xl font-bold">{t("botTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("botHint")}</p>
          <form action={setupBot} className="mt-3">
            <input type="hidden" name="locale" value={locale} />
            <button className="rounded bg-[#229ED9] px-4 py-2 font-semibold hover:bg-[#1f91c7]">{t("botSetup")}</button>
          </form>
        </section>
      )}

      {await Promise.all(
        ctx.clubs
          .filter((club) => club.roles.includes("owner"))
          .map(async (club) => {
            const staff = await getClubStaff(club.id);
            return (
              <section key={`team-${club.id}`} id="team">
                <h2 className="text-xl font-bold">{t("team", { club: club.name })}</h2>
                <ul className="mt-4 max-w-xl divide-y divide-white/10 rounded border border-white/10">
                  {staff.map((m) => (
                    <li key={`${m.profileId}-${m.role}`} className="flex items-center gap-3 px-4 py-2">
                      <span className="flex-1">{m.name}</span>
                      <span className="text-sm text-neutral-400">{t(`roles.${m.role}`)}</span>
                      {m.role !== "owner" && (
                        <form action={removeStaff}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="clubId" value={club.id} />
                          <input type="hidden" name="profileId" value={m.profileId} />
                          <input type="hidden" name="role" value={m.role} />
                          <button className="text-sm text-neutral-500 hover:text-red-400">{t("remove")}</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
                <form action={addStaff} className="mt-4 flex max-w-xl flex-wrap gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="clubId" value={club.id} />
                  <label htmlFor={`nick-${club.id}`} className="sr-only">{t("fields.nickname")}</label>
                  <input id={`nick-${club.id}`} name="nickname" required minLength={2} maxLength={32} placeholder={t("fields.nickname")} className={`flex-1 ${input}`} />
                  <select name="role" defaultValue="host" aria-label={t("fields.role")} className={input}>
                    <option value="host">{t("roles.host")}</option>
                    <option value="admin">{t("roles.admin")}</option>
                  </select>
                  <button className="rounded bg-neutral-800 px-4 py-2 font-semibold hover:bg-neutral-700">{t("addStaff")}</button>
                </form>
                <p className="mt-2 text-sm text-neutral-400">{t("teamHint")}</p>
              </section>
            );
          }),
      )}

      {await Promise.all(
        ctx.clubs
          .filter((club) => club.roles.includes("owner") || club.roles.includes("admin"))
          .map(async (club) => {
            const [requests, hosts] = await Promise.all([getCorporateRequests(club.id), getClubHosts(club.id)]);
            const fmt = new Intl.DateTimeFormat(locale, { timeZone: club.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
            const HostFields = ({ h }: { h?: (typeof hosts)[number] }) => (
              <>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="clubId" value={club.id} />
                {h && <input type="hidden" name="hostId" value={h.id} />}
                <label className="text-sm">{t("fields.nickname")}
                  <input name="nickname" required maxLength={32} defaultValue={h?.nickname ?? ""} className={`mt-1 w-full ${input}`} />
                </label>
                <label className="text-sm">{t("fields.hostName")}
                  <input name="name" required maxLength={60} defaultValue={h?.name ?? ""} className={`mt-1 w-full ${input}`} />
                </label>
                <label className="text-sm">{t("fields.playingSince")}
                  <input name="playingSince" type="number" min={1990} max={2100} placeholder="2015" defaultValue={h?.playingSince ?? ""} className={`mt-1 w-full ${input}`} />
                </label>
                <label className="text-sm">{t("fields.hostingSince")}
                  <input name="hostingSince" type="number" min={1990} max={2100} placeholder="2018" defaultValue={h?.hostingSince ?? ""} className={`mt-1 w-full ${input}`} />
                </label>
                <fieldset className="text-sm sm:col-span-2">
                  <legend>{t("fields.hostLanguages")}</legend>
                  <div className="mt-1 flex flex-wrap gap-4">
                    {(["cs", "ru", "uk", "en"] as const).map((l) => (
                      <label key={l} className="flex items-center gap-2">
                        <input type="checkbox" name={`lang_${l}`} defaultChecked={h?.languages.includes(l) ?? false} className="h-4 w-4" /> {t(`langs.${l}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <PhotoField clubId={club.id} initial={h?.photoUrl ? [h.photoUrl] : []} labels={{ label: t("fields.hostPhoto"), hint: t("fields.logoHint"), upload: t("fields.uploadPhoto"), uploading: t("fields.uploading"), failed: t("fields.uploadFailed") }} />
                {(["cs", "ru", "uk", "en"] as const).map((l) => (
                  <label key={l} className="text-sm">{t("fields.hostBio")} · {l.toUpperCase()}
                    <textarea name={`bio_${l}`} rows={2} maxLength={300} defaultValue={h?.bio[l] ?? ""} className={`mt-1 w-full ${input}`} />
                  </label>
                ))}
                <label className="text-sm">{t("fields.sort")}
                  <input name="sort" type="number" min={0} defaultValue={h?.sort ?? 100} className={`mt-1 w-full ${input}`} />
                </label>
              </>
            );
            return (
              <div key={`hr-${club.id}`} className="space-y-12">
                <section id="requests">
                  <h2 className="text-xl font-bold">{t("requests", { club: club.name })}</h2>
                  <ul className="mt-4 max-w-3xl divide-y divide-white/10 rounded border border-white/10">
                    {requests.map((r) => (
                      <li key={r.id} className="space-y-1 px-4 py-3">
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${r.kind === "franchise" ? "bg-amber-500/20 text-amber-200" : "bg-white/10"}`}>{t(`requestKinds.${r.kind}`)}</span>
                          <span className="font-bold">{r.name}</span>
                          {r.city && <span className="text-neutral-300">{r.city}</span>}
                          {r.company && <span className="text-neutral-300">{r.company}</span>}
                          <span className="font-mono text-sm">{r.contact}</span>
                          <span className="ml-auto text-xs text-neutral-500">{fmt.format(new Date(r.created_at))}</span>
                        </div>
                        <p className="text-sm text-neutral-400">
                          {[
                            r.event_date,
                            r.guests ? t("guestsN", { count: r.guests }) : null,
                            r.format ? t(`formats.${r.format}`) : null,
                            r.language ? t(`langs.${r.language}`) : null,
                            (r.details as { venue?: string } | null)?.venue ? t(`venueKinds.${(r.details as { venue: string }).venue}`) : null,
                            (r.details as { experience?: string } | null)?.experience ? t(`expKinds.${(r.details as { experience: string }).experience}`) : null,
                          ].filter(Boolean).join(" · ")}
                        </p>
                        {r.message && <p className="whitespace-pre-line text-sm text-neutral-300">{r.message}</p>}
                        <form action={setRequestStatus} className="flex items-center gap-2 pt-1">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="requestId" value={r.id} />
                          <select name="status" defaultValue={r.status} aria-label={t("requestStatus")} className="rounded border border-white/20 bg-neutral-900 px-2 py-1 text-sm">
                            {(["new", "in_progress", "done", "rejected"] as const).map((s) => <option key={s} value={s}>{t(`requestStatuses.${s}`)}</option>)}
                          </select>
                          <button className="rounded bg-neutral-800 px-3 py-1 text-sm font-semibold hover:bg-neutral-700">{t("save")}</button>
                        </form>
                      </li>
                    ))}
                    {requests.length === 0 && <li className="px-4 py-3 text-neutral-500">{t("noRequests")}</li>}
                  </ul>
                </section>

                <section id="hosts">
                  <h2 className="text-xl font-bold">{t("hosts", { club: club.name })}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("hostsHint")}</p>
                  <div className="mt-4 max-w-3xl space-y-3">
                    {hosts.map((h) => (
                      <details key={h.id} className="rounded border border-white/10">
                        <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3">
                          <span className="font-semibold">{h.nickname}</span>
                          <span className="flex-1 text-sm text-neutral-400">{h.name}</span>
                          <span className="text-xs uppercase text-neutral-400">{h.languages.join(" · ")}</span>
                        </summary>
                        <div className="border-t border-white/10 p-4">
                          <form action={saveHost} className="grid gap-3 sm:grid-cols-2">
                            <HostFields h={h} />
                            <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-2">{t("save")}</button>
                          </form>
                          <form action={removeHost} className="mt-3">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="hostId" value={h.id} />
                            <button className="text-sm text-neutral-500 hover:text-red-400">{t("remove")}</button>
                          </form>
                        </div>
                      </details>
                    ))}
                  </div>
                  <h3 className="mt-6 font-bold">{t("addHost")}</h3>
                  <form action={saveHost} className="mt-3 grid max-w-3xl gap-3 rounded border border-white/10 p-4 sm:grid-cols-2">
                    <HostFields />
                    <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-2">{t("addHost")}</button>
                  </form>
                </section>
              </div>
            );
          }),
      )}

      {await Promise.all(
        ctx.clubs
          .filter((club) => club.roles.includes("owner") || club.roles.includes("admin"))
          .map(async (club) => {
            const partners = await getClubPartners(club.id);
            const photoLabels = { label: t("fields.logo"), hint: t("fields.logoHint"), upload: t("fields.uploadLogo"), uploading: t("fields.uploading"), failed: t("fields.uploadFailed") };
            const PartnerFields = ({ p }: { p?: (typeof partners)[number] }) => (
              <>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="clubId" value={club.id} />
                {p && <input type="hidden" name="partnerId" value={p.id} />}
                <label className="text-sm">{t("fields.partnerName")}
                  <input name="name" required maxLength={80} defaultValue={p?.name ?? ""} className={`mt-1 w-full ${input}`} />
                </label>
                <label className="text-sm">{t("fields.partnerUrl")}
                  <input name="url" placeholder="https://…" defaultValue={p?.url ?? ""} className={`mt-1 w-full ${input}`} />
                </label>
                <PhotoField clubId={club.id} initial={p?.logoUrl ? [p.logoUrl] : []} labels={photoLabels} />
                {(["cs", "ru", "uk", "en"] as const).map((l) => (
                  <label key={l} className="text-sm">{t("fields.partnerDescription")} · {l.toUpperCase()}
                    <textarea name={`description_${l}`} rows={2} maxLength={400} defaultValue={p?.description[l] ?? ""} className={`mt-1 w-full ${input}`} />
                  </label>
                ))}
              </>
            );
            return (
              <section key={`partners-${club.id}`} id="partners">
                <h2 className="text-xl font-bold">{t("partners", { club: club.name })}</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("partnersHint")}</p>
                <div className="mt-4 max-w-3xl space-y-3">
                  {partners.map((p) => (
                    <details key={p.id} className="rounded border border-white/10">
                      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
                        <span className="flex-1 font-semibold">{p.name}</span>
                        {p.url && <span className="text-sm text-neutral-400">{p.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>}
                      </summary>
                      <div className="border-t border-white/10 p-4">
                        <form action={savePartner} className="grid gap-3 sm:grid-cols-2">
                          <PartnerFields p={p} />
                          <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-2">{t("save")}</button>
                        </form>
                        <form action={removePartner} className="mt-3">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="partnerId" value={p.id} />
                          <button className="text-sm text-neutral-500 hover:text-red-400">{t("remove")}</button>
                        </form>
                      </div>
                    </details>
                  ))}
                </div>
                <h3 className="mt-6 font-bold">{t("addPartner")}</h3>
                <form action={savePartner} className="mt-3 grid max-w-3xl gap-3 rounded border border-white/10 p-4 sm:grid-cols-2">
                  <PartnerFields />
                  <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-2">{t("addPartner")}</button>
                </form>
              </section>
            );
          }),
      )}

      {await Promise.all(
        ctx.clubs
          .filter((club) => club.roles.includes("owner") || club.roles.includes("admin"))
          .map(async (club) => {
            const bans = await getClubBans(club.id);
            return (
              <section key={`bans-${club.id}`} id="bans">
                <h2 className="text-xl font-bold">{t("bans", { club: club.name })}</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("bansHint")}</p>
                {bans.length > 0 && (
                  <ul className="mt-4 max-w-xl divide-y divide-white/10 rounded border border-white/10">
                    {bans.map((b) => (
                      <li key={b.profileId} className="flex flex-wrap items-center gap-3 px-4 py-2">
                        <span className="font-semibold">{b.name}</span>
                        {b.reason && <span className="flex-1 text-sm text-neutral-400">{b.reason}</span>}
                        <form action={unbanPlayer} className="ml-auto">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="clubId" value={club.id} />
                          <input type="hidden" name="profileId" value={b.profileId} />
                          <button className="text-sm text-sky-400 hover:underline">{t("unban")}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={banPlayer} className="mt-4 flex max-w-xl flex-wrap gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="clubId" value={club.id} />
                  <label htmlFor={`ban-${club.id}`} className="sr-only">{t("fields.nickname")}</label>
                  <input id={`ban-${club.id}`} name="nickname" required minLength={2} maxLength={32} placeholder={t("fields.nickname")} className={`w-40 ${input}`} />
                  <label htmlFor={`ban-r-${club.id}`} className="sr-only">{t("fields.reason")}</label>
                  <input id={`ban-r-${club.id}`} name="reason" maxLength={200} placeholder={t("fields.reason")} className={`flex-1 ${input}`} />
                  <button className="rounded bg-neutral-800 px-4 py-2 font-semibold hover:bg-neutral-700">{t("ban")}</button>
                </form>
              </section>
            );
          }),
      )}
    </div>
  );
}
