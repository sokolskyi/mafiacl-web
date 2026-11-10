/**
 * Партия мафии как журнал действий ведущего. Состояние всегда пересчитывается из журнала,
 * поэтому «отменить» — это просто убрать последнее действие. Тот же код считает игру
 * на телефоне ведущего, на сервере при сохранении и для слоя трансляции.
 */

export type Role = "civilian" | "sheriff" | "mafia" | "don";
export type Result = "civilians" | "mafia" | "draw";
export type OutReason = "killed" | "voted" | "removed";

/** at — время хода (мс), бланк ставит сам: длительность партии, дней и ночей. */
export type Action = ActionBody & { at?: number };

type ActionBody =
  | { t: "role"; seat: number; role: Role }
  | { t: "start" } // нулевая ночь → нулевой день
  | { t: "foul"; seat: number }
  | { t: "unfoul"; seat: number }
  | { t: "nominate"; seat: number; by?: number }
  | { t: "unnominate"; seat: number }
  // Голосование: counts — число голосов; voters — кто именно поднял руку за кандидата (номера мест).
  | { t: "vote"; counts: Record<string, number>; voters?: Record<string, number[]> }
  | { t: "eliminate"; seats: number[]; reason: "voted" | "removed" }
  | { t: "night" } // день → ночь
  | { t: "shot"; seat: number | null } // null — промах
  | { t: "donCheck"; seat: number }
  | { t: "sheriffCheck"; seat: number }
  | { t: "bestMove"; picks: number[] }
  | { t: "day" } // ночь → день
  | { t: "finish"; result: Result };

export type Phase = "night0" | "day" | "night" | "finished";

export type MatchState = {
  seats: number; // обычно 10
  phase: Phase;
  round: number; // 0 — нулевой день/ночь
  roles: Record<number, Role>;
  fouls: Record<number, number>;
  out: Record<number, { reason: OutReason; round: number }>;
  nominations: number[]; // выставленные в текущий день, по порядку
  votes: { round: number; counts: Record<string, number>; voters?: Record<string, number[]> }[];
  shots: { round: number; seat: number | null }[];
  donChecks: { round: number; seat: number }[];
  sheriffChecks: { round: number; seat: number }[];
  firstKilled: number | null; // первый убитый ночью, если он первый выбывший — у него лучший ход
  bestMove: number[] | null;
  dayStarter: number; // кто открывает текущий день
  result: Result | null;
};

export class MatchError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export const FOUL_LIMIT = 4;
export const isBlack = (r: Role | undefined) => r === "mafia" || r === "don";

/** Состав для 10 игроков: 6 мирных, шериф, 2 мафии, дон. */
export const LINEUP: Record<Role, number> = { civilian: 6, sheriff: 1, mafia: 2, don: 1 };

export function initialState(seats = 10): MatchState {
  return {
    seats,
    phase: "night0",
    round: 0,
    roles: {},
    fouls: {},
    out: {},
    nominations: [],
    votes: [],
    shots: [],
    donChecks: [],
    sheriffChecks: [],
    firstKilled: null,
    bestMove: null,
    dayStarter: 1,
    result: null,
  };
}

export const alive = (s: MatchState) =>
  Array.from({ length: s.seats }, (_, i) => i + 1).filter((n) => !s.out[n]);

function nextAlive(s: MatchState, from: number) {
  for (let i = 1; i <= s.seats; i++) {
    const n = ((from - 1 + i) % s.seats) + 1;
    if (!s.out[n]) return n;
  }
  return from;
}

/** Кто выигрывает при текущем составе: все чёрные выбыли — мирные; чёрных не меньше красных — мафия. */
export function suggestedResult(s: MatchState): Result | null {
  if (s.phase === "night0") return null;
  const a = alive(s);
  const black = a.filter((n) => isBlack(s.roles[n])).length;
  if (black === 0) return "civilians";
  if (black >= a.length - black) return "mafia";
  return null;
}

function seatOk(s: MatchState, seat: unknown): seat is number {
  return Number.isInteger(seat) && (seat as number) >= 1 && (seat as number) <= s.seats;
}

