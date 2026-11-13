/** Номер участника клуба: 1 → «00001». Не меняется при смене ника. */
export function formatMemberNo(n: number | null | undefined) {
  return n ? String(n).padStart(5, "0") : null;
}

/** Страны, заявки из которых помечаются для проверки (клуб не регистрирует жителей РФ и РБ). */
export const FLAGGED_COUNTRIES: readonly string[] = ["RU", "BY"];
