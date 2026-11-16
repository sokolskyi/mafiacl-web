/**
 * Реквизиты оператора сайта и продавца (OSVČ). Подставляются в тексты документов
 * вместо {name}, {ico}, {address}, {email}, {phone}, {effective}.
 * Rodné číslo и дату рождения сюда не добавлять.
 */
export const OPERATOR = {
  name: "Ievgen Sokolskyi",
  ico: "24510939",
  address: "Sousedíkova 969/1, 190 00 Praha 9 – Vysočany",
  email: "info@mafiacl.com",
  /** Обязателен для условий продажи потребителям (с 2023). Пока не задан — показывается прочерк. */
  phone: "",
  /** Дата вступления текущей редакции в силу (ДД.ММ.ГГГГ). */
  effective: "16.11.2026",
} as const;

export function fillOperator(text: string): string {
  return text
    .replaceAll("{name}", OPERATOR.name)
    .replaceAll("{ico}", OPERATOR.ico)
    .replaceAll("{address}", OPERATOR.address)
    .replaceAll("{email}", OPERATOR.email)
    .replaceAll("{phone}", OPERATOR.phone || "—")
    .replaceAll("{effective}", OPERATOR.effective);
}
