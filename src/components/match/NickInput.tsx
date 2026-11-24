"use client";

import { useId, useMemo, useState } from "react";
import { searchNicks, type indexNicks } from "@/lib/match/nickSearch";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  index: ReturnType<typeof indexNicks>;
  label: string;
  placeholder: string;
  accountLabel: string;
};

/**
 * Поле ника с подсказками (combobox по ARIA 1.2). Подсказки находят ник,
 * даже если его набрали не в той раскладке или кириллицей вместо латиницы.
 */
export function NickInput({ value, onChange, onBlur, index, label, placeholder, accountLabel }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = useMemo(() => (open ? searchNicks(index, value) : []), [open, index, value]);
  // Точное совпадение одной подсказки — список не нужен.
  const shown = options.length === 1 && options[0].nickname === value.trim() ? [] : options;
  const expanded = shown.length > 0;

  function pick(nickname: string) {
    onChange(nickname);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={label}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && shown.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % shown.length);
          } else if (e.key === "ArrowUp" && shown.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? shown.length - 1 : a - 1));
          } else if (e.key === "Enter" && expanded) {
            e.preventDefault();
            pick(shown[active >= 0 ? active : 0].nickname);
          } else if (e.key === "Escape" && expanded) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        maxLength={80}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="min-h-11 w-full rounded border border-white/15 bg-neutral-900 px-3 outline-none placeholder:text-neutral-600 focus:border-red-500"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded border border-white/15 bg-neutral-900 py-1 shadow-lg shadow-black/40"
      >
        {shown.map((o, i) => (
          <li
            key={`${o.nickname}-${o.id ?? "g"}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // Не даём полю потерять фокус до выбора — иначе список закроется раньше клика.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(o.nickname)}
            className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 ${i === active ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            <span className="truncate font-semibold">{o.nickname}</span>
            {o.id && <span className="shrink-0 text-xs text-neutral-400">{accountLabel}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
