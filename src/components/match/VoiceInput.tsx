"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/**
 * Голосовой ввод для бланка ведущего (Web Speech API: Chrome, Edge, Safari).
 * Речь распознаёт браузер; готовые фразы уходят в onPhrase, бланк сам решает, что с ними делать.
 * Слушает, пока ведущий не выключит: после паузы браузер останавливает распознавание — запускаем снова.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecognitionCtor = new () => Recognition;

const LANGS = [
  { code: "ru-RU", label: "RU" },
  { code: "uk-UA", label: "UA" },
  { code: "cs-CZ", label: "CS" },
  { code: "en-US", label: "EN" },
] as const;
const LANG_KEY = "mcl-voice-lang";

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceInput({ locale, onPhrase, disabled }: { locale: string; onPhrase: (text: string) => void; disabled?: boolean }) {
  const t = useTranslations("match.voice");
  // Есть ли распознавание речи — только в браузере; на сервере null (ничего не рисуем).
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!getCtor(),
    () => null,
  );
  const [on, setOn] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<string>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(LANG_KEY) : null;
      if (saved && LANGS.some((l) => l.code === saved)) return saved;
    } catch {
      /* без localStorage — язык по языку сайта */
    }
    return locale === "uk" ? "uk-UA" : locale === "en" ? "en-US" : locale === "cs" ? "cs-CZ" : "ru-RU";
  });
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const phrase = useRef(onPhrase);
  useEffect(() => {
    phrase.current = onPhrase;
  }, [onPhrase]);

  useEffect(() => {
    return () => {
      wanted.current = false;
      rec.current?.abort();
    };
  }, []);

  function start() {
    const Ctor = getCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript.trim();
        if (res.isFinal) {
          if (text) phrase.current(text);
        } else live += ` ${text}`;
      }
      setInterim(live.trim());
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? t("denied") : t("failed"));
      wanted.current = false;
      setOn(false);
    };
    r.onend = () => {
      setInterim("");
      if (wanted.current) {
        try {
          r.start();
        } catch {
          wanted.current = false;
          setOn(false);
        }
      } else setOn(false);
    };
    rec.current = r;
    wanted.current = true;
    setError(null);
    try {
      r.start();
      setOn(true);
    } catch {
      setError(t("failed"));
    }
  }

  function stop() {
    wanted.current = false;
    rec.current?.stop();
    setOn(false);
    setInterim("");
  }

  function changeLang(code: string) {
    setLang(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* не страшно */
    }
    if (on) {
      stop();
    }
  }

  if (supported === null) return null;
  if (!supported) return <p className="text-xs text-neutral-500">{t("unsupported")}</p>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={on ? stop : start}
        disabled={disabled}
        aria-pressed={on}
        className={`inline-flex min-h-11 items-center gap-2 rounded px-3 text-sm font-bold disabled:opacity-40 ${on ? "bg-red-600 text-white" : "bg-white/10 hover:bg-white/15"}`}
      >
        <span aria-hidden="true" className={on ? "motion-safe:animate-pulse" : ""}>●</span>
        {on ? t("stop") : t("start")}
      </button>
      <label className="sr-only" htmlFor="voice-lang">{t("lang")}</label>
      <select
        id="voice-lang"
        value={lang}
        onChange={(e) => changeLang(e.target.value)}
        className="min-h-11 rounded border border-white/15 bg-neutral-950 px-2 text-sm"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
      <p className="min-w-0 flex-1 truncate text-sm text-neutral-300" aria-live="polite">
        {error ?? (on ? interim || t("listening") : "")}
      </p>
    </div>
  );
}
