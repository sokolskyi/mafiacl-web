/** Виды абонементов клуба (цены — по умолчанию в форме, можно поправить при выдаче). */
export const MEMBERSHIP_PLANS = {
  month: { months: 1, priceCzk: 1150 },
  quarter: { months: 3, priceCzk: 3150 },
  year: { months: 12, priceCzk: 8600 },
  custom: { months: 0, priceCzk: 0 },
} as const;

export type MembershipPlan = keyof typeof MEMBERSHIP_PLANS;

export const PAYMENT_METHODS = ["cash", "card", "transfer"] as const;
export type ManualPaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Последний день действия, как в таблице клуба: 1 мес. с 05.11 → по 05.12, 3 мес. с 01.09 → по 01.12;
 * «Год» — до 31.12 года покупки. 31.01 + 1 мес. → 28.02. Даты — "YYYY-MM-DD".
 */
export function membershipEnd(from: string, plan: MembershipPlan) {
  const [y, m, d] = from.split("-").map(Number);
  if (plan === "year") return `${y}-12-31`;
  const months = MEMBERSHIP_PLANS[plan].months;
  const end = new Date(Date.UTC(y, m - 1 + months, d));
  if (end.getUTCMonth() !== (m - 1 + months) % 12) end.setUTCDate(0);
  return end.toISOString().slice(0, 10);
}