function apply(s: MatchState, a: Action): MatchState {
  if (s.phase === "finished") throw new MatchError("finished");
  const n = structuredClone(s);
  switch (a.t) {
    case "role": {
      if (s.phase !== "night0") throw new MatchError("phase");
      if (!seatOk(s, a.seat) || !(a.role in LINEUP)) throw new MatchError("bad");
      n.roles[a.seat] = a.role;
      return n;
    }
    case "start": {
      if (s.phase !== "night0") throw new MatchError("phase");
      const counts: Record<Role, number> = { civilian: 0, sheriff: 0, mafia: 0, don: 0 };
      for (let i = 1; i <= s.seats; i++) {
        const r = s.roles[i] ?? "civilian";
        n.roles[i] = r;
        counts[r]++;
      }
      if (s.seats === 10 && (Object.keys(LINEUP) as Role[]).some((r) => counts[r] !== LINEUP[r])) {
        throw new MatchError("lineup");
      }
      n.phase = "day";
      n.round = 0;
      n.dayStarter = 1;
      return n;
    }
    case "foul": {
      if (!seatOk(s, a.seat) || s.out[a.seat]) throw new MatchError("bad");
      n.fouls[a.seat] = (s.fouls[a.seat] ?? 0) + 1;
      if (n.fouls[a.seat] >= FOUL_LIMIT) {
        n.out[a.seat] = { reason: "removed", round: s.round };
        n.nominations = n.nominations.filter((x) => x !== a.seat);
      }
      return n;
    }
    case "unfoul": {
      if (!seatOk(s, a.seat) || !(s.fouls[a.seat] > 0)) throw new MatchError("bad");
      n.fouls[a.seat] = s.fouls[a.seat] - 1;
      if (s.out[a.seat]?.reason === "removed" && s.fouls[a.seat] >= FOUL_LIMIT) delete n.out[a.seat];
      return n;
    }
    case "nominate": {
      if (s.phase !== "day") throw new MatchError("phase");
      if (!seatOk(s, a.seat) || s.out[a.seat] || s.nominations.includes(a.seat)) throw new MatchError("bad");
      n.nominations.push(a.seat);
      return n;
    }
    case "unnominate": {
      if (s.phase !== "day") throw new MatchError("phase");
      n.nominations = s.nominations.filter((x) => x !== a.seat);
      return n;
    }
    case "vote": {
      if (s.phase !== "day") throw new MatchError("phase");
      if (a.voters) {
        const seen = new Set<number>();
        for (const [target, list] of Object.entries(a.voters)) {
          if (!s.nominations.includes(Number(target))) throw new MatchError("bad");
          for (const v of list) {
            if (!seatOk(s, v) || s.out[v] || seen.has(v)) throw new MatchError("bad");
            seen.add(v);
          }
        }
        const counts = Object.fromEntries(Object.entries(a.voters).map(([k, v]) => [k, v.length]));
        n.votes.push({ round: s.round, counts, voters: a.voters });
      } else {
        n.votes.push({ round: s.round, counts: a.counts });
      }
      return n;
    }
    case "eliminate": {
      if (!a.seats.length || a.seats.some((x) => !seatOk(s, x) || s.out[x])) throw new MatchError("bad");
      if (a.reason === "voted" && s.phase !== "day") throw new MatchError("phase");
      for (const x of a.seats) n.out[x] = { reason: a.reason, round: s.round };
      n.nominations = n.nominations.filter((x) => !a.seats.includes(x));
      return n;
    }
    case "night": {
      if (s.phase !== "day") throw new MatchError("phase");
      n.phase = "night";
      n.round = s.round + 1;
      n.nominations = [];
      return n;
    }
    case "shot": {
      if (s.phase !== "night") throw new MatchError("phase");
      if (s.shots.some((x) => x.round === s.round)) throw new MatchError("twice");
      if (a.seat !== null && (!seatOk(s, a.seat) || s.out[a.seat])) throw new MatchError("bad");
      n.shots.push({ round: s.round, seat: a.seat });
      if (a.seat !== null) {
        const firstOut = Object.keys(s.out).length === 0;
        n.out[a.seat] = { reason: "killed", round: s.round };
        if (firstOut) n.firstKilled = a.seat;
      }
      return n;
    }
    case "donCheck":
    case "sheriffCheck": {
      if (s.phase !== "night") throw new MatchError("phase");
      if (!seatOk(s, a.seat)) throw new MatchError("bad");
      const list = a.t === "donCheck" ? n.donChecks : n.sheriffChecks;
      if (list.some((x) => x.round === s.round)) throw new MatchError("twice");
      list.push({ round: s.round, seat: a.seat });
      return n;
    }
    case "bestMove": {
      if (s.firstKilled === null) throw new MatchError("noBestMove");
      const picks = [...new Set(a.picks)].filter((x) => seatOk(s, x) && x !== s.firstKilled);
      if (picks.length < 1 || picks.length > 3) throw new MatchError("bad");
      n.bestMove = picks;
      return n;
    }
    case "day": {
      if (s.phase !== "night") throw new MatchError("phase");
      n.phase = "day";
      n.dayStarter = nextAlive(n, s.dayStarter);
      return n;
    }
    case "finish": {
      if (!["civilians", "mafia", "draw"].includes(a.result)) throw new MatchError("bad");
      n.phase = "finished";
      n.result = a.result;
      return n;
    }
  }
}

