import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getMemberRequests } from "@/lib/members";
import { decideMember } from "@/lib/members-actions";
import { FLAGGED_COUNTRIES } from "@/lib/memberNo";

/** Заявки на верификацию: до одобрения игрок не может записываться на игры. */
export async function MemberRequests({ locale, notice }: { locale: Locale; notice?: string }) {
  const t = await getTranslations({ locale, namespace: "admin.members" });
  const rows = await getMemberRequests();
  const pending = rows.filter((r) => r.verification === "pending");
  const rejected = rows.filter((r) => r.verification === "rejected");
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" });
  const country = new Intl.DisplayNames([locale], { type: "region" });

  const Row = ({ r }: { r: (typeof rows)[number] }) => {
    const flagged = r.country !== null && FLAGGED_COUNTRIES.includes(r.country);
    return (
      <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${flagged ? "bg-red-950/60" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {r.nickname ?? <span className="text-neutral-400">{t("noNick")}</span>}
            {r.displayName && <span className="ml-2 text-sm font-normal text-neutral-400">{r.displayName}</span>}
          </p>
          <p className="text-sm text-neutral-400">
            {[r.email, t(`provider.${["google", "facebook", "custom:telegram", "email", "apple", "azure"].includes(r.provider) ? r.provider.replace("custom:", "") : "other"}`), date.format(new Date(r.createdAt)), r.telegramLinked ? t("botLinked") : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className={`text-sm ${flagged ? "font-semibold text-red-300" : "text-neutral-400"}`}>
            {r.country ? `${flagged ? "⚠ " : ""}${t("country")}: ${country.of(r.country) ?? r.country} (${r.country})` : t("countryUnknown")}
            {flagged && ` — ${t("flagged")}`}
          </p>
        </div>
        <form action={decideMember} className="flex gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="profileId" value={r.id} />
          <button name="decision" value="approve" className="min-h-11 rounded bg-green-700 px-4 text-sm font-semibold hover:bg-green-600">
            {t("approve")}
          </button>
          {r.verification === "pending" && (
            <button name="decision" value="reject" className="min-h-11 rounded border border-white/30 px-4 text-sm font-semibold hover:bg-white/10">
              {t("reject")}
            </button>
          )}
        </form>
      </li>
    );
  };

  return (
    <section id="members" className="scroll-mt-24">
      <h2 className="text-xl font-bold">
        {t("title")} {pending.length > 0 && <span className="ml-2 rounded-full bg-red-600 px-2.5 py-0.5 text-sm">{pending.length}</span>}
      </h2>
      <p className="mt-1 text-sm text-neutral-400">{t("hint")}</p>
      {notice && <p role="status" className="mt-3 text-green-400">{t(notice === "approved" ? "doneApproved" : "doneRejected")}</p>}
      {pending.length === 0 ? (
        <p className="mt-4 text-neutral-400">{t("empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
          {pending.map((r) => <Row key={r.id} r={r} />)}
        </ul>
      )}
      {rejected.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-neutral-400">{t("rejectedTitle", { count: rejected.length })}</summary>
          <ul className="mt-2 divide-y divide-white/10 rounded border border-white/10">
            {rejected.map((r) => <Row key={r.id} r={r} />)}
          </ul>
        </details>
      )}
    </section>
  );
}
