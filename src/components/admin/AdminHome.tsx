import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { gameTitle } from "@/lib/games";
import { createGame } from "@/lib/admin/actions";
import { getAdminGames, getStaffContext } from "@/lib/admin/queries";
import { isoToLocalInput } from "@/lib/admin/time";

/** Читает сессию — только внутри <Suspense>. */
export async function AdminHome({ locale, error }: { locale: Locale; error?: string }) {
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
      {error && <p role="alert" className="text-red-400">{t(`errors.${error === "invalid" ? "invalid" : "save"}`)}</p>}

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
    </div>
  );
}
