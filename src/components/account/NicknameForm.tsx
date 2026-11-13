"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateNickname, type ProfileState } from "@/lib/auth/actions";

export function NicknameForm({
  current,
  city,
  markeryId,
  birthday,
  birthdayRequest,
}: {
  current: string | null;
  city: string | null;
  markeryId: number | null;
  birthday: string | null;
  birthdayRequest: string | null;
}) {
  const t = useTranslations("account");
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateNickname, {
    status: "idle",
  });

  return (
    <form action={action} className="mt-8 max-w-md">
      <label htmlFor="nickname" className="block text-sm font-semibold">
        {t("nickname")}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="nickname"
          name="nickname"
          defaultValue={current ?? ""}
          minLength={2}
          maxLength={32}
          required
          autoComplete="nickname"
          aria-describedby="nickname-hint nickname-status"
          className="flex-1 rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
      </div>
      <p id="nickname-hint" className="mt-2 text-sm text-neutral-400">
        {t("nicknameHint")}
      </p>
      <label htmlFor="city" className="mt-5 block text-sm font-semibold">
        {t("city")}
      </label>
      <input
        id="city"
        name="city"
        defaultValue={city ?? ""}
        maxLength={60}
        autoComplete="address-level2"
        placeholder={t("cityPlaceholder")}
        className="mt-2 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500"
      />
      <p className="mt-2 text-sm text-neutral-400">{t("cityHint")}</p>
      <label htmlFor="birthday" className="mt-5 block text-sm font-semibold">
        {t("birthday")}
        {!birthday && <span className="text-red-400"> *</span>}
      </label>
      <input
        id="birthday"
        name="birthday"
        type="date"
        defaultValue={birthdayRequest ?? birthday ?? ""}
        required={!birthday}
        min="1920-01-01"
        max={new Date().toISOString().slice(0, 10)}
        autoComplete="bday"
        aria-describedby="birthday-hint"
        className="mt-2 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500 [color-scheme:dark]"
      />
      <p id="birthday-hint" className="mt-2 text-sm text-neutral-400">
        {birthdayRequest ? t("birthdayPending") : birthday ? t("birthdayChangeHint") : t("birthdayHint")}
      </p>
      <label htmlFor="markery" className="mt-5 block text-sm font-semibold">
        {t("markery")}
      </label>
      <input
        id="markery"
        name="markery"
        defaultValue={markeryId ? `https://markery.online/playerStatistics?playerId=${markeryId}` : ""}
        maxLength={300}
        inputMode="url"
        placeholder="https://markery.online/playerStatistics?playerId=…"
        className="mt-2 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500"
      />
      <p className="mt-2 text-sm text-neutral-400">{t("markeryHint")}</p>
      <p id="nickname-status" role="status" className="mt-2 text-sm">
        {state.status === "saved" && <span className="text-green-400">{t("saved")}</span>}
        {state.status === "birthdayRequested" && <span className="text-green-400">{t("birthdayRequested")}</span>}
        {state.status !== "idle" && state.status !== "saved" && state.status !== "birthdayRequested" && (
          <span className="text-red-400">{t(state.status)}</span>
        )}
      </p>
    </form>
  );
}
