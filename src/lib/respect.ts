/** Respect — программа лояльности клуба. Курс и правила в одном месте (база считает так же). */
export const CZK_PER_RESPECT = 2;

/** Начисления, которые делает сайт сам. */
export const RESPECT_EARN = {
  game: 1,
  tournament: 2,
  final: 3,
  firstGame: 20,
  eveningWin: 5,
  milestones: [
    { games: 50, bonus: 25 },
    { games: 100, bonus: 50 },
    { games: 250, bonus: 100 },
    { games: 500, bonus: 200 },
  ],
} as const;

/** Бонусы, которые начисляет клуб вручную (суммы по умолчанию в админке). */
export const RESPECT_MANUAL = { referral: 30, birthday: 10, blog: 15, review: 10, bonus: 10, adjust: 0 } as const;
export type ManualReason = keyof typeof RESPECT_MANUAL;

/** Какую долю заказа можно оплатить Respect. */
export const RESPECT_SHARE = { merch: 0.5, membership: 0.3 } as const;

export type RespectReason =
  | "game" | "first_game" | "milestone" | "evening_win" | "bonus" | "referral" | "birthday" | "blog" | "review"
  | "code" | "spend_game" | "spend_shop" | "refund" | "adjust" | "expire";

/** Сколько Respect стоит вечер с такой ценой. */
export const respectForCzk = (czk: number) => Math.ceil(czk / CZK_PER_RESPECT);
