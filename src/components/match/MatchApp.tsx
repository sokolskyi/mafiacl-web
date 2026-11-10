"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  FOUL_LIMIT,
  LINEUP,
  MatchError,
  alive,
  bestMoveHits,
  isBlack,
  replay,
  scores,
  suggestedResult,
  tryApply,
  type Action,
  type MatchState,
  type Result,
  type Role,
} from "@/lib/match/engine";
import { finishMatch, reopenMatch, saveMatch, setShowRoles } from "@/lib/match/actions";
import type { SeatInfo } from "@/lib/match/types";

const ROLE_ORDER: Role[] = ["civilian", "mafia", "don", "sheriff"];
const ROLE_ICON: Record<Role, string> = { civilian: "●", mafia: "▲", don: "♛", sheriff: "★" };
const ROLE_CLASS: Record<Role, string> = {
  civilian: "text-red-400",
  sheriff: "text-yellow-300",
  mafia: "text-neutral-100",
  don: "text-neutral-100",
};

type NightMode = "shot" | "don" | "sheriff" | "best";

/** Время хода — вызывается только из обработчиков нажатий. */
function stamp() {
  return Date.now();
}

export type MatchAppProps = {
  id: number;
  number: number;
  tableNo: number;
  status: "live" | "finished" | "void";
  initialVersion: number;
  initialLog: Action[];
  initialSeats: SeatInfo[];
  initialShowRoles: boolean;
  initialRated: boolean;
  initialAdjustments: Record<number, { extra: number; penalty: number }>;
  nicknames: { id: string; nickname: string }[];
  overlayUrl: string;
  backHref: string;
};

