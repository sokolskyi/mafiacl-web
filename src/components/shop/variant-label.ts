// Варианты вида «men M» / «women S»: крой + размер. В базе хранится код, на экране — перевод.
export const CUT_RE = /^(men|women) (.+)$/;

export function splitCut(label: string): { cut: "men" | "women"; size: string } | null {
  const m = CUT_RE.exec(label);
  return m ? { cut: m[1] as "men" | "women", size: m[2] } : null;
}

/** Текст варианта для людей: «Мужская · M». t — переводчик из пространства "shop". */
export function variantText(label: string, t: (key: "cutMen" | "cutWomen") => string) {
  const c = splitCut(label);
  if (!c) return label;
  return `${t(c.cut === "men" ? "cutMen" : "cutWomen")} · ${c.size}`;
}
