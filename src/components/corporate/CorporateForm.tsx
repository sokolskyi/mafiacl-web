"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { submitCorporateRequest, type CorporateState } from "@/lib/corporate-actions";

const FORMATS = ["teambuilding", "party", "birthday", "office", "club", "other"] as const;
const LANGS = ["cs", "ru", "uk", "en"] as const;

export function CorporateForm({ locale }: { locale: string }) {
  const t = useTranslations("corporate.form");
  const tf = useTranslations("corporate.formats");
  const tl = useTranslations("hosts.lang");
  const [state, action, pending] = useActionState<CorporateState, FormData>(submitCorporateRequest, {});
  // Время открытия формы — чтобы отсеять ботов, которые отправляют мгновенно.
  const openedAt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (openedAt.current) openedAt.current.value = String(Date.now());
  }, [state]);

  const field = "mt-1 w-full rounded border border-white/25 bg-neutral-900 px-3 py-2.5 outline-none focus:border-red-500";

  if (state.ok) {
    return (
      <p role="status" className="rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-lg text-green-200">
        {t("sent")}
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input ref={openedAt} type="hidden" name="openedAt" defaultValue="0" />
      {/* Ловушка для ботов: поле спрятано от людей и от экранных дикторов. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="text-sm font-semibold">
        {t("name")} *
        <input name="name" required maxLength={80} autoComplete="name" className={field} />
      </label>
      <label className="text-sm font-semibold">
        {t("company")}
        <input name="company" maxLength={120} autoComplete="organization" className={field} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        {t("contact")} *
        <input name="contact" required minLength={3} maxLength={120} autoComplete="email" className={field} />
      </label>
      <label className="text-sm font-semibold">
        {t("date")}
        <input name="date" type="date" className={field} />
      </label>
      <label className="text-sm font-semibold">
        {t("guests")}
        <input name="guests" type="number" min={1} max={1000} inputMode="numeric" className={field} />
      </label>
      <label className="text-sm font-semibold">
        {t("format")}
        <select name="format" defaultValue="" className={field}>
          <option value="">{t("any")}</option>
          {FORMATS.map((f) => (
            <option key={f} value={f}>{tf(`${f}.title`)}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        {t("language")}
        <select name="language" defaultValue="" className={field}>
          <option value="">{t("any")}</option>
          {LANGS.map((l) => (
            <option key={l} value={l}>{tl(l)}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        {t("message")}
        <textarea name="message" rows={4} maxLength={2000} className={field} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-red-600 px-8 font-bold text-white hover:bg-red-500 disabled:opacity-60">
          {pending ? t("sending") : t("send")}
        </button>
        <p className="mt-3 text-xs text-neutral-400">{t("consent")}</p>
        <p role="alert" className="mt-2 text-sm text-red-300">
          {state.error && t(`errors.${state.error}`)}
        </p>
      </div>
    </form>
  );
}
