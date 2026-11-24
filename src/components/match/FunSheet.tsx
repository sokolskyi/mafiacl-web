"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FUN_STORAGE_KEY, MatchApp } from "./MatchApp";
import type { Action } from "@/lib/match/engine";
import type { SeatInfo } from "@/lib/match/types";

type Saved = { log: Action[]; seats: SeatInfo[] };
const emptySeats = (): SeatInfo[] => Array.from({ length: 10 }, () => ({ profileId: null, name: "" }));

function load(): Saved {
  try {
    const raw = localStorage.getItem(FUN_STORAGE_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (v && Array.isArray(v.log) && Array.isArray(v.seats) && v.seats.length === 10) return { log: v.log, seats: v.seats };
  } catch {
    // Повреждённая запись — начинаем с чистого бланка.
  }
  return { log: [], seats: emptySeats() };
}

/** Fun-игра: электронный бланк, который живёт только в этом браузере. Ничего не уходит на сервер. */
export function FunSheet({ nicknames, knownNames, backHref }: { nicknames: { id: string; nickname: string }[]; knownNames: string[]; backHref: string }) {
  const t = useTranslations("funGame");
  const [game, setGame] = useState<{ n: number; data: Saved } | null>(null);

  // Бланк читаем из браузера только после загрузки страницы.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setGame({ n: 0, data: load() }), []);

  if (!game) return <p className="text-neutral-500">…</p>;
  return (
    <>
      <div className="mx-auto mb-4 flex max-w-xl justify-end">
        <button
          type="button"
          onClick={() => {
            if (!game.data.log.length || confirm(t("newConfirm"))) {
              try {
                localStorage.removeItem(FUN_STORAGE_KEY);
              } catch {}
              setGame({ n: game.n + 1, data: { log: [], seats: emptySeats() } });
            }
          }}
          className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          {t("newGame")}
        </button>
      </div>
      <MatchApp
        key={game.n}
        fun
        id={0}
        number={0}
        tableNo={1}
        status="live"
        initialVersion={0}
        initialLog={game.data.log}
        initialSeats={game.data.seats}
        initialShowRoles={false}
        initialRated={false}
        initialAdjustments={{}}
        nicknames={nicknames}
        knownNames={knownNames}
        overlayUrl=""
        backHref={backHref}
      />
    </>
  );
}
