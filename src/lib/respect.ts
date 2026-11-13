/** Respect — программа лояльности клуба. Курс и правила в одном месте (база считает так же). */
export const CZK_PER_RESPECT = 2;

/** Начисления, которые делает сайт сам. */
export const RESPECT_EARN = {
  game: 1,
  tournament: 2,
  final: 3,
  firstGame: 20,
  eveningWin: 5,
  /** Лучший ход: первый убитый назвал всех трёх чёрных. */
  bestMove3: 1,
  /** Серии клубных вечеров подряд в любые дни: 4 подряд и 10 подряд. */
  streak4: 1,
  streak10: 3,
  /** Первый вход в кабинет после дня рождения. */
  birthday: 10,
  /** Первая одобренная статья в блог за календарный год. */
  blog: 15,
  /** Покупка абонемента (оплаченного): месяц, 3 месяца, год; особый срок — 15 за каждые 30 дней. */
  membership: { month: 15, quarter: 50, year: 200 },
  milestones: [
    { games: 50, bonus: 25 },
    { games: 100, bonus: 50 },
    { games: 250, bonus: 100 },
    { games: 500, bonus: 200 },
  ],
} as const;

/** Бонусы, которые начисляет клуб вручную (суммы по умолчанию в админке). */
export const RESPECT_MANUAL = { referral: 30, bonus: 10, adjust: 0 } as const;
export type ManualReason = keyof typeof RESPECT_MANUAL;

/** Какую долю заказа можно оплатить Respect. */
export const RESPECT_SHARE = { merch: 0.5, membership: 0.3 } as const;

export type RespectReason =
  | "game" | "first_game" | "milestone" | "evening_win" | "best_move" | "streak" | "membership" | "bonus" | "referral" | "birthday" | "blog" | "review"
  | "code" | "spend_game" | "spend_shop" | "refund" | "adjust" | "expire";

/** Сколько Respect стоит вечер с такой ценой. */
export const respectForCzk = (czk: number) => Math.ceil(czk / CZK_PER_RESPECT);
