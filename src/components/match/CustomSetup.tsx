"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SETUP_SEATS, normalizeSetup, type CustomRoleId, type Setup } from "@/lib/match/engine";

/** Черновик формы: свои роли без id — номера им даются при запуске игры. */
export type SetupDraft = {
  seats: number;
  mafia: number;
  don: number;
  sheriff: number;
  custom: { key: number; name: string; black: boolean; count: number }[];
};

export const DEFAULT_DRAFT: SetupDraft = { seats: 10, mafia: 2, don: 1, sheriff: 1, custom: [] };
const MAX_CUSTOM = 8;

/** Черновик → настройка игры для бланка. */
export function draftToSetup(d: SetupDraft): Setup {
  let b = 0;
  let r = 0;
  const custom = d.custom.map((c) => ({ id: (c.black ? `cb${++b}` : `cr${++r}`) as CustomRoleId, name: c.name.trim(), count: c.count }));
  return {
    seats: d.seats,
    lineup: { mafia: d.mafia, don: d.don, sheriff: d.sheriff, ...Object.fromEntries(custom.map((c) => [c.id, c.count])) },
    custom: custom.map(({ id, name }) => ({ id, name })),
  };
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const t = useTranslations("funGame");
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-sm">{label}</span>
      <div role="group" aria-labelledby={id} className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={t("less", { name: label })} className="h-11 w-11 rounded bg-white/10 text-lg font-bold hover:bg-white/20 disabled:opacity-30">−</button>
        <output aria-live="polite" className="w-9 text-center font-mono text-lg font-bold tabular-nums">{value}</output>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={t("more", { name: label })} className="h-11 w-11 rounded bg-white/10 text-lg font-bold hover:bg-white/20 disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

/** Форма своей игры: сколько игроков, сколько мафий, донов, шерифов и любые свои роли. Мирные — остальные. */
export function CustomSetup({ initial, onStart, onCancel }: { initial: SetupDraft; onStart: (setup: Setup, draft: SetupDraft) => void; onCancel: () => void }) {
  const t = useTranslations("funGame");
  const tr = useTranslations("match.role");
  const titleId = useId();
  const [d, setD] = useState<SetupDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const nextKey = useRef(Math.max(0, ...initial.custom.map((c) => c.key)) + 1);

  const taken = d.mafia + d.don + d.sheriff + d.custom.reduce((a, c) => a + c.count, 0);
  const civilians = d.seats - taken;
  const set = (patch: Partial<SetupDraft>) => {
    setD((x) => ({ ...x, ...patch }));
    setError(null);
  };
  const setCustom = (key: number, patch: Partial<SetupDraft["custom"][number]>) =>
    set({ custom: d.custom.map((c) => (c.key === key ? { ...c, ...patch } : c)) });

  function validate(): string | null {
    if (civilians < 0) return t("err.tooMany", { n: -civilians });
    const names = d.custom.map((c) => c.name.trim().toLowerCase());
    if (names.some((n) => !n)) return t("err.noName");
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) return t("err.sameName", { name: dup });
    const black = d.mafia + d.don + d.custom.filter((c) => c.black).reduce((a, c) => a + c.count, 0);
    if (black === 0) return t("err.noBlack");
    if (black >= d.seats - black) return t("err.tooManyBlack");
    if (!normalizeSetup(draftToSetup(d))) return t("err.bad");
    return null;
  }

  return (
    <form
      aria-labelledby={titleId}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const err = validate();
        setError(err);
        if (err) {
          requestAnimationFrame(() => errorRef.current?.focus());
          return;
        }
        onStart(draftToSetup(d), d);
      }}
      className="mx-auto max-w-xl space-y-5 rounded border border-white/15 bg-neutral-900 p-4"
    >
      <div>
        <h2 id={titleId} className="text-xl font-bold">{t("customTitle")}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t("customLead")}</p>
      </div>

      <Stepper label={t("players")} value={d.seats} min={SETUP_SEATS.min} max={SETUP_SEATS.max} onChange={(seats) => set({ seats })} />

      <fieldset className="space-y-2 border-t border-white/10 pt-4">
        <legend className="mb-2 font-semibold">{t("roles")}</legend>
        <Stepper label={tr("mafia")} value={d.mafia} min={0} max={SETUP_SEATS.max} onChange={(mafia) => set({ mafia })} />
        <Stepper label={tr("don")} value={d.don} min={0} max={SETUP_SEATS.max} onChange={(don) => set({ don })} />
        <Stepper label={tr("sheriff")} value={d.sheriff} min={0} max={SETUP_SEATS.max} onChange={(sheriff) => set({ sheriff })} />

        {d.custom.map((c, i) => (
          <div key={c.key} className="space-y-2 rounded border border-white/10 p-3">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor={`role-name-${c.key}`} className="text-xs text-neutral-400">{t("roleName")}</label>
                <input
                  id={`role-name-${c.key}`}
                  value={c.name}
                  onChange={(e) => setCustom(c.key, { name: e.target.value })}
                  maxLength={24}
                  required
                  aria-invalid={error === t("err.noName") && !c.name.trim() ? true : undefined}
                  placeholder={t("roleNamePlaceholder")}
                  autoComplete="off"
                  className="mt-1 min-h-11 w-full rounded border border-white/15 bg-neutral-950 px-3 outline-none placeholder:text-neutral-600 focus:border-red-500"
                />
              </div>
              <button
                type="button"
                onClick={() => set({ custom: d.custom.filter((x) => x.key !== c.key) })}
                aria-label={t("remove", { name: c.name.trim() || t("roleN", { n: i + 1 }) })}
                className="h-11 w-11 shrink-0 rounded bg-white/10 hover:bg-white/20"
              >
                ✕
              </button>
            </div>
            <fieldset className="flex gap-2">
              <legend className="sr-only">{t("team")}</legend>
              {([false, true] as const).map((black) => (
                <label key={String(black)} className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded px-2 text-sm ${c.black === black ? (black ? "bg-white/20" : "bg-red-600/30") : "bg-white/5 hover:bg-white/10"}`}>
                  <input type="radio" name={`team-${c.key}`} checked={c.black === black} onChange={() => setCustom(c.key, { black })} className="accent-red-600" />
                  {black ? t("teamBlack") : t("teamRed")}
                </label>
              ))}
            </fieldset>
            <Stepper label={t("count")} value={c.count} min={1} max={SETUP_SEATS.max} onChange={(count) => setCustom(c.key, { count })} />
          </div>
        ))}

        {d.custom.length < MAX_CUSTOM && (
          <button
            type="button"
            onClick={() => set({ custom: [...d.custom, { key: nextKey.current++, name: "", black: false, count: 1 }] })}
            className="min-h-11 w-full rounded border border-dashed border-white/25 text-sm font-semibold hover:bg-white/5"
          >
            + {t("addRole")}
          </button>
        )}
      </fieldset>

      <p className={`rounded px-3 py-2 text-sm ${civilians < 0 ? "bg-red-500/15 text-red-300" : "bg-white/5"}`} aria-live="polite">
        {t("civilians", { n: Math.max(0, civilians) })}
      </p>

      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="rounded bg-red-500/15 px-3 py-2 text-sm text-red-300 outline-none">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" className="min-h-11 flex-1 rounded bg-red-600 px-4 font-semibold hover:bg-red-500">{t("start")}</button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded bg-white/10 px-4 font-semibold hover:bg-white/20">{t("cancel")}</button>
      </div>
    </form>
  );
}
