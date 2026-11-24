import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { FeedbackForm } from "./FeedbackForm";

/** Отзыв для администрации клуба и последние отправленные отзывы игрока. */
export async function AccountFeedback({ locale, userId }: { locale: Locale; userId: string }) {
  const t = await getTranslations({ locale, namespace: "account.feedback" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("player_feedback")
    .select("id, body, created_at, read_at")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const fmt = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" }).format(new Date(d));
  return (
    <section id="feedback" className="mt-10 max-w-xl" aria-labelledby="feedback-title">
      <h3 id="feedback-title" className="text-lg font-bold">{t("title")}</h3>
      <p className="mt-1 text-sm text-neutral-400">{t("hint")}</p>
      <FeedbackForm
        labels={{
          placeholder: t("placeholder"),
          send: t("send"),
          sending: t("sending"),
          sent: t("sent"),
          errors: { invalid: t("errors.invalid"), tooMany: t("errors.tooMany"), save: t("errors.save"), signIn: t("errors.signIn") },
        }}
      />
      {(data ?? []).length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-neutral-400 hover:text-white">{t("mine", { n: data!.length })}</summary>
          <ul className="mt-2 divide-y divide-white/10 rounded border border-white/10">
            {data!.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <p className="text-xs text-neutral-500">
                  {fmt(f.created_at)} · {f.read_at ? <span className="text-green-400">{t("read")}</span> : t("unread")}
                </p>
                <p className="mt-1 whitespace-pre-line text-neutral-200">{f.body}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
