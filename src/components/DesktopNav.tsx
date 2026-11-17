"use client";

import type { ReactNode } from "react";

/**
 * Подменю шапки на широком экране: открываются при наведении и с клавиатуры (Tab).
 * После клика по пункту подменю закрывается сразу и не открывается снова, пока курсор не уйдёт с группы.
 */
export function DesktopNav({ children }: { children: ReactNode }) {
  return (
    <div
      className="contents"
      onClick={(e) => {
        const link = (e.target as HTMLElement).closest("a");
        const group = link?.closest<HTMLElement>(".nav-group");
        if (!link || !group) return;
        group.dataset.closed = "";
        link.blur();
      }}
      onMouseOver={(e) => {
        // курсор пришёл на другую группу — с прежних снимаем запрет
        const group = (e.target as HTMLElement).closest<HTMLElement>(".nav-group");
        document.querySelectorAll<HTMLElement>(".nav-group[data-closed]").forEach((g) => {
          if (g !== group) delete g.dataset.closed;
        });
      }}
      onMouseLeave={() => {
        document.querySelectorAll<HTMLElement>(".nav-group[data-closed]").forEach((g) => delete g.dataset.closed);
      }}
    >
      {children}
    </div>
  );
}