export function replay(log: Action[], seats = 10): MatchState {
  return log.reduce(apply, initialState(seats));
}

/** Проверить действие до записи в журнал. */
export function tryApply(s: MatchState, a: Action) {
  return apply(s, a);
}

// ---------------------------------------------------------------------------
// Баллы
// ---------------------------------------------------------------------------

export type Rules = {
  win: number;
  /** Сколько дать за лучший ход в зависимости от числа угаданных чёрных (индекс = угадано). */
  bestMove: number[];
};

/** Классика: победа +1; лучший ход: 2 чёрных из 3 = +0,25, 3 из 3 = +0,5. */
export const DEFAULT_RULES: Rules = { win: 1, bestMove: [0, 0, 0.25, 0.5] };

export function bestMoveHits(s: MatchState) {
  return s.bestMove ? s.bestMove.filter((x) => isBlack(s.roles[x])).length : 0;
}

export type SeatScore = { seat: number; win: boolean; bestMove: number; extra: number; penalty: number; total: number };

export function scores(
  s: MatchState,
  adjustments: Record<number, { extra?: number; penalty?: number }> = {},
  rules: Rules = DEFAULT_RULES,
): SeatScore[] {
  const hits = bestMoveHits(s);
  return Array.from({ length: s.seats }, (_, i) => {
    const seat = i + 1;
    const black = isBlack(s.roles[seat]);
    const win = s.result === "mafia" ? black : s.result === "civilians" ? !black : false;
    const bm = seat === s.firstKilled && s.bestMove ? rules.bestMove[hits] ?? 0 : 0;
    const extra = adjustments[seat]?.extra ?? 0;
    const penalty = adjustments[seat]?.penalty ?? 0;
    const total = Math.round(((win ? rules.win : 0) + bm + extra - penalty) * 100) / 100;
    return { seat, win, bestMove: bm, extra, penalty, total };
  });
}

/** Сколько раз игрок голосовал в чёрных и в красных (по поимённым голосованиям). */
export function voteStats(s: MatchState) {
  const out: Record<number, { black: number; red: number }> = {};
  for (const v of s.votes) {
    if (!v.voters) continue;
    for (const [target, list] of Object.entries(v.voters)) {
      const black = isBlack(s.roles[Number(target)]);
      for (const voter of list) {
        out[voter] ??= { black: 0, red: 0 };
        if (black) out[voter].black++;
        else out[voter].red++;
      }
    }
  }
  return out;
}

export function isAction(x: unknown): x is Action {
  return typeof x === "object" && x !== null && typeof (x as { t?: unknown }).t === "string";
}
