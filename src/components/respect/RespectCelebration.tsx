"use client";

import { useEffect, useRef, useState } from "react";
import { markRespectSeen } from "@/lib/respect-actions";
import { RespectAmount, RespectCoin } from "./RespectAmount";
import { RESPECT_COLLECTED } from "./events";

export type CelebrationItem = { label: string; amount: number; count: number };

type Props = {
  lastId: number;
  gained: number;
  balance: number;
  czk: number;
  items: CelebrationItem[];
  more: number;
  texts: { title: string; collect: string; balanceNow: string; more: string };
};


const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const d = 90 + (i % 3) * 28;
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), delay: 380 + (i % 4) * 40, coin: i % 3 !== 2 };
});

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Праздничное окно в кабинете: монета, салют и за что пришёл Respect. Закрытие — монеты летят в баланс. */
export function RespectCelebration({ lastId, gained, balance, czk, items, more, texts }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const coinRef = useRef<HTMLDivElement>(null);
  const coinRect = useRef<DOMRect | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // В режиме разработки эффект запускается дважды: окно уже открыто, но подписки нужны заново.
    if (!dialog.open) dialog.showModal();

    // Счётчик «+N» внутри окна.
    let raf = 0;
    const startCount = () => {
      const t0 = performance.now() + (reduced() ? -1e6 : 420);
      const step = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - t0) / 900));
        setShown(Math.round(gained * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    startCount();

    const remember = () => {
      if (coinRef.current) coinRect.current = coinRef.current.getBoundingClientRect();
    };
    const timer = window.setTimeout(remember, 1300);
    window.addEventListener("resize", remember);
    // Запомнить, где монета, до закрытия: Esc / клик мимо окна / кнопка «Забрать».
    dialog.addEventListener("cancel", remember);
    dialog.addEventListener("submit", remember);

    const onClose = () => {
      void markRespectSeen(lastId);
      flyToBalance(coinRect.current).then(() => window.dispatchEvent(new CustomEvent(RESPECT_COLLECTED)));
    };
    dialog.addEventListener("close", onClose, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", remember);
      dialog.removeEventListener("cancel", remember);
      dialog.removeEventListener("submit", remember);
      dialog.removeEventListener("close", onClose);
    };
  }, [gained, lastId]);

  return (
    <dialog ref={ref} aria-labelledby="rc-title" className="rc-dialog" {...{ closedby: "any" }}>
      <div className="rc-stage" aria-hidden="true">
        <div className="rc-glow" />
        <div className="rc-ring" />
        <div className="rc-ring rc-ring-2" />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className={p.coin ? "rc-p rc-p-coin" : "rc-p rc-p-spark"}
            style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--delay": `${p.delay}ms` } as React.CSSProperties}
          >
            {p.coin && <RespectCoin className="h-full w-full" />}
          </span>
        ))}
        <div ref={coinRef} className="rc-coin">
          <RespectCoin className="h-full w-full drop-shadow-[0_6px_18px_rgba(212,160,23,.55)]" />
        </div>
      </div>

      <h1 id="rc-title" className="rc-title mt-2 text-xl font-black">{texts.title}</h1>
      <p className="rc-gain mt-1 text-5xl font-black text-yellow-200" aria-hidden="true">
        +{shown}
      </p>
      <p className="sr-only">+{gained} Respect</p>

      <ul className="rc-list mt-4 space-y-1.5 text-left text-sm">
        {items.map((it, i) => (
          <li key={i} className="rc-item flex items-baseline gap-3" style={{ "--i": i } as React.CSSProperties}>
            <span className="flex-1 text-neutral-200">
              {it.label}
              {it.count > 1 && <span className="text-neutral-500"> ×{it.count}</span>}
            </span>
            <RespectAmount n={it.amount} sign className="font-semibold text-green-400" />
          </li>
        ))}
        {more > 0 && <li className="rc-item text-neutral-500" style={{ "--i": items.length } as React.CSSProperties}>{texts.more}</li>}
      </ul>

      <p className="mt-4 text-sm text-neutral-400">
        {texts.balanceNow}: <RespectAmount n={balance} className="font-semibold text-yellow-200" />{" "}
        <span className="text-neutral-500">≈ {balance * czk} Kč</span>
      </p>

      <form method="dialog" className="mt-5">
        <button autoFocus className="rc-collect w-full rounded-lg bg-yellow-400 px-5 py-3 font-black text-neutral-950 hover:bg-yellow-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-200">
          {texts.collect}
        </button>
      </form>
    </dialog>
  );
}

/** Несколько монет летят из окна в баланс кабинета. Без анимации при «уменьшить движение». */
function flyToBalance(from: DOMRect | null): Promise<void> {
  const target = document.getElementById("respect-balance");
  if (!target || !from || reduced() || typeof document.body.animate !== "function") return Promise.resolve();
  const to = target.getBoundingClientRect();
  if (to.bottom < 0 || to.top > window.innerHeight) {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  const coin = document.querySelector<SVGElement>(".rc-coin svg");
  const flights = Array.from({ length: 6 }, (_, i) => {
    const el = document.createElement("div");
    el.className = "rc-fly";
    if (coin) el.appendChild(coin.cloneNode(true));
    document.body.appendChild(el);
    const end = target.getBoundingClientRect();
    const ex = end.left + Math.min(end.width, 60) / 2;
    const ey = end.top + end.height / 2;
    const mx = (sx + ex) / 2 + (i - 2.5) * 26;
    const my = Math.min(sy, ey) - 80 - (i % 3) * 30;
    const anim = el.animate(
      [
        { translate: `${sx - 14}px ${sy - 14}px`, scale: "1.6", opacity: 1 },
        { translate: `${mx - 14}px ${my - 14}px`, scale: "1.1", opacity: 1, offset: 0.5 },
        { translate: `${ex - 14}px ${ey - 14}px`, scale: "0.5", opacity: 0.2 },
      ],
      { duration: 750, delay: i * 70, easing: "cubic-bezier(.45,0,.3,1)", fill: "both" },
    );
    return anim.finished.catch(() => undefined).finally(() => el.remove());
  });
  return Promise.all(flights).then(() => undefined);
}