export function MatchApp(p: MatchAppProps) {
  const t = useTranslations("match");
  const [log, setLog] = useState<Action[]>(p.initialLog);
  const [seats, setSeats] = useState<SeatInfo[]>(p.initialSeats);
  const [status, setStatus] = useState(p.status);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(0);
  const [modeChoice, setModeChoice] = useState<{ round: number; mode: NightMode } | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  // Поимённое голосование: за кого (номер) → кто поднял руку. Живёт до записи голосования.
  const [ballot, setBallot] = useState<{ key: string; target: number | null; voters: Record<number, number[]> }>({ key: "", target: null, voters: {} });
  const [showRoles, setShowRolesState] = useState(p.initialShowRoles);
  const [rated, setRated] = useState(p.initialRated);
  const [adj, setAdj] = useState<Record<number, { extra: string; penalty: string }>>(() =>
    Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        i + 1,
        { extra: String(p.initialAdjustments[i + 1]?.extra ?? 0), penalty: String(p.initialAdjustments[i + 1]?.penalty ?? 0) },
      ]),
    ),
  );
  const version = useRef(p.initialVersion);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const state: MatchState = useMemo(() => {
    try {
      return replay(log);
    } catch {
      return replay([]);
    }
  }, [log]);
  const locked = status !== "live";
  const nameOf = (seat: number) => seats[seat - 1]?.name || `#${seat}`;

  // --- сохранение: по очереди, с защитой от записи с двух устройств ---
  function persist(nextLog: Action[], nextSeats?: SeatInfo[]) {
    setSaving((n) => n + 1);
    queue.current = queue.current.then(async () => {
      try {
        const r = await saveMatch({ id: p.id, version: version.current, log: nextLog, seats: nextSeats });
        if (r.ok) {
          version.current = r.version;
        } else if (r.reason === "conflict") {
          version.current = r.version;
          setLog(r.log);
          setSeats(r.seats);
          setNotice(t("conflict"));
        } else if (r.reason === "closed") {
          setNotice(t("closed"));
        } else {
          setNotice(t("saveError"));
        }
      } catch {
        setNotice(t("offline"));
      } finally {
        setSaving((n) => n - 1);
      }
    });
  }

  function dispatch(a: Action) {
    if (locked) return;
    try {
      tryApply(state, a);
    } catch (e) {
      setNotice(t(`err.${e instanceof MatchError ? e.code : "bad"}`));
      return;
    }
    setNotice(null);
    const next = [...log, { ...a, at: stamp() }];
    setLog(next);
    // Начало игры фиксирует и рассадку.
    persist(next, a.t === "start" ? seats : undefined);
  }

  function undo() {
    if (locked || !log.length) return;
    // Шаги, записанные одним нажатием (голосование + выбывшие), отменяются вместе.
    const lastAt = log[log.length - 1].at;
    let cut = log.length - 1;
    while (lastAt !== undefined && cut > 0 && log[cut - 1].at === lastAt) cut--;
    const next = log.slice(0, cut);
    setLog(next);
    setNotice(null);
    persist(next);
  }

  function setSeatName(i: number, name: string) {
    const match = p.nicknames.find((n) => n.nickname.toLowerCase() === name.trim().toLowerCase());
    const next = seats.map((s, j) => (j === i ? { name, profileId: match?.id ?? null } : s));
    setSeats(next);
  }
  function saveSeats() {
    persist(log, seats);
  }

  // --- таймер речи (только на устройстве ведущего) ---
  const [timer, setTimer] = useState<{ left: number; running: boolean }>({ left: 60, running: false });
  useEffect(() => {
    if (!timer.running) return;
    const h = setInterval(() => {
      setTimer((x) => {
        if (x.left <= 1) {
          try {
            navigator.vibrate?.(400);
          } catch {}
          return { left: 0, running: false };
        }
        return { ...x, left: x.left - 1 };
      });
    }, 1000);
    return () => clearInterval(h);
  }, [timer.running]);

  // Ночь: после выстрела — проверки, потом лучший ход; ведущий может переключить вручную.
  const nightDone = (m: NightMode) =>
    m === "shot" ? state.shots.some((x) => x.round === state.round)
    : m === "don" ? state.donChecks.some((x) => x.round === state.round)
    : m === "sheriff" ? state.sheriffChecks.some((x) => x.round === state.round)
    : state.bestMove !== null || state.firstKilled === null;
  const autoMode = (["shot", "don", "sheriff", "best"] as NightMode[]).find((m) => !nightDone(m)) ?? "shot";
  const nightMode: NightMode = modeChoice && modeChoice.round === state.round && !nightDone(modeChoice.mode) ? modeChoice.mode : autoMode;
  const setNightMode = (mode: NightMode) => setModeChoice({ round: state.round, mode });

  // Бюллетень сбрасывается при смене дня и после каждой записи голосования.
  const ballotKey = `${state.phase}-${state.round}-${state.votes.length}`;
  const cur = ballot.key === ballotKey ? ballot : { key: ballotKey, target: null, voters: {} as Record<number, number[]> };

  const suggestion = suggestedResult(state);
  const roleCount = (r: Role) => Array.from({ length: 10 }, (_, i) => state.roles[i + 1] ?? "civilian").filter((x) => x === r).length;
  const phaseLabel =
    state.phase === "night0" ? t("night0")
    : state.phase === "day" ? t("day", { n: state.round })
    : state.phase === "night" ? t("night", { n: state.round })
    : t("finished");

  function seatTap(seat: number) {
    if (locked) return;
    if (state.phase === "night0") {
      const cur = state.roles[seat] ?? "civilian";
      const next = ROLE_ORDER[(ROLE_ORDER.indexOf(cur) + 1) % ROLE_ORDER.length];
      dispatch({ t: "role", seat, role: next });
    } else if (state.phase === "day") {
      if (state.out[seat]) return;
      dispatch(state.nominations.includes(seat) ? { t: "unnominate", seat } : { t: "nominate", seat });
    } else if (state.phase === "night") {
      if (nightMode === "shot") dispatch({ t: "shot", seat });
      else if (nightMode === "don") dispatch({ t: "donCheck", seat });
      else if (nightMode === "sheriff") dispatch({ t: "sheriffCheck", seat });
      else if (nightMode === "best" && seat !== state.firstKilled) {
        setPicks((x) => (x.includes(seat) ? x.filter((y) => y !== seat) : x.length < 3 ? [...x, seat] : x));
      }
    }
  }

  // --- голосование ---
  const nominees = state.nominations;
  const activeTarget = cur.target !== null && nominees.includes(cur.target) ? cur.target : nominees[0] ?? null;
  const votedFor = (voter: number) => Number(Object.entries(cur.voters).find(([, l]) => l.includes(voter))?.[0] ?? 0);
  const tally = nominees.map((s) => ({ seat: s, votes: cur.voters[s]?.length ?? 0 }));
  const maxVotes = Math.max(0, ...tally.map((x) => x.votes));
  const leaders = tally.filter((x) => x.votes === maxVotes && maxVotes > 0).map((x) => x.seat);
  const unassigned = alive(state).filter((v) => !votedFor(v));

  function toggleVoter(voter: number) {
    if (activeTarget === null) return;
    const owner = votedFor(voter);
    if (owner && owner !== activeTarget) return; // уже проголосовал за другого
    const list = cur.voters[activeTarget] ?? [];
    const nextList = list.includes(voter) ? list.filter((x) => x !== voter) : [...list, voter].sort((a, b) => a - b);
    setBallot({ ...cur, target: activeTarget, voters: { ...cur.voters, [activeTarget]: nextList } });
  }
  function restToLast() {
    const last = nominees[nominees.length - 1];
    if (last === undefined) return;
    const list = [...(cur.voters[last] ?? []), ...unassigned].sort((a, b) => a - b);
    setBallot({ ...cur, target: last, voters: { ...cur.voters, [last]: list } });
  }

  /** Записать голосование (если отмечали руки) и, если нужно, выбывших. */
  function commitVote(seatsOut: number[]) {
    const hasVotes = Object.values(cur.voters).some((l) => l.length);
    const steps: Action[] = [];
    const at = stamp();
    if (hasVotes) {
      const voters = Object.fromEntries(nominees.map((s) => [String(s), cur.voters[s] ?? []]));
      const counts = Object.fromEntries(nominees.map((s) => [String(s), voters[String(s)].length]));
      steps.push({ t: "vote", counts, voters, at });
    }
    if (seatsOut.length) steps.push({ t: "eliminate", seats: seatsOut, reason: "voted", at });
    if (!steps.length) return;
    try {
      steps.reduce((st, a) => tryApply(st, a), state);
    } catch (e) {
      setNotice(t(`err.${e instanceof MatchError ? e.code : "bad"}`));
      return;
    }
    setNotice(null);
    const next = [...log, ...steps];
    setLog(next);
    persist(next);
  }

  const btn = "rounded px-3 py-2 text-sm font-semibold disabled:opacity-40";
  const btnMain = `${btn} bg-red-600 hover:bg-red-500`;
  const btnSoft = `${btn} bg-white/10 hover:bg-white/20`;

  const lastShot = state.shots.find((x) => x.round === state.round);
  const lastDon = state.donChecks.find((x) => x.round === state.round);
  const lastSheriff = state.sheriffChecks.find((x) => x.round === state.round);

  // --- итог ---
  const adjNum = Object.fromEntries(
    Object.entries(adj).map(([k, v]) => [Number(k), { extra: Number(v.extra) || 0, penalty: Number(v.penalty) || 0 }]),
  );
  const finalScores = state.phase === "finished" ? scores(state, adjNum) : [];
  const [finishing, setFinishing] = useState(false);
  async function saveResult() {
    setFinishing(true);
    await queue.current;
    const r = await finishMatch({ id: p.id, version: version.current, rated, adjustments: adjNum });
    setFinishing(false);
    if (r.ok) {
      setStatus("finished");
      version.current += 1;
      setNotice(t("savedResult"));
    } else setNotice(t(`finishErr.${r.code ?? "save"}`));
  }
  async function reopen() {
    const r = await reopenMatch({ id: p.id });
    if (r.ok) {
      setStatus("live");
      version.current += 1;
      setNotice(t("reopened"));
    }
  }

  return (
    <div className="mx-auto max-w-xl pb-24">
      {/* Шапка */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <a href={p.backHref} className="text-sm text-neutral-400 hover:text-white">←</a>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">{t("header", { number: p.number, table: p.tableNo })}</p>
            <p className="text-lg font-black">{phaseLabel}</p>
          </div>
          <span className="text-xs text-neutral-500" aria-live="polite">{saving > 0 ? t("saving") : t("saved")}</span>
          <button onClick={undo} disabled={locked || !log.length} className={btnSoft} aria-label={t("undo")}>↶ {t("undo")}</button>
        </div>
        {state.phase === "day" && (
          <div className="mt-3 flex items-center gap-2">
            <span className={`font-mono text-4xl font-black tabular-nums ${timer.left <= 10 ? "text-red-500" : ""}`}>
              {String(Math.floor(timer.left / 60)).padStart(1, "0")}:{String(timer.left % 60).padStart(2, "0")}
            </span>
            <button className={btnMain} onClick={() => setTimer((x) => ({ ...x, running: !x.running }))}>
              {timer.running ? t("pause") : t("go")}
            </button>
            <button className={btnSoft} onClick={() => setTimer({ left: 60, running: true })}>60</button>
            <button className={btnSoft} onClick={() => setTimer({ left: 30, running: true })}>30</button>
            <span className="ml-auto text-xs text-neutral-400">{t("opens", { seat: state.dayStarter })}</span>
          </div>
        )}
      </div>

      {notice && <p role="status" className="mt-3 rounded bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{notice}</p>}

      {/* Подсказки по фазе */}
      <p className="mt-3 text-sm text-neutral-400">
        {state.phase === "night0" && t("hintNight0")}
        {state.phase === "day" && t("hintDay")}
        {state.phase === "night" && t(`hint.${nightMode}`)}
      </p>

      {/* Стол */}
      <ol className="mt-3 divide-y divide-white/10 rounded border border-white/10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((seat) => {
          const role = state.roles[seat] ?? "civilian";
          const out = state.out[seat];
          const fouls = state.fouls[seat] ?? 0;
          const nominated = state.nominations.includes(seat);
          const picked = picks.includes(seat);
          return (
            <li key={seat} className={`flex items-center gap-2 px-2 py-2 ${out ? "opacity-40" : ""} ${nominated ? "bg-red-600/15" : ""} ${picked ? "bg-sky-500/15" : ""}`}>
              <span className="w-6 text-right font-mono text-sm text-neutral-400">{seat}</span>
              <button
                onClick={() => seatTap(seat)}
                aria-label={`${seat}. ${nameOf(seat)}`}
                disabled={locked || (state.phase !== "night0" && !!out && !(state.phase === "night" && nightMode !== "shot"))}
                className="flex min-h-11 flex-1 items-center gap-2 text-left"
              >
                <span className={`w-5 text-center text-lg ${ROLE_CLASS[role]}`} title={t(`role.${role}`)}>{ROLE_ICON[role]}</span>
                <span className="truncate font-semibold">{nameOf(seat)}</span>
                {out && <span className="text-xs text-neutral-400">{t(`out.${out.reason}`, { n: out.round })}</span>}
                {nominated && <span className="rounded bg-red-600 px-1.5 text-xs">{t("nominated")}</span>}
                {state.firstKilled === seat && state.bestMove && (
                  <span className="text-xs text-sky-300">{t("bestMoveShort", { picks: state.bestMove.join(", ") })}</span>
                )}
              </button>
              {state.phase !== "night0" && state.phase !== "finished" && (
                <div className="flex items-center gap-1">
                  <button onClick={() => dispatch({ t: "unfoul", seat })} disabled={locked || fouls === 0} className="h-9 w-8 rounded bg-white/5 text-sm disabled:opacity-30" aria-label={t("unfoul", { seat })}>−</button>
                  <span className={`w-6 text-center font-mono text-sm ${fouls >= FOUL_LIMIT - 1 ? "text-red-400" : ""}`} aria-label={t("fouls", { n: fouls })}>{fouls}</span>
                  <button onClick={() => dispatch({ t: "foul", seat })} disabled={locked || !!out} className="h-9 w-8 rounded bg-white/10 text-sm font-bold disabled:opacity-30" aria-label={t("foul", { seat })}>!</button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Нулевая ночь: рассадка и роли */}
      {state.phase === "night0" && !locked && (
        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {(Object.keys(LINEUP) as Role[]).map((r) => (
              <span key={r} className={`rounded px-2 py-1 ${roleCount(r) === LINEUP[r] ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
                <span className={ROLE_CLASS[r]}>{ROLE_ICON[r]}</span> {t(`role.${r}`)} {roleCount(r)}/{LINEUP[r]}
              </span>
            ))}
          </div>
          <button className={`${btnMain} w-full py-3 text-base`} onClick={() => dispatch({ t: "start" })}>{t("startDay")}</button>

          <details className="rounded border border-white/10 p-3">
            <summary className="cursor-pointer font-semibold">{t("seating")}</summary>
            <datalist id="nicks">{p.nicknames.map((n) => <option key={n.id} value={n.nickname} />)}</datalist>
            <ol className="mt-3 space-y-2">
              {seats.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-6 text-right font-mono text-sm text-neutral-400">{i + 1}</span>
                  <input
                    list="nicks"
                    value={s.name}
                    onChange={(e) => setSeatName(i, e.target.value)}
                    maxLength={80}
                    aria-label={t("seatName", { seat: i + 1 })}
                    className="flex-1 rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500"
                  />
                  <span className="w-16 text-xs text-neutral-500">{s.profileId ? t("account") : s.name ? t("guest") : ""}</span>
                </li>
              ))}
            </ol>
            <button className={`${btnSoft} mt-3`} onClick={saveSeats}>{t("saveSeating")}</button>
          </details>
        </section>
      )}

      {/* День */}
      {state.phase === "day" && !locked && (
        <section className="mt-6 space-y-4">
          <h2 className="font-bold">{t("nominations")}</h2>
          {nominees.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("noNominations")}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("voteFor")}>
                {tally.map((x) => (
                  <button
                    key={x.seat}
                    role="tab"
                    aria-selected={activeTarget === x.seat}
                    onClick={() => setBallot({ ...cur, target: x.seat })}
                    className={`${btn} ${activeTarget === x.seat ? "bg-red-600" : "bg-white/10"}`}
                  >
                    {t("voteForSeat", { seat: x.seat })} · {x.votes}
                  </button>
                ))}
              </div>
              {activeTarget !== null && (
                <div className="rounded border border-white/10 p-3">
                  <p className="text-sm text-neutral-300">{t("whoVotes", { seat: activeTarget, name: nameOf(activeTarget) })}</p>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {alive(state).map((v) => {
                      const owner = votedFor(v);
                      const mine = owner === activeTarget;
                      return (
                        <button
                          key={v}
                          onClick={() => toggleVoter(v)}
                          disabled={!!owner && !mine}
                          aria-pressed={mine}
                          aria-label={owner && !mine ? t("votedForOther", { voter: v, seat: owner }) : t("voterSeat", { voter: v })}
                          className={`h-11 rounded font-mono text-lg font-bold ${mine ? "bg-red-600" : owner ? "bg-white/5 text-neutral-600" : "bg-white/10 hover:bg-white/20"}`}
                        >
                          {v}
                          {owner && !mine ? <span className="ml-0.5 text-[10px] align-top">→{owner}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">{t("notVoted", { n: unassigned.length })}</p>
                  {unassigned.length > 0 && nominees.length > 1 && (
                    <button className={`${btnSoft} mt-2`} onClick={restToLast}>
                      {t("restToLast", { seat: nominees[nominees.length - 1] })}
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {leaders.length === 1 && (
                  <button className={btnMain} onClick={() => commitVote(leaders)}>{t("outOneNamed", { seat: leaders[0] })}</button>
                )}
                {leaders.length > 1 && (
                  <>
                    <p className="w-full text-sm text-amber-300">{t("tie", { seats: leaders.join(", ") })}</p>
                    <button className={btnSoft} onClick={() => commitVote([])}>{t("revote")}</button>
                    <button className={btnMain} onClick={() => commitVote(leaders)}>{t("outAll", { seats: leaders.join(", ") })}</button>
                  </>
                )}
                <button className={btnSoft} onClick={() => commitVote([])} disabled={!Object.values(cur.voters).some((l) => l.length)}>
                  {t("nobodyOut")}
                </button>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-neutral-400">{t("manualOut")}</summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  {nominees.map((s) => (
                    <button key={s} className={btnSoft} onClick={() => commitVote([s])}>{t("outOneNamed", { seat: s })}</button>
                  ))}
                </div>
              </details>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={btnMain} onClick={() => dispatch({ t: "night" })}>{t("toNight")}</button>
          </div>
        </section>
      )}

      {/* Ночь */}
      {state.phase === "night" && !locked && (
        <section className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["shot", "don", "sheriff", ...(state.firstKilled !== null && state.bestMove === null ? (["best"] as const) : [])] as NightMode[]).map((m) => (
              <button key={m} onClick={() => setNightMode(m)} className={`${btn} ${nightMode === m ? "bg-red-600" : "bg-white/10"}`}>
                {t(`mode.${m}`)}
              </button>
            ))}
          </div>
          <ul className="space-y-1 text-sm text-neutral-300">
            <li>{t("mode.shot")}: {lastShot ? (lastShot.seat === null ? t("miss") : `${lastShot.seat}. ${nameOf(lastShot.seat)}`) : "—"}</li>
            <li>{t("mode.don")}: {lastDon ? `${lastDon.seat} — ${state.roles[lastDon.seat] === "sheriff" ? t("isSheriff") : t("notSheriff")}` : "—"}</li>
            <li>{t("mode.sheriff")}: {lastSheriff ? `${lastSheriff.seat} — ${isBlack(state.roles[lastSheriff.seat]) ? t("black") : t("red")}` : "—"}</li>
          </ul>
          {nightMode === "shot" && !lastShot && (
            <button className={btnSoft} onClick={() => dispatch({ t: "shot", seat: null })}>{t("miss")}</button>
          )}
          {nightMode === "best" && (
            <div className="rounded border border-sky-500/30 p-3 text-sm">
              <p>{t("bestMoveHint", { seat: state.firstKilled ?? 0, name: state.firstKilled ? nameOf(state.firstKilled) : "" })}</p>
              <p className="mt-1 font-semibold">{picks.length ? picks.join(", ") : "—"}</p>
              <button className={`${btnSoft} mt-2`} disabled={!picks.length} onClick={() => { dispatch({ t: "bestMove", picks }); setPicks([]); }}>{t("saveBestMove")}</button>
            </div>
          )}
          <button className={btnMain} onClick={() => dispatch({ t: "day" })}>{t("toDay")}</button>
        </section>
      )}

      {/* Подсказка об окончании */}
      {suggestion && state.phase !== "finished" && !locked && (
        <div className="mt-6 rounded border border-green-500/40 bg-green-500/10 p-3">
          <p className="font-semibold">{t(`suggest.${suggestion}`)}</p>
          <button className={`${btnMain} mt-2`} onClick={() => dispatch({ t: "finish", result: suggestion })}>{t("finishAs", { result: t(`result.${suggestion}`) })}</button>
        </div>
      )}
      {state.phase !== "night0" && state.phase !== "finished" && !locked && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-neutral-400">{t("finishManually")}</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["civilians", "mafia", "draw"] as Result[]).map((r) => (
              <button key={r} className={btnSoft} onClick={() => dispatch({ t: "finish", result: r })}>{t(`result.${r}`)}</button>
            ))}
          </div>
        </details>
      )}

      {/* Итог и баллы */}
      {state.phase === "finished" && (
        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black">{t(`result.${state.result}`)}</h2>
          {state.firstKilled !== null && (
            <p className="text-sm text-neutral-300">
              {t("bestMoveSummary", { seat: state.firstKilled, picks: state.bestMove?.join(", ") ?? "—", hits: bestMoveHits(state) })}
            </p>
          )}
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr>
                <th className="py-1">#</th>
                <th>{t("player")}</th>
                <th className="w-16">{t("extra")}</th>
                <th className="w-16">{t("penalty")}</th>
                <th className="w-14 text-right">{t("points")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {finalScores.map((sc) => (
                <tr key={sc.seat}>
                  <td className="py-1 font-mono text-neutral-400">{sc.seat}</td>
                  <td>
                    <span className={ROLE_CLASS[state.roles[sc.seat] ?? "civilian"]}>{ROLE_ICON[state.roles[sc.seat] ?? "civilian"]}</span>{" "}
                    {nameOf(sc.seat)}
                    {sc.win && <span className="ml-1 text-green-400">✓</span>}
                  </td>
                  {(["extra", "penalty"] as const).map((k) => (
                    <td key={k}>
                      <input
                        inputMode="decimal"
                        value={adj[sc.seat]?.[k] ?? "0"}
                        disabled={locked}
                        onChange={(e) => setAdj((a) => ({ ...a, [sc.seat]: { ...a[sc.seat], [k]: e.target.value.replace(",", ".").replace(/[^\d.-]/g, "").slice(0, 5) } }))}
                        aria-label={t(k === "extra" ? "extraFor" : "penaltyFor", { seat: sc.seat })}
                        className="w-14 rounded border border-white/20 bg-neutral-900 px-1 py-1 text-center"
                      />
                    </td>
                  ))}
                  <td className="text-right font-mono font-bold">{sc.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rated} disabled={locked} onChange={(e) => setRated(e.target.checked)} /> {t("rated")}
          </label>
          {locked ? (
            <button className={btnSoft} onClick={reopen}>{t("reopen")}</button>
          ) : (
            <button className={`${btnMain} w-full py-3 text-base`} disabled={finishing} onClick={saveResult}>{t("saveResult")}</button>
          )}
        </section>
      )}

      {/* Трансляция */}
      <section className="mt-10 space-y-2 border-t border-white/10 pt-4 text-sm">
        <h2 className="font-bold">{t("stream")}</h2>
        <p className="break-all text-neutral-300">{p.overlayUrl}</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showRoles}
            onChange={async (e) => {
              const v = e.target.checked;
              setShowRolesState(v);
              const r = await setShowRoles({ id: p.id, value: v });
              if (!r.ok) setShowRolesState(!v);
            }}
          />
          {t("showRoles")}
        </label>
        <p className="text-xs text-neutral-500">{t("streamHint")}</p>
      </section>

      {/* Протокол */}
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-neutral-400">{t("protocol", { n: log.length })}</summary>
        <ol className="mt-2 space-y-1 font-mono text-xs text-neutral-400">
          {log.map((a, i) => <li key={i}>{i + 1}. {describe(a, t)}</li>)}
        </ol>
      </details>
      <p className="mt-4 text-xs text-neutral-600">{t("aliveCount", { n: alive(state).length })}</p>
    </div>
  );
}

function describe(a: Action, t: ReturnType<typeof useTranslations>) {
  switch (a.t) {
    case "role": return `${t("log.role")} ${a.seat}: ${t(`role.${a.role}`)}`;
    case "start": return t("log.start");
    case "foul": return `${t("log.foul")} ${a.seat}`;
    case "unfoul": return `${t("log.unfoul")} ${a.seat}`;
    case "nominate": return `${t("log.nominate")} ${a.seat}`;
    case "unnominate": return `${t("log.unnominate")} ${a.seat}`;
    case "vote":
      return a.voters
        ? `${t("log.vote")} ${Object.entries(a.voters).map(([k, v]) => `${k}←${v.join(",") || "—"}`).join("  ")}`
        : `${t("log.vote")} ${Object.entries(a.counts).map(([k, v]) => `${k}:${v}`).join(" ")}`;
    case "eliminate": return `${t("log.eliminate")} ${a.seats.join(", ")}`;
    case "night": return t("log.night");
    case "shot": return `${t("log.shot")} ${a.seat ?? t("miss")}`;
    case "donCheck": return `${t("log.don")} ${a.seat}`;
    case "sheriffCheck": return `${t("log.sheriff")} ${a.seat}`;
    case "bestMove": return `${t("log.best")} ${a.picks.join(", ")}`;
    case "day": return t("log.day");
    case "finish": return `${t("log.finish")} ${t(`result.${a.result}`)}`;
  }
}
