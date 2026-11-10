"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Seat = { seat: number; name: string; avatar: string | null; fouls: number; out: string | null; role: string | null };
type Data = {
  club?: string;
  match: null | { number: number; table: number; phase: string; round: number; result: string | null; nominations: number[]; seats: Seat[] };
};

const T = {
  ru: { table: "Стол", game: "Игра", nominated: "Выставлены", night0: "Нулевая ночь", day: "День", night: "Ночь", civilians: "Победа мирных", mafia: "Победа мафии", draw: "Ничья" },
  cs: { table: "Stůl", game: "Hra", nominated: "Nominovaní", night0: "Nultá noc", day: "Den", night: "Noc", civilians: "Výhra civilistů", mafia: "Výhra mafie", draw: "Remíza" },
  uk: { table: "Стіл", game: "Гра", nominated: "Виставлені", night0: "Нульова ніч", day: "День", night: "Ніч", civilians: "Перемога мирних", mafia: "Перемога мафії", draw: "Нічия" },
  en: { table: "Table", game: "Game", nominated: "Nominated", night0: "Night zero", day: "Day", night: "Night", civilians: "Civilians win", mafia: "Mafia wins", draw: "Draw" },
};
const ROLE: Record<string, { icon: string; cls: string }> = {
  civilian: { icon: "●", cls: "bg-red-700" },
  sheriff: { icon: "★", cls: "bg-yellow-500 text-black" },
  mafia: { icon: "▲", cls: "bg-neutral-900" },
  don: { icon: "♛", cls: "bg-neutral-900" },
};

/** Слой для OBS: опрос раз в 2 секунды. ?lang=cs|ru|uk|en */
export function Overlay() {
  const { club, table } = useParams<{ club: string; table: string }>();
  const lang = (useSearchParams().get("lang") ?? "ru") as keyof typeof T;
  const t = T[lang] ?? T.ru;
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/stream/${club}/${table}`, { cache: "no-store" });
        const j = (await r.json()) as Data;
        if (alive) setData(j);
      } catch {}
    };
    load();
    const h = setInterval(load, 2000);
    return () => {
      alive = false;
      clearInterval(h);
    };
  }, [club, table]);

  const m = data?.match;
  if (!m) return null;
  const phase =
    m.phase === "night0" ? t.night0
    : m.phase === "day" ? `${t.day} ${m.round}`
    : m.phase === "night" ? `${t.night} ${m.round}`
    : m.result ? t[m.result as "civilians" | "mafia" | "draw"] : "";

  return (
    <div className="relative h-dvh w-dvw p-4 font-sans">
      <div className="flex flex-col items-start gap-2">
        <div className="flex overflow-hidden rounded-lg border-2 border-neutral-800 text-lg font-bold shadow">
          <span className="bg-neutral-800 px-3 py-1">{t.table} {m.table}</span>
          <span className="bg-white px-3 py-1 text-black">{t.game} {m.number}</span>
          <span className="bg-red-700 px-3 py-1">{phase}</span>
        </div>
        {m.nominations.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border-2 border-neutral-800 bg-neutral-800 px-3 py-1 text-lg font-bold">
            {t.nominated}
            {m.nominations.map((n) => (
              <span key={n} className="rounded bg-red-700 px-2">{n}</span>
            ))}
          </div>
        )}
      </div>

      <div className="absolute inset-x-4 bottom-4 grid grid-cols-10 gap-2">
        {m.seats.map((s) => (
          <div
            key={s.seat}
            className={`relative overflow-hidden rounded-lg border-2 ${m.nominations.includes(s.seat) ? "border-red-500" : "border-neutral-800"} bg-neutral-900 ${s.out ? "opacity-40 grayscale" : ""}`}
          >
            <div className="aspect-[4/5] w-full bg-neutral-800">
              {s.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-black text-neutral-600">{s.seat}</div>
              )}
            </div>
            {s.role && (
              <span className={`absolute right-1 top-1 rounded px-1.5 text-sm font-bold ${ROLE[s.role]?.cls}`}>{ROLE[s.role]?.icon}</span>
            )}
            {s.fouls > 0 && !s.out && (
              <span className="absolute bottom-9 right-1 rounded bg-red-600 px-1.5 text-sm font-black">{"!".repeat(Math.min(s.fouls, 4))}</span>
            )}
            <div className="flex items-center gap-1 bg-red-800 px-1.5 py-1 text-sm font-bold">
              <span>{s.seat}</span>
              <span className="truncate">{s.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
