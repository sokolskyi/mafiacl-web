"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ShareButton } from "@/components/ShareButton";
import { COMMENT_MAX, REACTIONS, type ReactionKind } from "@/lib/blog-social-shared";
import type { BlogSnapshot } from "@/app/api/blog/[slug]/route";

const ERRORS = ["signIn", "invalid", "nickname", "tooFast", "save"] as const;
type BlogError = (typeof ERRORS)[number];

/** Под статьёй: «Поделиться», реакции, просмотры и комментарии. Данные — с /api/blog/[slug], страница остаётся в кеше. */
export function PostSocial({ slug, title }: { slug: string; title: string }) {
  const t = useTranslations("blogSocial");
  const ts = useTranslations("share");
  const locale = useLocale();
  const errorText = (k: unknown) => t(`errors.${ERRORS.includes(k as BlogError) ? (k as BlogError) : "save"}`);
  const [data, setData] = useState<BlogSnapshot | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // «Сейчас» для «5 минут назад» — фиксируется при каждом ответе сервера.
  const [now, setNow] = useState(0);
  const api = `/api/blog/${slug}`;

  useEffect(() => {
    let alive = true;
    // Просмотр засчитывается один раз в день; ответ — свежие счётчики и комментарии.
    fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }) })
      .then((r) => (r.ok ? r.json() : fetch(api).then((x) => x.json())))
      .then((d: BlogSnapshot) => {
        if (!alive) return;
        setData(d);
        setNow(Date.now());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [api]);

  const send = (payload: object, after?: () => void) =>
    start(async () => {
      setError(null);
      try {
        const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          setError(errorText(d?.error));
          return;
        }
        setData(d as BlogSnapshot);
        setNow(Date.now());
        after?.();
      } catch {
        setError(errorText("save"));
      }
    });

  const react = (kind: ReactionKind) => {
    if (!data) return;
    // Сразу показываем результат, сервер потом пришлёт точные числа.
    const on = data.mine.includes(kind);
    setData({
      ...data,
      mine: on ? data.mine.filter((k) => k !== kind) : [...data.mine, kind],
      reactions: { ...data.reactions, [kind]: Math.max(0, (data.reactions[kind] ?? 0) + (on ? -1 : 1)) },
    });
    send({ action: "react", kind });
  };

  const rel = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const ago = (iso: string) => {
    const s = (new Date(iso).getTime() - now) / 1000;
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [["second", 60], ["minute", 60], ["hour", 24], ["day", 30], ["month", 12], ["year", Infinity]];
    let v = s;
    for (const [unit, size] of steps) {
      if (Math.abs(v) < size) return unit === "second" ? rel.format(0, "second") : rel.format(Math.round(v), unit);
      v /= size;
    }
    return "";
  };

  const comments = data?.comments ?? [];
  return (
    <section aria-label={t("reactionsLabel")} className="mt-12 border-t border-white/10 pt-8">
      <ShareButton
        title={title}
        labels={{ button: t("share"), story: ts("story"), post: ts("post"), link: ts("link"), copied: ts("copied"), saved: ts("saved"), error: ts("error") }}
      />

      <ul className="mt-6 flex flex-wrap gap-2" aria-label={t("reactionsLabel")}>
        {REACTIONS.map(({ kind, emoji }) => {
          const n = data?.reactions[kind] ?? 0;
          const on = !!data?.mine.includes(kind);
          return (
            <li key={kind}>
              <button
                type="button"
                onClick={() => react(kind)}
                disabled={!data}
                aria-pressed={on}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  on ? "border-red-500 bg-red-600/25 text-white" : "border-white/20 bg-neutral-900 text-neutral-200 hover:border-white/50"
                }`}
              >
                <span aria-hidden="true">{emoji}</span>
                {t(`reactions.${kind}`)}
                {n > 0 && <span className="tabular-nums">{n}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-neutral-400">
        <span aria-hidden="true">👁 </span>
        {data ? t("views", { n: data.views }) : "…"}
      </p>

      <h2 id="comments" className="mt-10 scroll-mt-24 text-2xl font-bold">{t("commentsTitle", { n: comments.length })}</h2>
      {data?.me ? (
        data.me.nickname ? (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send({ action: "comment", body: text }, () => setText(""));
            }}
          >
            <p className="text-sm text-neutral-400">{t("youAre", { nick: data.me.nickname })}</p>
            <label className="sr-only" htmlFor={`c-${slug}`}>{t("placeholder")}</label>
            <textarea
              id={`c-${slug}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={COMMENT_MAX}
              rows={3}
              placeholder={t("placeholder")}
              className="mt-2 w-full rounded-lg border border-white/20 bg-neutral-900 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-white focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-4">
              <button type="submit" disabled={pending || !text.trim()} className="rounded-full bg-red-600 px-6 py-2.5 font-bold text-white hover:bg-red-500 disabled:opacity-50">
                {pending ? t("sending") : t("send")}
              </button>
              <span className="text-xs text-neutral-500 tabular-nums">{text.length}/{COMMENT_MAX}</span>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-neutral-300">
            {t("needNickname")} <Link href="/account" className="underline hover:text-white">{t("needNicknameLink")}</Link>
          </p>
        )
      ) : data ? (
        <p className="mt-4 text-neutral-300">
          {t("signIn")} <Link href="/account" className="underline hover:text-white">{t("signInLink")}</Link>
        </p>
      ) : null}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}

      {data && comments.length === 0 && <p className="mt-6 text-neutral-500">{t("empty")}</p>}
      <ul className="mt-6 divide-y divide-white/10">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3 py-4">
            {c.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.avatarUrl} alt="" width={36} height={36} referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                {(c.nickname ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {c.nickname ? (
                  <Link href={{ pathname: "/players/[nick]", params: { nick: c.nickname } }} className="font-bold hover:underline">{c.nickname}</Link>
                ) : (
                  <span className="font-bold">—</span>
                )}
                <span className="text-neutral-500"> · <time dateTime={c.createdAt}>{ago(c.createdAt)}</time></span>
                {c.canDelete && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(t("deleteConfirm"))) send({ action: "delete", id: c.id });
                    }}
                    className="ml-3 text-xs text-neutral-500 underline hover:text-red-300"
                  >
                    {t("delete")}
                  </button>
                )}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-neutral-200">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
