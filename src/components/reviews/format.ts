import type { Locale } from "@/i18n/routing";

/** «ноябрь 2026» — в именительном падеже, как заголовок. */
export function monthTitle(month: string, locale: Locale) {
  const [y, m] = month.split("-").map(Number);
  const s = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
    .formatToParts(new Date(Date.UTC(y, m - 1, 15)))
    .map((p) => p.value)
    .join("");
  // ru/uk дают «ноябрь 2026 г.» — без «г.»; первая буква заглавная.
  const clean = s.replace(/\s*(г\.|р\.)\s*$/u, "").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function dayMonth(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}

export function fullDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)) / 86400000);
}

export function fmtNum(v: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v);
}
