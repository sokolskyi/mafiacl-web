import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { gameTitle, type UpcomingGame } from "@/lib/games";
import { joinGame, leaveGame } from "@/lib/games-actions";
import { TicketStrip, type StripDay, type StripSeries } from "./TicketStrip";

export type MyStatus = "queued" | "confirmed" | "waitlist";

const TABLE = 10;
const DAY = 86_400_000;

/** Дата игры в часовом поясе клуба: yyyy-mm-dd. */
function dayKey(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Серия игры — для фильтра и цвета: регулярное расписание или разовая игра. */
const seriesOf = (g: UpcomingGame) => (g.scheduleId !== null ? `s${g.scheduleId}` : `k-${g.kind}`);
/** Игры «по столам» (вторник: 10 → 20) — кремовые, остальные — красные. */
const toneOf = (g: UpcomingGame): "red" | "cream" => (g.tableSize && g.maxCapacity ? "cream" : "red");

type Seat = { on: boolean; dashed: boolean; pending: boolean };
type SeatRow = { label: string | null; pending: boolean; seats: Seat[] };

/**
 * Места на билете.
 * Игра по столам (table_size + max_capacity): ряд на каждый стол; следующий стол бледный, пока не записалось на него.
 * Одна игра на стол больше 10 мест (воскресенье, 12): 10 мест за столом + места «по очереди» пунктиром.
 */
function seatRows(g: UpcomingGame, taken: number, t: (key: string, v?: Record<string, string | number>) => string): SeatRow[] {
  if (g.tableSize && g.maxCapacity && g.maxCapacity > g.tableSize) {
    const size = g.tableSize;
    const tables = Math.ceil(g.maxCapacity / size);
    return Array.from({ length: tables }, (_, i) => {
      const need = size * (i + 1);
      const open = i === 0 || taken >= need || g.capacity >= need;
      const filled = Math.min(Math.max(taken - i * size, 0), size);
      return {
        label: i === 0 ? t("table", { n: 1 }) : open ? t("table", { n: i + 1 }) : t("tablePending", { n: i + 1, need, left: need - taken }),
        pending: !open,
        seats: Array.from({ length: size }, (_, s) => ({ on: s < filled, dashed: !open, pending: !open })),
      };
    });
  }
  const total = g.capacity;
  const extra = Math.max(total - TABLE, 0);
  let label: string | null = null;
  if (extra > 0) {
    const games = total % extra === 0 ? total / extra : null;
    label = games ? t("rotation", { players: total, games, plays: games - 1 }) : t("rotationShort", { players: total });
  }
  return [{ label, pending: false, seats: Array.from({ length: total }, (_, s) => ({ on: s < taken, dashed: s >= TABLE, pending: false })) }];
}

/**
 * Расписание — лента билетов. Без `me` — статичная версия (мгновенно из кеша, без кнопок);
 * с `me` — та же разметка плюс кнопки записи для конкретного посетителя.
 */
export async function GameList({
  games,
  locale,
  me,
}: {
  games: UpcomingGame[];
  locale: Locale;
  me?: { signedIn: boolean; signups: Map<number, MyStatus> };
}) {
  const t = await getTranslations({ locale, namespace: "games" });
  if (games.length === 0) return <p className="mt-10 text-neutral-400">{t("empty")}</p>;

  const tz = games[0].timezone;
  const fmt = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat(locale, { timeZone: tz, ...o }).format(d);

  // Серии для фильтра: название без номера + день недели (по первой игре серии).
  const series: StripSeries[] = [];
  for (const g of games) {
    const id = seriesOf(g);
    if (series.some((s) => s.id === id)) continue;
    const template = g.title?.[locale] ?? g.title?.cs;
    const name = template ? gameTitle(template, null, g.numberStyle) : t(`kind.${g.kind}`);
    series.push({ id, label: g.scheduleId !== null ? `${name} · ${fmt({ weekday: "short" }, new Date(g.startsAt))}` : name });
  }

  // Полоска дней: три недели с понедельника недели первой игры.
  const byDay = new Map<string, UpcomingGame>();
  for (const g of games) {
    const k = dayKey(g.startsAt, tz);
    if (!byDay.has(k)) byDay.set(k, g);
  }
  const firstKey = dayKey(games[0].startsAt, tz);
  const first = new Date(`${firstKey}T12:00:00Z`);
  const monday = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * DAY);
  const days: StripDay[] = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(monday.getTime() + i * DAY);
    const key = d.toISOString().slice(0, 10);
    const g = byDay.get(key) ?? null;
    const utc = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...o }).format(d);
    const template = g ? (g.title?.[locale] ?? g.title?.cs) : null;
    return {
      key,
      weekday: utc({ weekday: "short" }),
      day: d.getUTCDate(),
      month: i === 0 || d.getUTCDate() === 1 ? utc({ month: "short" }) : null,
      gameId: g?.id ?? null,
      series: g ? seriesOf(g) : null,
      tone: g ? toneOf(g) : null,
      aria: g ? `${utc({ day: "numeric", month: "long" })}: ${template ? gameTitle(template, g.number, g.numberStyle) : t(`kind.${g.kind}`)}` : "",
    };
  });

  return (
    <TicketStrip series={series} days={days}>
      {games.map((g, index) => {
        const start = new Date(g.startsAt);
        const tone = toneOf(g);
        const red = tone === "red";
        const template = g.title?.[locale] ?? g.title?.cs;
        const title = template ? gameTitle(template, g.number, g.numberStyle) : t(`kind.${g.kind}`);
        const late = g.lateAfter ? fmt({ hour: "2-digit", minute: "2-digit" }, new Date(g.lateAfter)) : null;
        const queueOpen = g.queueUntil !== null;
        const taken = g.confirmed + g.queued;
        const total = g.tableSize && g.maxCapacity ? g.maxCapacity : g.capacity;
        const free = Math.max(g.capacity - g.confirmed, 0);
        // Окно закрывается в полночь — пишем как в клубе: «воскресенье 24:00».
        const queueEnd = g.queueUntil ? `${fmt({ weekday: "long" }, new Date(new Date(g.queueUntil).getTime() - 60_000))} 24:00` : null;
        const mine = me?.signups.get(g.id);
        const rows = seatRows(g, taken, t);

        return (
          <article
            key={g.id}
            id={`game-${g.id}`}
            data-series={seriesOf(g)}
            tabIndex={-1}
            aria-label={`${index + 1} / ${games.length}: ${title}`}
            className={`flex shrink-0 snap-start flex-col drop-shadow-[0_14px_24px_rgba(0,0,0,0.35)] outline-none md:w-[470px] md:flex-row md:transition-transform motion-safe:md:hover:-translate-y-1.5 ${index % 2 ? "md:rotate-[0.6deg]" : "md:-rotate-[0.6deg]"} md:hover:rotate-0`}
          >
            {/* Корешок: дата и время крупно. Телефон — шапка билета, компьютер — колонка слева. */}
            <div
              className={`flex items-center gap-3 rounded-t-2xl px-5 py-4 md:w-[132px] md:shrink-0 md:flex-col md:items-start md:gap-1.5 md:rounded-l-2xl md:rounded-tr-none md:py-6 ${red ? "bg-red-600 text-white" : "bg-white text-neutral-950"}`}
            >
              <time dateTime={g.startsAt} className="contents">
                <span className="font-display text-6xl font-black leading-[0.8] md:order-2 md:text-8xl">{fmt({ day: "numeric" }, start)}</span>
                <span className="flex flex-col leading-tight md:order-1 md:contents">
                  <span className="font-display text-xl font-extrabold uppercase md:order-3">{fmt({ month: "short" }, start)}</span>
                  <span className="text-xs uppercase tracking-wider opacity-85 md:order-1">{fmt({ weekday: "long" }, start)}</span>
                </span>
                <span className="ml-auto font-display text-4xl font-black leading-none md:order-4 md:ml-0 md:mt-auto">{fmt({ hour: "2-digit", minute: "2-digit" }, start)}</span>
              </time>
            </div>
            {/* Линия отрыва с вырезами. */}
            <div aria-hidden="true" className="relative mx-3 border-t-2 border-dashed border-neutral-950/35 md:mx-0 md:my-3 md:border-l-2 md:border-t-0">
              <span className="absolute -left-6 -top-3 size-[22px] rounded-full bg-neutral-950 md:-left-[13px] md:-top-6" />
              <span className="absolute -right-6 -top-3 size-[22px] rounded-full bg-neutral-950 md:-bottom-6 md:-left-[13px] md:right-auto md:top-auto" />
            </div>
            <div className="flex flex-1 flex-col gap-2.5 rounded-b-2xl bg-neutral-900 p-5 md:rounded-l-none md:rounded-r-2xl md:p-6">
              <h2 className="font-display text-3xl font-black uppercase leading-[0.95] md:text-4xl">{title}</h2>
              {late && <p className="text-xs text-gold-400">{t("lateFrom", { time: late })}</p>}
              {g.venue && (
                <p className="text-sm leading-snug">
                  {g.venue.mapsUrl ? (
                    <a href={g.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                      {g.venue.name}
                    </a>
                  ) : (
                    g.venue.name
                  )}
                  {g.venue.address && <span className="block text-neutral-400">{g.venue.address}</span>}
                </p>
              )}
              <div role="img" aria-label={t("seatsAria", { taken, total })} className="mt-1 flex flex-col gap-2">
                {rows.map((r, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${r.pending ? "opacity-55" : ""}`}>
                    {r.label && <span className="text-[11px] text-neutral-400">{r.label}</span>}
                    <span className="flex flex-wrap items-center gap-[5px] md:gap-1">
                      {r.seats.map((s, j) => (
                        <span
                          key={j}
                          className={`size-5 rounded-t-md rounded-b-sm md:size-[18px] ${j === TABLE && !g.tableSize ? "ml-2.5 md:ml-2" : ""} ${
                            s.on ? `${red ? "bg-red-600" : "bg-white"} ${s.pending ? "opacity-50" : ""}` : `border-2 border-neutral-500 ${s.dashed ? "border-dashed" : ""}`
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs">
                {queueOpen ? (
                  <span className="text-sky-300">{t("queueOpen", { count: g.queued, until: queueEnd ?? "" })}</span>
                ) : free > 0 ? (
                  <span className="text-green-400">{t("seats", { free, capacity: g.capacity })}</span>
                ) : (
                  <span className="text-gold-400">{t("full", { waitlist: g.waitlist })}</span>
                )}
              </p>
              {queueOpen && <p className="text-[11px] text-neutral-400">{t("queueHint")}</p>}
              {(g.infoUrl || g.streamUrl) && (
                <p className="flex flex-wrap gap-x-4 text-sm">
                  {g.infoUrl && (
                    <a href={g.infoUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                      {t("info")}
                    </a>
                  )}
                  {g.streamUrl && (
                    <a href={g.streamUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 underline">
                      {t("stream")}
                    </a>
                  )}
                </p>
              )}

              <div className="mt-auto flex items-center gap-3 pt-3">
                {g.priceCzk !== null && (
                  <span className="whitespace-nowrap text-sm font-bold">
                    {new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(g.priceCzk)}
                  </span>
                )}
                {!me ? (
                  <div className="h-12 flex-1" aria-hidden="true" />
                ) : mine ? (
                  <form action={leaveGame} className="flex flex-1 items-center justify-end gap-3">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="gameId" value={g.id} />
                    <span
                      className={
                        mine === "confirmed" ? "font-semibold text-green-400" : mine === "queued" ? "font-semibold text-sky-300" : "font-semibold text-gold-400"
                      }
                    >
                      {mine === "confirmed" ? t("youAreIn") : mine === "queued" ? t("youAreQueued") : t("youAreWaitlisted")}
                    </span>
                    <button type="submit" className="min-h-11 text-sm text-neutral-400 underline hover:text-white">
                      {t("cancel")}
                    </button>
                  </form>
                ) : (
                  <form action={joinGame} className="flex-1">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="gameId" value={g.id} />
                    <button type="submit" className="min-h-12 w-full rounded-full bg-red-600 px-6 font-bold text-white hover:bg-red-500">
                      {!me.signedIn ? t("signInToJoin") : queueOpen || free > 0 ? t("join") : t("joinWaitlist")}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </TicketStrip>
  );
}
