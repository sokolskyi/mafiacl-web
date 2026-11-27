"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FUN_STORAGE_KEY, MatchApp } from "./MatchApp";
import { CustomSetup, DEFAULT_DRAFT, type SetupDraft } from "./CustomSetup";
import { CASPER_SETUP, normalizeSetup, type Action, type Setup } from "@/lib/match/engine";
import type { SeatInfo } from "@/lib/match/types";

type Saved = { log: Action[]; seats: SeatInfo[]; setup: Setup | null };
/** Последний состав своей игры — чтобы в следующий раз не набирать заново. */
const DRAFT_KEY = "mcl-fun-setup-draft";
const emptySeats = (n = 10): SeatInfo[] => Array.from({ length: n }, () => ({ profileId: null, name: "" }));

function load(): Saved {
  try {
    const raw = localStorage.getItem(FUN_STORAGE_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    const setup = v?.setup && normalizeSetup(v.setup) ? v.setup : null;
    const seats = setup?.seats ?? 10;
    if (v && Array.isArray(v.log) && Array.isArray(v.seats) && v.seats.length === seats) return { log: v.log, seats: v.seats, setup };
  } catch {
    // Повреждённая запись — начинаем с чистого бланка.
  }
  return { log: [], seats: emptySeats(), setup: null };
}

function loadDraft(): SetupDraft {
  try {
    const v = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as SetupDraft | null;
    if (v && typeof v.seats === "number" && Array.isArray(v.custom)) return v;
  } catch {}
  return DEFAULT_DRAFT;
}

/** Fun-игра: электронный бланк, который живёт только в этом браузере. Ничего не уходит на сервер. */
export function FunSheet({ nicknames, knownNames, backHref }: { nicknames: { id: string; nickname: string }[]; knownNames: string[]; backHref: string }) {
  const t = useTranslations("funGame");
  const [game, setGame] = useState<{ n: number; data: Saved } | null>(null);
  const [draft, setDraft] = useState<SetupDraft | null>(null);

  // Бланк читаем из браузера только после загрузки страницы.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setGame({ n: 0, data: load() }), []);

  if (!game) return <p className="text-neutral-500">…</p>;

  /** Новый бланк: классика (setup = null) или своя игра. Текущий бланк стирается после подтверждения. */
  function startNew(setup: Setup | null) {
    if (!game) return false;
    if (game.data.log.length && !confirm(t("newConfirm"))) return false;
    const data: Saved = { log: [], seats: emptySeats(setup?.seats ?? 10), setup };
    try {
      if (setup) localStorage.setItem(FUN_STORAGE_KEY, JSON.stringify(data));
      else localStorage.removeItem(FUN_STORAGE_KEY);
    } catch {}
    setGame({ n: game.n + 1, data });
    return true;
  }

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-xl flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            if (startNew(CASPER_SETUP)) setDraft(null);
          }}
          className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          {t("casperGame")}
        </button>
        <button
          type="button"
          onClick={() => setDraft(loadDraft())}
          aria-expanded={draft !== null}
          className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          {t("customGame")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (startNew(null)) setDraft(null);
          }}
          className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          {t("newGame")}
        </button>
      </div>
      {draft ? (
        <CustomSetup
          initial={draft}
          onCancel={() => setDraft(null)}
          onStart={(setup, d) => {
            try {
              localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
            } catch {}
            if (startNew(setup)) setDraft(null);
          }}
        />
      ) : (
        <MatchApp
          key={game.n}
          fun
          setup={game.data.setup}
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
      )}
    </>
  );
}
