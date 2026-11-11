"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Turnstile, captchaEnabled } from "./Turnstile";
import { sendEmailCode, verifyEmailCode, type EmailState } from "@/lib/auth/actions";

export function EmailSignIn({ locale }: { locale: string }) {
  const t = useTranslations("account");
  const [sent, send, sending] = useActionState<EmailState, FormData>(sendEmailCode, { step: "email" });
  const [checked, verify, verifying] = useActionState<EmailState, FormData>(verifyEmailCode, {
    step: "code",
  });
  const [captcha, setCaptcha] = useState("");

  const input =
    "w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";
  const button = "w-full rounded bg-neutral-800 px-4 py-2.5 font-semibold hover:bg-neutral-700 disabled:opacity-60";

  if (sent.step === "code" && sent.email) {
    const error = checked.error;
    return (
      <form action={verify} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={sent.email} />
        <p className="text-sm text-neutral-300">{t("codeSent", { email: sent.email })}</p>
        <label htmlFor="code" className="sr-only">
          {t("code")}
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,12}"
          required
          placeholder={t("code")}
          aria-describedby="code-status"
          className={`${input} tracking-[0.3em]`}
        />
        <button type="submit" disabled={verifying} className={button}>
          {verifying ? t("checking") : t("confirm")}
        </button>
        <p id="code-status" role="status" className="text-sm text-red-400">
          {error && t(error)}
        </p>
      </form>
    );
  }

  return (
    <form action={send} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="email" className="sr-only">
        {t("email")}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={sent.email}
        placeholder={t("email")}
        aria-describedby="email-status"
        className={input}
      />
      <input type="hidden" name="captchaToken" value={captcha} />
      <Turnstile onToken={setCaptcha} resetKey={sent} lang={locale} />
      <button type="submit" disabled={sending || (captchaEnabled && !captcha)} className={button}>
        {sending ? t("sending") : captchaEnabled && !captcha ? t("checkingBot") : t("sendCode")}
      </button>
      <p id="email-status" role="status" className="text-sm text-red-400">
        {sent.error && t(sent.error)}
      </p>
    </form>
  );
}
