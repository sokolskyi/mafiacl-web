"use client";

import { useEffect, useState } from "react";
import { RESPECT_COLLECTED } from "./events";
import { RespectAmount } from "./RespectAmount";

/**
 * Баланс в кабинете. Если есть непросмотренные начисления, сначала показывает прежнюю сумму,
 * а когда монеты «долетели» из праздничного окна — досчитывает до новой.
 */
export function RespectBalance({ from, to }: { from: number; to: number }) {
  const [n, setN] = useState(from);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (from === to) return;
    let raf = 0;
    const onCollected = () => {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = still ? 1 : Math.min(1, (now - t0) / 800);
        setN(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(step);
        else setPulse(true);
      };
      raf = requestAnimationFrame(step);
    };
    window.addEventListener(RESPECT_COLLECTED, onCollected, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(RESPECT_COLLECTED, onCollected);
    };
  }, [from, to]);

  return (
    <p className="mt-1">
      <span id="respect-balance" className={`inline-block ${pulse ? "rc-pulse" : ""}`}>
        <RespectAmount n={n} className="text-4xl font-black text-yellow-200" />
      </span>
    </p>
  );
}
