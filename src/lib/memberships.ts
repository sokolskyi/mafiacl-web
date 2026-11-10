/** Виды абонементов клуба (цены — по умолчанию в форме, можно поправить при выдаче). */
export const MEMBERSHIP_PLANS = {
  month: { months: 1, priceCzk: 1150 },
  quarter: { months: 3, priceCzk: 3150 },
  custom: { months: 0, priceCzk: 0 },
} as const;

export type MembershipPlan = keyof typeof MEMBERSHIP_PLANS;

export const PAYMENT_METHODS = ["cash", "card", "transfer"] as const;
export type ManualPaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Последний день действия: 1 мес. с 05.11 → 04.12 (включительно). Даты — "YYYY-MM-DD". */
export function membershipEnd(from: string, months: number) {
  const [y, m, d] = from.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1 + months, d));
  // 31.01 + 1 мес. в JS даёт 03.03 — тогда последний день = конец февраля.
  if (end.getUTCMonth() !== (m - 1 + months) % 12) end.setUTCDate(0);
  else end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}
