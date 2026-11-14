"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { DirectoryPlayer } from "@/lib/playersDirectory";

type Sort = "alpha" | "games" | "medals" | "place";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Список всех игроков клуба: поиск по нику и сортировка (по алфавиту или как рейтинг). */
export function PlayersDirectory({
  players,
  locale,
  labels,
}: {
  players: DirectoryPlayer[];
  locale: string;
  labels: {
    search: string; sort: string; alpha: string; games: string; medals: string; place: string;
    player: string; gamesCol: string; seasons: string; bestPlace: string; medalsCol: string; minis: string;
    notRegistered: string; nothing: string; shown: string;
  };
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("alpha");
  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: "base", numeric: true }), [locale]);
  const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ё/g, "е").replace(/[іi]/g, "i");

  const list = useMemo(() => {
    const needle = fold(q.trim());
    const filtered = needle ? players.filter((p) => fold(p.nickname).includes(needle)) : players;
    const medalScore = (p: DirectoryPlayer) => p.medals[0] * 10000 + p.medals[1] * 100 + p.medals[2];
    const sorted = [...filtered];
    if (sort === "alpha") sorted.sort((a, b) => collator.compare(a.nickname, b.nickname));
    if (sort === "games") sorted.sort((a, b) => b.games - a.games || collator.compare(a.nickname, b.nickname));
    if (sort === "medals") sorted.sort((a, b) => medalScore(b) - medalScore(a) || b.minis - a.minis || b.games - a.games);
    if (sort === "place")
      sorted.sort((a, b) => (a.bestPlace ?? 9999) - (b.bestPlace ?? 9999) || b.games - a.games || collator.compare(a.nickname, b.nickname));
    return sorted;
  }, [players, q, sort, collator]);

  // Буква-разделитель только при сортировке по алфавиту.
  const letter = (s: string) => s.slice(0, 1).toUpperCase();

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="block text-neutral-400">{labels.search}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1 min-h-11 w-64 rounded border border-white/30 bg-neutral-950 px-3"
            autoComplete="off"
          />
        </label>
        <div role="group" aria-label={labels.sort} className="flex flex-wrap gap-2 text-sm">
          {(["alpha", "games", "medals", "place"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={`min-h-11 rounded-full border px-4 font-semibold ${sort === s ? "border-white bg-white text-black" : "border-white/40 hover:bg-white/10"}`}
            >
              {labels[s]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-neutral-400" aria-live="polite">{labels.shown.replace("{n}", String(list.length))}</p>

      {list.length === 0 ? (
        <p className="mt-6 text-neutral-400">{labels.nothing}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-neutral-400">
              <tr>
                {sort !== "alpha" && <th className="w-10 py-2 font-normal">#</th>}
                <th className="py-2 font-normal">{labels.player}</th>
                <th className="text-right font-normal">{labels.gamesCol}</th>
                <th className="text-right font-normal">{labels.seasons}</th>
                <th className="text-right font-normal">{labels.bestPlace}</th>
                <th className="text-right font-normal">{labels.medalsCol}</th>
                <th className="text-right font-normal">{labels.minis}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => {
                const newLetter = sort === "alpha" && (i === 0 || letter(list[i - 1].nickname) !== letter(p.nickname));
                return (
                  <tr key={p.nickname} className={newLetter ? "border-t-2 border-white/30" : "border-t border-white/10"}>
                    {sort !== "alpha" && <td className="py-2 font-mono text-neutral-400">{i + 1}</td>}
                    <td className="py-2">
                      <Link href={{ pathname: "/players/[nick]", params: { nick: p.nickname } }} className="inline-flex items-center gap-2 font-semibold hover:text-red-400">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-xs">{letter(p.nickname)}</span>
                        )}
                        {p.nickname}
                      </Link>
                    </td>
                    <td className="text-right font-mono">{p.games || "—"}</td>
                    <td className="text-right font-mono">{p.seasons || "—"}</td>
                    <td className="text-right font-mono">{p.bestPlace ? `№${p.bestPlace}` : "—"}</td>
                    <td className="whitespace-nowrap text-right">
                      {p.medals.some(Boolean)
                        ? p.medals.map((n, k) => (n ? <span key={k} className="ml-2">{MEDALS[k]}{n > 1 ? <span className="text-xs">×{n}</span> : null}</span> : null))
                        : "—"}
                    </td>
                    <td className="text-right font-mono">{p.minis || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
