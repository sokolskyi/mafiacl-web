"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateNickname, type ProfileState } from "@/lib/auth/actions";

export function NicknameForm({ current }: { current: string | null }) {
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
      <p id="nickname-status" role="status" className="mt-2 text-sm">
        {state.status === "saved" && <span className="text-green-400">{t("saved")}</span>}
        {state.status !== "idle" && state.status !== "saved" && (
          <span className="text-red-400">{t(state.status)}</span>
        )}
      </p>
    </form>
  );
}
