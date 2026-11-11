"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { submitFranchiseRequest, type FranchiseState } from "@/lib/corporate-actions";

export function FranchiseForm({ locale }: { locale: string }) {
  const t = useTranslations("franchise.form");
  const [state, action, pending] = useActionState<FranchiseState, FormData>(submitFranchiseRequest, {});
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
        {t("city")} *
        <input name="city" required maxLength={80} autoComplete="address-level2" className={field} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        {t("contact")} *
        <input name="contact" required minLength={3} maxLength={120} autoComplete="email" className={field} />
      </label>
      <label className="text-sm font-semibold">
        {t("venue")}
        <select name="venue" defaultValue="" className={field}>
          <option value="">{t("choose")}</option>
          <option value="yes">{t("venueYes")}</option>
          <option value="looking">{t("venueLooking")}</option>
          <option value="no">{t("venueNo")}</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        {t("experience")}
        <select name="experience" defaultValue="" className={field}>
          <option value="">{t("choose")}</option>
          <option value="club">{t("expClub")}</option>
          <option value="player">{t("expPlayer")}</option>
          <option value="new">{t("expNew")}</option>
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
