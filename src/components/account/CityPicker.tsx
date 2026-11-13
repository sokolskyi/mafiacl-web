"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CITIES_LIST, cityByKey, fold, type City } from "@/lib/cities";

type Lang = "cs" | "ru" | "uk" | "en";

/**
 * Выбор города из списка: игрок начинает печатать на любом языке (Прага / Praha / Prague),
 * под полем — подходящие города. В форму уходит ключ города; свободный текст не принимается.
 */
export function CityPicker({
  name,
  initial,
  locale,
  label,
  placeholder,
  hint,
  noMatch,
}: {
  name: string;
  initial: string | null;
  locale: string;
  label: string;
  placeholder: string;
  hint: string;
  noMatch: string;
}) {
  const lang = (["cs", "ru", "uk", "en"].includes(locale) ? locale : "en") as Lang;
  const labelOf = (c: City) => c.names[lang];
  const initialCity = cityByKey(initial);
  // Старое значение (свободный текст до списка) показываем как есть и не трогаем, пока игрок не выберет город.
  const [value, setValue] = useState<string>(initial ?? "");
  const [text, setText] = useState(initialCity ? labelOf(initialCity) : (initial ?? ""));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const uid = useId();
  const listId = `cities-${uid}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const countries = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const matches = useMemo(() => {
    const q = fold(text);
    if (!q) return CITIES_LIST.filter((c) => c.country === "cz").slice(0, 8);
    const scored: [number, City][] = [];
    for (const c of CITIES_LIST) {
      let best = 99;
      for (const n of Object.values(c.names)) {
        const f = fold(n);
        if (f === q) best = Math.min(best, 0);
        else if (f.startsWith(q)) best = Math.min(best, 1);
        else if (f.split(/[\s-]+/).some((w) => w.startsWith(q))) best = Math.min(best, 2);
        else if (q.length >= 3 && f.includes(q)) best = Math.min(best, 3);
      }
      if (best < 99) scored.push([best, c]);
    }
    return scored.sort((a, b) => a[0] - b[0]).slice(0, 8).map(([, c]) => c);
  }, [text]);

  function choose(c: City) {
    setValue(c.key);
    setText(labelOf(c));
    setOpen(false);
  }

  function onBlur() {
    // Даём клику по варианту сработать раньше, чем список закроется.
    window.setTimeout(() => {
      setOpen(false);
      const q = fold(text);
      if (!q) {
        setValue("");
        return;
      }
      const exact = CITIES_LIST.find((c) => Object.values(c.names).some((n) => fold(n) === q));
      if (exact) choose(exact);
      else {
        // Не выбрали из списка — возвращаем прежнее значение.
        const prev = cityByKey(value);
        setText(prev ? labelOf(prev) : value);
      }
    }, 120);
  }

  const shown = open && matches.length > 0;
  const country = (c: City) => countries?.of(c.country.toUpperCase()) ?? c.country.toUpperCase();

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="mt-5 block text-sm font-semibold">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown ? `${listId}-${active}` : undefined}
        aria-describedby={`${listId}-hint`}
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        maxLength={60}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && shown) {
            e.preventDefault();
            if (matches[active]) choose(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="mt-2 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500"
      />
      {shown && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border border-white/20 bg-neutral-950 py-1 shadow-xl">
          {matches.map((c, i) => (
            <li
              key={c.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 ${i === active ? "bg-white/10" : ""}`}
            >
              <span>{labelOf(c)}</span>
              <span className="text-xs text-neutral-400">{country(c)}</span>
            </li>
          ))}
        </ul>
      )}
      {open && text && matches.length === 0 && <p className="mt-1 text-sm text-amber-300">{noMatch}</p>}
      <p id={`${listId}-hint`} className="mt-2 text-sm text-neutral-400">{hint}</p>
    </div>
  );
}
