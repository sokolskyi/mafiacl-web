import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { Pair, Scoring } from "@/lib/ratingArchive";

/** «Как считается рейтинг» сезона: формула, зачёт и таблица баллов. */
export async function ScoringRules({ locale, scoring: sc, formula, games, withExtra = true }: { locale: Locale; scoring: Scoring; formula: string | null; games: number; withExtra?: boolean }) {
  const t = await getTranslations({ locale, namespace: "ratingArchive" });
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const minGames = sc.minGames ?? (sc.minShareDiv ? Math.floor(games / sc.minShareDiv) + 1 : null);
  const kind = sc.formula ?? "coefGames";
  const lhSheriff = sc.lhSheriff;
  const keys = ["0", "1", "2", "3"] as const;
  const all: { label: string; v: Pair }[] = [
    { label: t("civ"), v: [sc.win.civ, 0] },
    { label: t("mafia"), v: [sc.win.mafia, 0] },
    { label: t("sheriff"), v: [sc.win.sheriff, 0] },
    { label: t("don"), v: [sc.win.don, 0] },
    { label: t("ruleFirstKilled"), v: sc.pu },
    ...keys.map((k) => ({ label: t("ruleBestMove", { n: k }), v: sc.lh[k] })),
    ...(lhSheriff ? keys.map((k) => ({ label: t("ruleBestMoveSheriff", { n: k }), v: lhSheriff[k] })) : []),
  ];
  const rows = all.filter((r) => r.v[0] !== 0 || r.v[1] !== 0);
  const cell = (x: number) => (x === 0 ? <span className="text-neutral-600">0</span> : num.format(x));

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-neutral-950 p-4 text-sm text-neutral-300" aria-labelledby="scoring-title">
      <h2 id="scoring-title" className="text-lg font-bold text-white">{t("scoringTitle")}</h2>
      <p className="mt-2">
        {kind === "sum"
          ? t("scoringFormulaSum")
          : kind === "perGame"
            ? t("scoringFormulaPerGame", { coef: plain.format(sc.gamesCoef) })
            : t(withExtra ? "scoringFormula" : "scoringFormulaNoExtra", { coef: plain.format(sc.gamesCoef) })}
      </p>
      {minGames !== null && (
        <p className="mt-1">{sc.minPct ? t("scoringQualifyPct", { pct: sc.minPct, min: minGames }) : t("scoringQualify", { min: minGames })}</p>
      )}
      {sc.finalCoef && <p className="mt-1">{t("scoringFinalCoef", { v: plain.format(sc.finalCoef) })}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[22rem] text-left">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-1.5 pr-6 font-normal"></th>
              <th className="px-3 py-1.5 text-right font-normal">{t("ruleWin")}</th>
              <th className="px-3 py-1.5 text-right font-normal">{t("ruleLoss")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="py-1.5 pr-6 font-normal">{r.label}</th>
                <td className="px-3 py-1.5 text-right tabular-nums">{cell(r.v[0])}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{cell(r.v[1])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(sc.bestPlayer || sc.buttons.length > 0) && (
        <p className="mt-3">
          {sc.bestPlayer ? t(sc.bestPlayerPerVote ? "ruleBestPlayerVote" : "ruleBestPlayer", { v: num.format(sc.bestPlayer) }) : null}
          {sc.bestPlayer && sc.buttons.length > 0 ? " " : null}
          {sc.buttons.length > 0 ? t("ruleButtons", { v: sc.buttons.map((b) => num.format(b)).join(" / ") }) : null}
        </p>
      )}
      {sc.penalty ? <p className="mt-1">{t("rulePenalty", { v: num.format(sc.penalty) })}</p> : null}
      <p className="mt-2 text-neutral-400">{t("ruleTeamNote")}</p>
      {formula && (
        <details className="mt-3">
          <summary className="cursor-pointer text-neutral-400 hover:text-white">{t("formulaRaw")}</summary>
          <code className="mt-2 block overflow-x-auto rounded bg-black/60 p-2 font-mono text-xs text-neutral-200">{formula}</code>
        </details>
      )}
    </section>
  );
}
