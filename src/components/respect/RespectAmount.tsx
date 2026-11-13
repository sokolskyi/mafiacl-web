/** Монета Respect: кружок с буквой R. */
export function RespectCoin({ className = "h-[1em] w-[1em]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`inline-block shrink-0 align-[-0.12em] ${className}`}>
      <circle cx="12" cy="12" r="11" fill="#d4a017" />
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="#7a5600" strokeWidth="1" />
      <path fill="#3d2a00" d="M8.6 7h4.1c2 0 3.3 1.1 3.3 2.9 0 1.3-.7 2.2-1.8 2.6l2.1 4.5h-2.2l-1.8-4.1h-1.7V17h-2V7zm2 1.7v2.6h1.9c.9 0 1.4-.5 1.4-1.3s-.5-1.3-1.4-1.3h-1.9z" />
    </svg>
  );
}

/** Число Respect с монетой: «150 Ⓡ». Для читалок экрана — «150 Respect». */
export function RespectAmount({ n, sign = false, className = "" }: { n: number; sign?: boolean; className?: string }) {
  const text = `${sign && n > 0 ? "+" : ""}${n}`.replace("-", "−");
  return (
    <span className={`whitespace-nowrap ${className}`}>
      {text} <RespectCoin />
      <span className="sr-only"> Respect</span>
    </span>
  );
}
